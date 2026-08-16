import { fal } from "@ai-sdk/fal"
import { openai } from "@ai-sdk/openai"
import { generateImage, generateText, Output } from "ai"
import { readFile } from "fs/promises"
import path from "path"

import {
  resolveFalApiKey,
} from "@/lib/api-route-config"
import { extractHandlesFromSheets } from "@/lib/board-composer"
import { DEPTH_MAP_STYLE_PROMPT } from "@/lib/depth-map-style-settings"
import {
  foldMissingHandlesIntoScenes,
  layoutForSceneCount,
  missingCharacterHandles,
  storyboardGenerationRequestSchema,
  storyboardGenerationResponseSchema,
  type StoryboardPlan,
  storyboardPlanSchema,
} from "@/lib/generation"
import { resolveImageModelId } from "@/lib/image-models"
import { type ShotMode } from "@/lib/shot-mode-settings"
import {
  buildCompositePrompt,
  buildCompositeProviderOptions,
  normalizeAndSliceComposite,
} from "@/lib/storyboard-generation.server"

/** Long-running media generation allowance for supported Next.js hosts. */
export const maxDuration = 300

/** Ensures sharp and the provider SDK run in a full Node.js environment. */
export const runtime = "nodejs"

/** Director persona and the craft rules that hold in every shot mode. */
const DIRECTOR_SYSTEM_PROMPT = `You are a veteran storyboard director. Your boards are judged on followability, not completeness: a reader must grasp the story from the frames alone, in order, at a glance.

Craft rules, applied to every plan:
- One beat per scene. Each action is a single concise clause with exactly one primary subject performing one action. Other named characters may be present in the frame (over-the-shoulder, opposite, background) when the story requires them, named by @handle. No compound actions, no montage descriptions.
- Compose deliberately. At most 2 scenes in the whole board may place the subject dead-center. Spread the rest across rule-of-thirds placements, negative space, foreground occlusion, over-the-shoulder framings, and low or high angles.
- Pace with intent. Scene durations form a rhythm: longer establishing and emotional beats, shorter action and reaction beats.
- Cover the full cast. When character material exists, every named @handle appears in at least one scene; they all play a part in the story. Do not drop a character because they have fewer beats.
- Bind characters by @handle. When character material exists, actions name the primary subject with their @handle (e.g. @XYZ) and re-bind them with concrete identifiers (wardrobe, hair, silhouette), never bare pronouns. Name any other characters in the frame by @handle too.
- Bind locations by @handle. When environment material exists, stage the beats inside those locations and name them with their @handle (e.g. @XYZ), re-binding with concrete identifiers (architecture, materials, set dressing) rather than a vague place noun. Say which part of the location each beat occupies — a specific corner, threshold, elevation, or approach — so consecutive beats set in one @handle never all describe the same view of it.
- Respect visual style. When a written style and/or style reference images are declared, plan lighting, mood, and action language that fit that medium. Do not assume photoreal live-action when the style is illustration, animation, painterly, or any other non-photoreal treatment.`

