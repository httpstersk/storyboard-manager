import { fal } from "@ai-sdk/fal"
import { openai } from "@ai-sdk/openai"
import { generateImage, generateObject } from "ai"

import {
  layoutForSceneCount,
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

/**
 * Plans a storyline, generates one Nano Banana Lite contact sheet, then
 * returns its server-sliced scene frames.
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

    const { characterSheets, imageRefs, prompt } = parsedRequest.data
    const { object: plan } = await generateObject({
      maxRetries: 1,
      model: openai("gpt-5-mini"),
      prompt: buildPlanningPrompt(prompt, characterSheets),
      schema: storyboardPlanSchema,
      schemaDescription:
        "A concise cinematic storyboard plan with a dynamic number of ordered scenes.",
      schemaName: "storyboard_plan",
      system:
        "You are a film director and storyboard artist. Convert story material into the fewest clear visual beats needed to tell it cinematically while preserving continuity.",
    })
    const layout = layoutForSceneCount(plan.scenes.length)
    const compositePrompt = buildCompositePrompt({
      characterSheets,
      columns: layout.columns,
      rows: layout.rows,
      scenes: plan.scenes,
      storyline: prompt,
    })
    const modelId =
      imageRefs.length === 0
        ? "google/nano-banana-lite"
        : "google/nano-banana-lite/edit"
    const imagePrompt =
      imageRefs.length === 0
        ? compositePrompt
        : { images: imageRefs, text: compositePrompt }
    const { image } = await generateImage({
      model: fal.image(modelId),
      n: 1,
      prompt: imagePrompt,
      providerOptions: {
        fal: {
          aspect_ratio: chooseCompositeAspectRatio(layout),
          limit_generations: true,
          outputFormat: "png",
          useMultipleImages: imageRefs.length > 1,
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
  storyline: string,
  characterSheets: string[]
): string {
  const characterContext =
    characterSheets.length === 0
      ? "No separate character sheets were supplied."
      : `Character sheets:\n${characterSheets.join("\n\n---\n\n")}`

  return `Plan a cinematic storyboard from this story material.

Choose a dynamic scene count from 3 to 12 based on narrative complexity. A short logline should use fewer beats; a full storyline should use more. Every scene must be visually distinct and advance the story.

For every scene:
- action: one concise, drawable visual beat (140 characters maximum)
- dialogue: only essential spoken context, otherwise an empty string
- shot: one of WS, MS, MCU, or CU

Create a concise board title (60 characters maximum).

${characterContext}

Story material:
${storyline}`
}
