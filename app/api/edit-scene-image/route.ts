import { fal } from "@ai-sdk/fal"
import { generateImage } from "ai"

import { resolveFalApiKey, resolvePikaApiKey } from "@/lib/api-route-config"
import {
  sceneImageEditRequestSchema,
  sceneImageEditResponseSchema,
} from "@/lib/generation"
import {
  type ImageModel,
  type ImageResolution,
  resolveEditModelId,
} from "@/lib/image-models"
import { editSceneImageWithPika } from "@/lib/pika-image.server"
import { runWithProviderFallback } from "@/lib/provider-fallback"
import { buildSceneImageEditPrompt } from "@/lib/storyboard-generation.server"

/** Long-running media generation allowance for supported Next.js hosts. */
export const maxDuration = 300

/** Ensures the Fal provider runs in a full Node.js environment. */
export const runtime = "nodejs"

/**
 * Edits the scene image, preferring fal when configured (with a Pika
 * fallback on infrastructure failure) and using Pika directly when fal has
 * no key at all. At least one of `falKey` / `pikaKey` is defined — the
 * caller gates on that before parsing the request.
 */
async function generateEdit({
  editPrompt,
  falKey,
  imageModel,
  pikaKey,
  resolution,
  sourceImage,
}: {
  editPrompt: string
  falKey: string | undefined
  imageModel: ImageModel
  pikaKey: string | undefined
  resolution: ImageResolution
  sourceImage: string
}): Promise<Uint8Array> {
  const editWithPika = (apiKey: string) =>
    editSceneImageWithPika({
      apiKey,
      imageModel,
      prompt: editPrompt,
      resolution,
      sourceImage,
    })

  if (falKey === undefined) {
    if (pikaKey === undefined) {
      throw new Error("Scene image editing is not configured.")
    }

    return editWithPika(pikaKey)
  }

  return runWithProviderFallback({
    fallback: pikaKey === undefined ? undefined : () => editWithPika(pikaKey),
    label: "scene image edit",
    primary: async () => {
      const { image } = await generateImage({
        model: fal.image(resolveEditModelId(imageModel)),
        n: 1,
        prompt: { images: [sourceImage], text: editPrompt },
        providerOptions: {
          fal: {
            outputFormat: "png",
            // Seedream sizes via image_size; `auto` follows the source
            // frame's aspect ratio and caps at 2K, absorbing an
            // out-of-range 4K choice.
            ...(imageModel === "seedream-5-pro"
              ? { image_size: resolution === "1K" ? "auto_1K" : "auto_2K" }
              : { limit_generations: true, resolution }),
            // Both edit endpoints accept image_urls, not the singular
            // image_url that the Fal provider uses by default for a
            // prompt image.
            useMultipleImages: true,
          },
        },
      })

      return image.uint8Array
    },
  })
}

/**
 * Applies an instruction to one stored scene image using the selected image
 * model. The returned data URL is safe to persist in the workspace. Runs on
 * fal, falling back to Pika when fal is unconfigured or fails for an
 * infrastructure reason.
 */
export async function POST(request: Request): Promise<Response> {
  const falKey = resolveFalApiKey()
  const pikaKey = resolvePikaApiKey()

  if (falKey === undefined && pikaKey === undefined) {
    return Response.json(
      { error: "Scene image editing is not configured." },
      { status: 503 }
    )
  }

  let requestBody: unknown

  try {
    requestBody = await request.json()
  } catch {
    return Response.json(
      { error: "The image editing request must be valid JSON." },
      { status: 400 }
    )
  }

  const parsedRequest = sceneImageEditRequestSchema.safeParse(requestBody)

  if (!parsedRequest.success) {
    return Response.json(
      { error: "Provide an image and a concise editing instruction." },
      { status: 400 }
    )
  }

  try {
    const { depthMapStyle, imageModel, prompt, resolution, sourceImage, visualStyle } =
      parsedRequest.data
    const editedBytes = await generateEdit({
      editPrompt: buildSceneImageEditPrompt({
        depthMapStyle,
        instruction: prompt,
        visualStyle,
      }),
      falKey,
      imageModel,
      pikaKey,
      resolution,
      sourceImage,
    })
    const response = sceneImageEditResponseSchema.parse({
      image: `data:image/png;base64,${Buffer.from(editedBytes).toString("base64")}`,
    })

    return Response.json(response)
  } catch (error) {
    console.error("Scene image editing failed:", error)

    return Response.json(
      { error: "The scene image could not be edited. Please try again." },
      { status: 500 }
    )
  }
}