/** Cut grammar rules that only apply to the selected shot mode. */
const DIRECTOR_SHOT_MODE_RULES: Record<ShotMode, string> = {
  continuous: `Shot mode — ONE CONTINUOUS SHOT. The whole board is a single unbroken take: the scenes are successive framings the camera travels through, never separate shots joined by an edit.
- Never plan a cut, dissolve, or transition. Consecutive scenes stay in one continuous space and time — no location jumps, no time skips, and no reveal that only an edit could deliver.
- Every framing change must be physically reachable from the previous one through camera travel or subject blocking. Plan shot sizes as a progression the camera moves through (a WS that pushes to MS, then to MCU as the subject turns in), not as alternating cut sizes.
- Keep the camera working. Each scene names the movement that carries the take from the previous framing into this one; Static is reserved for a deliberate held moment the camera settles into before moving on.
- One rig for the whole take: every scene names the same camera body, and the lens stays the same unless the move is a zoom the operator could pull mid-shot.
- Lighting evolves continuously. Adjacent scenes share the same lighting condition unless the camera physically travels into a differently lit area, and mood shifts come from that travel rather than from an edit.
- Every beat still advances the story and changes what the frame shows. Repeated information reads as dead screen time in a take that cannot be trimmed.`,
  "multi-shot": `Shot mode — MULTI-SHOT SEQUENCE. The board is a cut-based edit and each scene is its own shot.
- Every scene must be visually distinct from its neighbours and must advance the story. Cut anything that repeats information.
- Choose shot sizes for narrative function: WS to establish geography, MS for interaction, MCU for reaction, CU for decision or detail. Alternate sizes so no three consecutive scenes share one.
- Keep a coherent lighting grammar. Light follows the story's time and mood arc; adjacent scenes in the same location and moment share the same lighting condition, and lighting changes mark story turns.`,
  voyeuristic: `Shot mode — ONE CONTINUOUS VOYEURISTIC SHOT. The whole board is a single unbroken take filmed by an unseen observer watching people who do not know they are being watched.
- Never plan a cut, dissolve, or transition. Consecutive scenes stay in one continuous space and time — no location jumps, no time skips, and no reveal that only an edit could deliver.
- Every framing is the watcher's own vantage, taken from concealment: through a window, a part-open doorway, gaps in blinds or curtains, foliage, a stairwell, a parked car, or from across the street. Say in the action which concealment the frame is watching from, and keep foreground obstruction cropping part of the view.
- The subjects are unaware. They never look into the lens, never address it, and the camera never joins the action — it stays outside, at a distance the watcher could physically hold.
- Zoom cycle, mandatory for every location the take visits: one scene sets the wide watching frame, a later scene uses movement "Zoom in" to tighten onto the subject or a telling detail, and the location's final scene before the camera leaves uses movement "Zoom out" to return to the wide watching frame. Never leave a location on a tight framing.
- Because each location needs at least the zoom-in and zoom-out beats, visit few locations and give each of them room rather than sampling many.
- Between locations the camera drifts on unseen — Handheld or Steadicam creeping to the next vantage, Static for a held moment of watching. The travel itself is never a cut.
- Prefer long glass for the watching frames (Cooke S7 75mm, Signature 75mm, or Zeiss Supreme 50mm), and keep the same camera body for the whole take.
- Lighting evolves continuously. Adjacent scenes share the same lighting condition unless the camera physically travels into a differently lit area, and mood shifts come from that travel rather than from an edit.`,
}

/** Per-scene field briefs whose wording depends on the shot mode. */
const PLANNING_FIELD_GUIDANCE: Record<ShotMode, PlanningFieldGuidance> = {
  continuous: {
    movement:
      "movement: the camera movement that carries the take out of the previous framing and into this one, Static only for a deliberate held moment",
    shot: "shot: one of WS, MS, MCU, or CU, reachable from the previous scene's framing through camera travel or subject blocking",
    timeSeconds:
      "timeSeconds: the planned duration in whole seconds (1 to 60), paced so the scenes read as one unbroken take",
  },
  "multi-shot": {
    movement:
      "movement: the camera movement that serves the beat, Static when stillness is stronger",
    shot: "shot: one of WS, MS, MCU, or CU, chosen for narrative function",
    timeSeconds:
      "timeSeconds: the planned duration in whole seconds (1 to 60), paced for rhythm",
  },
  voyeuristic: {
    movement:
      "movement: Zoom in when the lens tightens onto the subject from the watching frame, Zoom out when it returns to the wide watching frame before the camera leaves the location, otherwise the drift that carries the unseen camera on — Handheld or Steadicam to creep to the next vantage, Static for a held moment of watching",
    shot: "shot: one of WS, MS, MCU, or CU, where WS is the concealed watching frame and the tighter sizes are what the zoom reaches, always reachable from the previous framing without a cut",
    timeSeconds:
      "timeSeconds: the planned duration in whole seconds (1 to 60), paced as one unbroken observation with lingering watching beats",
  },
}

/** Deliverable framing that opens the planning brief for each shot mode. */
const PLANNING_SHOT_MODE_BRIEFS: Record<ShotMode, string> = {
  continuous:
    "Plan a cinematic storyboard from this story material as ONE continuous shot — the scenes are successive framings of a single unbroken take, not shots joined by cuts.",
  "multi-shot":
    "Plan a cinematic storyboard from this story material as a multi-shot sequence — each scene is its own cut shot.",
  voyeuristic:
    "Plan a cinematic storyboard from this story material as ONE continuous voyeuristic shot — a single unbroken take filmed by an unseen observer who watches each location from concealment, zooms in on the telling detail, and zooms back out to the wide watching frame before drifting on to the next vantage.",
}

