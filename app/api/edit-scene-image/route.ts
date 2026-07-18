import { fal } from "@ai-sdk/fal"
import { generateImage } from "ai"

import {
  resolveFalApiKey,
} from "@/lib/api-route-config"
import {
  resolveNanoBananaEditModelId,
  sceneImageEditRequestSchema,
  sceneImageEditResponseSchema,
} from "@/lib/generation"
import { buildSceneImageEditPrompt } from "@/lib/storyboard-generation.server"

/** Long-running media generation allowance for supported Next.js hosts. */
export const maxDuration = 300

/** Ensures the Fal provider runs in a full Node.js environment. */
export const runtime = "nodejs"

/**
 * Applies an instruction to one stored scene image using the selected Nano
 * Banana model. The returned data URL is safe to persist in the workspace.
 */
export async function POST(request: Request): Promise<Response> {
  if (resolveFalApiKey() === undefined) {
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
    const { imageModel, prompt, resolution, sourceImage, visualStyle } =
      parsedRequest.data
    const { image } = await generateImage({
      model: fal.image(resolveNanoBananaEditModelId(imageModel)),
      n: 1,
      prompt: {
        images: [sourceImage],
        text: buildSceneImageEditPrompt({
          instruction: prompt,
          visualStyle,
        }),
      },
      providerOptions: {
        fal: {
          limit_generations: true,
          outputFormat: "png",
          // Nano Banana Lite is fixed at 1K; only Pro accepts resolution.
          ...(imageModel === "pro" ? { resolution } : {}),
          // This endpoint accepts image_urls, not the singular image_url that
          // the Fal provider uses by default for a prompt image.
          useMultipleImages: true,
        },
      },
    })
    const response = sceneImageEditResponseSchema.parse({
      image: `data:image/png;base64,${Buffer.from(image.uint8Array).toString("base64")}`,
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
