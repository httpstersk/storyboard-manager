import { fal } from "@ai-sdk/fal"
import { openai } from "@ai-sdk/openai"
import { generateImage, generateText, Output } from "ai"
import { readFile } from "fs/promises"
import path from "path"

import {
  resolveFalApiKey,
} from "@/lib/api-route-config"
import { DEPTH_MAP_STYLE_PROMPT } from "@/lib/depth-map-style-settings"
import {
  layoutForSceneCount,
  storyboardGenerationRequestSchema,
  storyboardGenerationResponseSchema,
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
- One beat per scene. Each action is a single concise clause with exactly one subject performing one action. No compound actions, no montage descriptions.
- Compose deliberately. At most 2 scenes in the whole board may place the subject dead-center. Spread the rest across rule-of-thirds placements, negative space, foreground occlusion, over-the-shoulder framings, and low or high angles.
- Pace with intent. Scene durations form a rhythm: longer establishing and emotional beats, shorter action and reaction beats.
- Bind characters by @handle. When character material exists, actions name subjects with their @handle (e.g. @XYZ) and re-bind them with concrete identifiers (wardrobe, hair, silhouette), never bare pronouns.
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
}

/** Deliverable framing that opens the planning brief for each shot mode. */
const PLANNING_SHOT_MODE_BRIEFS: Record<ShotMode, string> = {
  continuous:
    "Plan a cinematic storyboard from this story material as ONE continuous shot — the scenes are successive framings of a single unbroken take, not shots joined by cuts.",
  "multi-shot":
    "Plan a cinematic storyboard from this story material as a multi-shot sequence — each scene is its own cut shot.",
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
      imageModel,
      prompt,
      resolution,
      shotMode,
      styleImageRefs,
      visualStyle,
    } = parsedRequest.data
    const effectiveStyleImageRefs = depthMapStyle ? [] : styleImageRefs
    const effectiveVisualStyle = depthMapStyle ? "" : visualStyle
    const referenceImages = [...characterImageRefs, ...effectiveStyleImageRefs]
    const { output: plan } = await generateText({
      maxRetries: 1,
      model: openai("gpt-5.4-mini"),
      output: Output.object({
        description:
          "A concise cinematic storyboard plan with a dynamic number of ordered scenes.",
        name: "storyboard_plan",
        schema: storyboardPlanSchema,
      }),
      prompt: buildPlanningPrompt({
        characterImageCount: characterImageRefs.length,
        characterSheets,
        depthMapStyle,
        shotMode,
        storyline: prompt,
        styleImageCount: effectiveStyleImageRefs.length,
        visualStyle: effectiveVisualStyle,
      }),
      system: buildDirectorSystemPrompt(shotMode),
    })

    if (plan === undefined) {
      throw new Error("The planner returned no structured storyboard plan.")
    }

    const layout = layoutForSceneCount(plan.scenes.length)
    const layoutPlaceholder = await readLayoutPlaceholder(layout)
    // Layout placeholder is always image 1; character + style refs follow.
    const allReferenceImages = [layoutPlaceholder, ...referenceImages]
    const compositePrompt = buildCompositePrompt({
      characterImageCount: characterImageRefs.length,
      characterSheets,
      columns: layout.columns,
      depthMapStyle,
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
  /** Whether the scenes form a cut sequence or one unbroken take. */
  shotMode: ShotMode
  /** Original logline or full story material. */
  storyline: string
  /** Number of visual-style reference images supplied for the renderer. */
  styleImageCount: number
  /** Optional textual visual-style description. */
  visualStyle: string
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
  shotMode,
  storyline,
  styleImageCount,
  visualStyle,
}: PlanningPromptOptions): string {
  const writtenCharacterContext =
    characterSheets.length === 0
      ? "No separate character sheets were supplied."
      : `Character sheets — every scene's action must name its subject with the matching @handle (e.g. @XYZ) and re-bind them with concrete identifiers (wardrobe, hair, silhouette), never pronouns:\n${characterSheets.join(
          "\n\n---\n\n"
        )}`
  const visualCharacterContext =
    characterImageCount === 0
      ? "No character reference images were supplied."
      : `${characterImageCount} character reference image${characterImageCount === 1 ? " was" : "s were"} supplied for the renderer. Use @handles and concrete identifiers available in the story or written sheets; do not invent unseen visual details solely to describe those images.`
  const trimmedVisualStyle = visualStyle.trim()
  const visualStyleContext = buildPlanningVisualStyleContext(
    depthMapStyle,
    styleImageCount,
    trimmedVisualStyle
  )
  const fieldGuidance = PLANNING_FIELD_GUIDANCE[shotMode]

  return `${PLANNING_SHOT_MODE_BRIEFS[shotMode]}

Choose a dynamic scene count from 3 to 12 based on narrative complexity. A short logline should use fewer beats; a full storyline should use more.

For every scene:
- action: one concise, drawable visual beat with exactly one subject action (140 characters maximum)
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