/**
 * Plans a storyline, generates one contact sheet with the selected image
 * model, then returns its server-sliced scene frames.
 */
export async function POST(request: Request): Promise<Response> {
  if (
    process.env.OPENAI_API_KEY === undefined ||
    resolveFalApiKey() === undefined
  ) {
    return Response.json(
      { error: "Storyboard generation is not configured." },
      { status: 503 }
    )
  }

  try {
    const parsedRequest = storyboardGenerationRequestSchema.safeParse(
      await request.json()
    )

    if (!parsedRequest.success) {
      return Response.json(
        { error: "Check the storyline and attached reference files." },
        { status: 400 }
      )
    }

    const {
      characterImageRefs,
      characterSheets,
      depthMapStyle,
      environmentImageRefs,
      environmentSheets,
      imageModel,
      prompt,
      resolution,
      shotMode,
      styleImageRefs,
      visualStyle,
    } = parsedRequest.data
    const effectiveStyleImageRefs = depthMapStyle ? [] : styleImageRefs
    const effectiveVisualStyle = depthMapStyle ? "" : visualStyle
    // Order must match `buildReferenceDirections`: characters, environments,
    // then styles. Style refs stay trailing as their instruction asserts.
    const referenceImages = [
      ...characterImageRefs,
      ...environmentImageRefs,
      ...effectiveStyleImageRefs,
    ]
    const characterHandles = extractHandlesFromSheets(characterSheets)
    const { output: planned } = await generateText({
      maxRetries: 1,
      model: openai("gpt-5.4-mini"),
      output: Output.object({
        description:
          "A concise cinematic storyboard plan with 4, 6, 9, or 12 ordered scenes that fill a grid.",
        name: "storyboard_plan",
        schema: storyboardPlanSchema,
      }),
      prompt: buildPlanningPrompt({
        characterImageCount: characterImageRefs.length,
        characterSheets,
        depthMapStyle,
        environmentImageCount: environmentImageRefs.length,
        environmentSheets,
        shotMode,
        storyline: prompt,
        styleImageCount: effectiveStyleImageRefs.length,
        visualStyle: effectiveVisualStyle,
      }),
      system: buildDirectorSystemPrompt(shotMode),
    })

    if (planned === undefined) {
      throw new Error("The planner returned no structured storyboard plan.")
    }

    const plan = await ensurePlanCoversCharacters(characterHandles, planned)

    const layout = layoutForSceneCount(plan.scenes.length)
    const layoutPlaceholder = await readLayoutPlaceholder(layout)
    // Layout placeholder is always image 1; user reference images follow.
    const allReferenceImages = [layoutPlaceholder, ...referenceImages]
    const compositePrompt = buildCompositePrompt({
      characterImageCount: characterImageRefs.length,
      characterSheets,
      columns: layout.columns,
      depthMapStyle,
      environmentImageCount: environmentImageRefs.length,
      environmentSheets,
      layoutPlaceholderColumns: layout.columns,
      layoutPlaceholderRows: layout.rows,
      rows: layout.rows,
      scenes: plan.scenes,
      shotMode,
      storyline: prompt,
      styleImageCount: effectiveStyleImageRefs.length,
      visualStyle: effectiveVisualStyle,
    })
    // Always use the edit endpoint so the layout placeholder is accepted.
    const modelId = resolveImageModelId({
      hasReferenceImages: true,
      imageModel,
    })
    const { image } = await generateImage({
      model: fal.image(modelId),
      n: 1,
      prompt: { images: allReferenceImages, text: compositePrompt },
      providerOptions: {
        fal: buildCompositeProviderOptions({
          imageModel,
          layout,
          referenceImageCount: allReferenceImages.length,
          resolution,
        }),
      },
    })
    const frames = await normalizeAndSliceComposite(
      image.uint8Array,
      layout,
      plan.scenes.length
    )
    const response = storyboardGenerationResponseSchema.parse({
      ...layout,
      scenes: plan.scenes.map((scene, index) => ({
        ...scene,
        image: `data:image/png;base64,${frames[index].toString("base64")}`,
      })),
      title: plan.title,
    })

    return Response.json(response)
  } catch (error) {
    console.error("Storyboard generation failed:", error)

    return Response.json(
      { error: "The storyboard could not be generated. Please try again." },
      { status: 500 }
    )
  }
}

