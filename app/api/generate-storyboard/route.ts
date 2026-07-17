import { fal } from "@ai-sdk/fal"
import { openai } from "@ai-sdk/openai"
import { generateImage, generateText, Output } from "ai"

import {
  layoutForSceneCount,
  resolveNanoBananaModelId,
  storyboardGenerationRequestSchema,
  storyboardGenerationResponseSchema,
  storyboardPlanSchema,
} from "@/lib/generation"
import {
  buildCompositePrompt,
  chooseCompositeAspectRatio,
  normalizeAndSliceComposite,
} from "@/lib/storyboard-generation.server"

/** Long-running media generation allowance for supported Next.js hosts. */
export const maxDuration = 300

/** Ensures sharp and the provider SDK run in a full Node.js environment. */
export const runtime = "nodejs"

/** Director persona and craft rules that shape every scene plan. */
const DIRECTOR_SYSTEM_PROMPT = `You are a veteran storyboard director. Your boards are judged on followability, not completeness: a reader must grasp the story from the frames alone, in order, at a glance.

Craft rules, applied to every plan:
- One beat per scene. Each action is a single concise clause with exactly one subject performing one action. No compound actions, no montage descriptions.
- Every scene must be visually distinct from its neighbours and must advance the story. Cut anything that repeats information.
- Compose deliberately. At most 2 scenes in the whole board may place the subject dead-center. Spread the rest across rule-of-thirds placements, negative space, foreground occlusion, over-the-shoulder framings, and low or high angles.
- Choose shot sizes for narrative function: WS to establish geography, MS for interaction, MCU for reaction, CU for decision or detail. Alternate sizes so no three consecutive scenes share one.
- Keep a coherent lighting grammar. Light follows the story's time and mood arc; adjacent scenes in the same location and moment share the same lighting condition, and lighting changes mark story turns.
- Pace with intent. Scene durations form a rhythm: longer establishing and emotional beats, shorter action and reaction beats.
- Bind characters by @handle. When character material exists, actions name subjects with their @handle (e.g. @XYZ) and re-bind them with concrete identifiers (wardrobe, hair, silhouette), never bare pronouns.`

/**
 * Plans a storyline, generates one Nano Banana contact sheet, then returns
 * its server-sliced scene frames.
 */
export async function POST(request: Request): Promise<Response> {
  if (
    process.env.OPENAI_API_KEY === undefined ||
    (process.env.FAL_API_KEY === undefined && process.env.FAL_KEY === undefined)
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
      imageModel,
      prompt,
      styleImageRefs,
    } = parsedRequest.data
    const referenceImages = [...characterImageRefs, ...styleImageRefs]
    const { output: plan } = await generateText({
      maxRetries: 1,
      model: openai("gpt-5.4-mini"),
      output: Output.object({
        description:
          "A concise cinematic storyboard plan with a dynamic number of ordered scenes.",
        name: "storyboard_plan",
        schema: storyboardPlanSchema,
      }),
      prompt: buildPlanningPrompt(
        characterImageRefs.length,
        characterSheets,
        prompt
      ),
      system: DIRECTOR_SYSTEM_PROMPT,
    })

    if (plan === undefined) {
      throw new Error("The planner returned no structured storyboard plan.")
    }

    const layout = layoutForSceneCount(plan.scenes.length)
    const compositePrompt = buildCompositePrompt({
      characterImageCount: characterImageRefs.length,
      characterSheets,
      columns: layout.columns,
      rows: layout.rows,
      scenes: plan.scenes,
      storyline: prompt,
      styleImageCount: styleImageRefs.length,
    })
    const modelId = resolveNanoBananaModelId({
      hasReferenceImages: referenceImages.length > 0,
      imageModel,
    })
    const imagePrompt =
      referenceImages.length === 0
        ? compositePrompt
        : { images: referenceImages, text: compositePrompt }
    const { image } = await generateImage({
      model: fal.image(modelId),
      n: 1,
      prompt: imagePrompt,
      providerOptions: {
        fal: {
          aspect_ratio: chooseCompositeAspectRatio(layout),
          limit_generations: true,
          outputFormat: "jpeg",
          resolution: "2K",
          // Nano Banana's edit endpoint requires image_urls even for one
          // reference image.
          useMultipleImages: referenceImages.length > 0,
        },
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

/** Builds the structured scene-planning brief sent to OpenAI. */
function buildPlanningPrompt(
  characterImageCount: number,
  characterSheets: string[],
  storyline: string
): string {
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

  return `Plan a cinematic storyboard from this story material.

Choose a dynamic scene count from 3 to 12 based on narrative complexity. A short logline should use fewer beats; a full storyline should use more.

For every scene:
- action: one concise, drawable visual beat with exactly one subject action (140 characters maximum)
- dialogue: only essential spoken context, otherwise an empty string
- shot: one of WS, MS, MCU, or CU, chosen for narrative function
- camera: the camera body whose character suits the beat
- lens: the focal length that produces the intended framing and compression
- movement: the camera movement that serves the beat, Static when stillness is stronger
- lighting: the lighting condition continuing the board's light-and-mood arc
- timeSeconds: the planned duration in whole seconds (1 to 60), paced for rhythm

Create a concise board title (60 characters maximum).

${writtenCharacterContext}

${visualCharacterContext}

Story material:
${storyline}`
}
