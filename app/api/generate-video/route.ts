import { fal } from "@fal-ai/client"

import {
  SEEDANCE_REFERENCE_TO_VIDEO_MODEL_ID,
  videoGenerationRequestSchema,
  videoGenerationResponseSchema,
} from "@/lib/video-generation"

/** Long-running media generation allowance for supported Next.js hosts. */
export const maxDuration = 300

/** Ensures the Fal client runs in a full Node.js environment. */
export const runtime = "nodejs"

/**
 * Converts a data URL into a Blob suitable for fal.storage.upload.
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl)

  return response.blob()
}

/**
 * Uploads a data-URL image to fal storage and returns the hosted URL.
 */
async function uploadDataUrl(dataUrl: string): Promise<string> {
  const blob = await dataUrlToBlob(dataUrl)

  return fal.storage.upload(blob)
}

/**
 * Generates a Seedance 2.0 video from the storyboard PNG, optional character
 * reference images, and a shot-list prompt.
 */
export async function POST(request: Request): Promise<Response> {
  const falKey = process.env.FAL_KEY ?? process.env.FAL_API_KEY

  if (falKey === undefined) {
    return Response.json(
      { error: "Video generation is not configured." },
      { status: 503 }
    )
  }

  fal.config({ credentials: falKey })

  let requestBody: unknown

  try {
    requestBody = await request.json()
  } catch {
    return Response.json(
      { error: "The video generation request must be valid JSON." },
      { status: 400 }
    )
  }

  const parsedRequest = videoGenerationRequestSchema.safeParse(requestBody)

  if (!parsedRequest.success) {
    return Response.json(
      {
        error:
          "Provide a video prompt, a storyboard PNG, and optional character images.",
      },
      { status: 400 }
    )
  }

  const { characterImageRefs, prompt, storyboardImage } = parsedRequest.data

  try {
    const imageUrls = await Promise.all([
      uploadDataUrl(storyboardImage),
      ...characterImageRefs.map((dataUrl) => uploadDataUrl(dataUrl)),
    ])
    const result = await fal.subscribe(SEEDANCE_REFERENCE_TO_VIDEO_MODEL_ID, {
      input: {
        aspect_ratio: "16:9",
        duration: "auto",
        generate_audio: true,
        image_urls: imageUrls,
        prompt,
        resolution: "720p",
      },
    })
    const videoUrl =
      typeof result.data === "object" &&
      result.data !== null &&
      "video" in result.data &&
      typeof result.data.video === "object" &&
      result.data.video !== null &&
      "url" in result.data.video &&
      typeof result.data.video.url === "string"
        ? result.data.video.url
        : null

    if (videoUrl === null) {
      throw new Error("Seedance returned no video URL.")
    }

    const response = videoGenerationResponseSchema.parse({ videoUrl })

    return Response.json(response)
  } catch (error) {
    console.error("Seedance video generation failed:", error)

    return Response.json(
      { error: "The video could not be generated. Please try again." },
      { status: 500 }
    )
  }
}