interface PlanningFieldGuidance {
  /** Brief for the per-scene `movement` field. */
  movement: string
  /** Brief for the per-scene `shot` field. */
  shot: string
  /** Brief for the per-scene `timeSeconds` field. */
  timeSeconds: string
}

interface PlanningPromptOptions {
  /** Number of character reference images supplied for the renderer. */
  characterImageCount: number
  /** Written character continuity sheets. */
  characterSheets: string[]
  /** When true, plan framing for a depth-map contact sheet. */
  depthMapStyle: boolean
  /** Number of environment reference images supplied for the renderer. */
  environmentImageCount: number
  /** Written environment continuity sheets. */
  environmentSheets: string[]
  /** Whether the scenes form a cut sequence or one unbroken take. */
  shotMode: ShotMode
  /** Original logline or full story material. */
  storyline: string
  /** Number of visual-style reference images supplied for the renderer. */
  styleImageCount: number
  /** Optional textual visual-style description. */
  visualStyle: string
}

/**
 * Prompt that asks the planner to revise actions so omitted `@handles`
 * appear, without changing scene count or craft fields.
 */
function buildCastRepairPrompt(
  missingHandles: string[],
  plan: StoryboardPlan
): string {
  return `The following storyboard plan omitted named characters that must appear in at least one scene action: ${missingHandles.join(", ")}.

Revise only scene actions (and dialogue if needed) so each omitted @handle appears in at least one action. Keep the same title, the same number of scenes, and every craft field (shot, camera, lens, movement, lighting, timeSeconds). Each action stays at most 140 characters. Other named characters may share a frame with the primary subject.

Current plan:
${JSON.stringify(plan)}`
}

/** Combines the shared director persona with the selected shot mode's rules. */
function buildDirectorSystemPrompt(shotMode: ShotMode): string {
  return `${DIRECTOR_SYSTEM_PROMPT}

${DIRECTOR_SHOT_MODE_RULES[shotMode]}`
}

/** Builds the structured scene-planning brief sent to OpenAI. */
function buildPlanningPrompt({
  characterImageCount,
  characterSheets,
  depthMapStyle,
  environmentImageCount,
  environmentSheets,
  shotMode,
  storyline,
  styleImageCount,
  visualStyle,
}: PlanningPromptOptions): string {
  const characterHandles = extractHandlesFromSheets(characterSheets)
  const writtenCharacterContext = buildWrittenCharacterContext(
    characterHandles,
    characterSheets
  )
  const visualCharacterContext =
    characterImageCount === 0
      ? "No character reference images were supplied."
      : `${characterImageCount} character reference image${characterImageCount === 1 ? " was" : "s were"} supplied for the renderer. Depict every supplied character in at least one beat. Use @handles and concrete identifiers available in the story or written sheets; do not invent unseen visual details solely to describe those images.`
  const writtenEnvironmentContext =
    environmentSheets.length === 0
      ? "No separate environment sheets were supplied."
      : `Environment sheets — stage the beats inside these locations and name each one with its matching @handle (e.g. @XYZ) in the action, re-binding it with concrete identifiers (architecture, materials, set dressing) rather than a vague place noun:\n${environmentSheets.join(
          "\n\n---\n\n"
        )}`
  const visualEnvironmentContext =
    environmentImageCount === 0
      ? "No environment reference images were supplied."
      : `${environmentImageCount} environment reference image${environmentImageCount === 1 ? " was" : "s were"} supplied for the renderer. Use @handles and concrete identifiers available in the story or written sheets; do not invent unseen location details solely to describe those images.`
  const trimmedVisualStyle = visualStyle.trim()
  const visualStyleContext = buildPlanningVisualStyleContext(
    depthMapStyle,
    styleImageCount,
    trimmedVisualStyle
  )
  const fieldGuidance = PLANNING_FIELD_GUIDANCE[shotMode]

  return `${PLANNING_SHOT_MODE_BRIEFS[shotMode]}

Choose a scene count that fills an entire grid: 4 (2×2), 6 (3×2), 9 (3×3), or 12 (4×3). A short logline should use 4 or 6 beats; a full storyline should use 9 or 12. Prefer a count at least as large as the named cast so each character can play a part, capped at 12. Every cell is a story beat — do not leave unused cells.

For every scene:
- action: one concise, drawable visual beat with exactly one primary subject action (140 characters maximum). Other named characters may share the frame when the story requires them.
- dialogue: only essential spoken context, otherwise an empty string
- ${fieldGuidance.shot}
- camera: the camera body whose character suits the beat
- lens: the focal length that produces the intended framing and compression
- ${fieldGuidance.movement}
- lighting: the lighting condition continuing the board's light-and-mood arc
- ${fieldGuidance.timeSeconds}

Create a concise board title (60 characters maximum).

${writtenCharacterContext}

${visualCharacterContext}

${writtenEnvironmentContext}

${visualEnvironmentContext}

${visualStyleContext}

Story material:
${storyline}`
}

/**
 * Reads the static layout-placeholder PNG for `layout` from `public/images`
 * and returns it as a base64 PNG data URL.
 *
 * @throws If the file cannot be read (should never happen for a valid preset).
 */
async function readLayoutPlaceholder(layout: {
  columns: number
  rows: number
}): Promise<string> {
  const filePath = path.join(
    process.cwd(),
    "public/images",
    `storyboards-${layout.columns}x${layout.rows}.png`
  )
  const buffer = await readFile(filePath)

  return `data:image/png;base64,${buffer.toString("base64")}`
}

/** Describes declared visual style for the planner when present. */
function buildPlanningVisualStyleContext(
  depthMapStyle: boolean,
  styleImageCount: number,
  visualStyle: string
): string {
  if (depthMapStyle) {
    return [
      "Visual style — the renderer will output a clean grayscale linear depth map of each beat. Plan framing, staging, and silhouette readability for depth geometry; do not plan colour, texture, lighting mood, or surface treatment.",
      `Written style: ${DEPTH_MAP_STYLE_PROMPT}`,
    ].join("\n")
  }

  if (visualStyle === "" && styleImageCount === 0) {
    return "No visual style was declared. Plan for photoreal live-action cinematography."
  }

  const parts = [
    "Visual style — plan lighting, mood, and drawable action language that fit this medium. Do not assume photoreal live-action if the style is non-photoreal:",
  ]

  if (visualStyle !== "") {
    parts.push(`Written style: ${visualStyle}`)
  }

  if (styleImageCount > 0) {
    parts.push(
      `${styleImageCount} visual-style reference image${styleImageCount === 1 ? " was" : "s were"} supplied for the renderer. Treat them as the authoritative look for medium, palette, and treatment.`
    )
  }

  return parts.join("\n")
}

/**
 * Written character-sheet brief for the planner, including full-cast coverage
 * when named `@handles` are present.
 */
function buildWrittenCharacterContext(
  characterHandles: string[],
  characterSheets: string[]
): string {
  if (characterSheets.length === 0) {
    return "No separate character sheets were supplied."
  }

  const coverage =
    characterHandles.length === 0
      ? "every described character plays a part in the story and must appear in at least one scene"
      : `every named character plays a part in the story and must appear in at least one scene (${characterHandles.join(", ")})`

  return `Character sheets — ${coverage}. Name the primary subject of each beat with their matching @handle (e.g. @XYZ) and re-bind them with concrete identifiers (wardrobe, hair, silhouette), never pronouns. Name any other characters in the same frame by @handle too:\n${characterSheets.join(
    "\n\n---\n\n"
  )}`
}

/**
 * Repairs a plan that dropped named characters, then folds any remaining
 * `@handles` into scene actions so generation cannot fail on cast coverage.
 */
async function ensurePlanCoversCharacters(
  characterHandles: string[],
  plan: StoryboardPlan
): Promise<StoryboardPlan> {
  const missingHandles = missingCharacterHandles(plan.scenes, characterHandles)

  if (missingHandles.length === 0) {
    return plan
  }

  let nextPlan = plan

  try {
    const { output: repaired } = await generateText({
      maxRetries: 1,
      model: openai("gpt-5.4-mini"),
      output: Output.object({
        description:
          "The same storyboard plan with revised actions that name every omitted character.",
        name: "storyboard_plan",
        schema: storyboardPlanSchema,
      }),
      prompt: buildCastRepairPrompt(missingHandles, plan),
      system:
        "You are a storyboard director repairing a plan so every named character appears.",
    })

    if (repaired !== undefined) {
      nextPlan = repaired
    }
  } catch (error) {
    console.error("Cast-coverage repair failed:", error)
  }

  return {
    ...nextPlan,
    scenes: foldMissingHandlesIntoScenes(nextPlan.scenes, characterHandles),
  }
}
