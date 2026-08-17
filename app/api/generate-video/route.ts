import { fal } from "@fal-ai/client"

import { resolveFalApiKey, resolvePikaApiKey } from "@/lib/api-route-config"
import { dataUrlToBlob } from "@/lib/image-data"
import { generateVideoWithPika } from "@/lib/pika-video.server"
import { ProviderNoOutputError, runWithProviderFallback } from "@/lib/provider-fallback"
import {
  SEEDANCE_REFERENCE_TO_VIDEO_MODEL_ID,
  type VideoGenerationRequest,
  videoGenerationRequestSchema,
  videoGenerationResponseSchema,
} from "@/lib/video-generation"

/** Long-running media generation allowance for supported Next.js hosts. */
export const maxDuration = 600

/** Ensures the Fal client runs in a full Node.js environment. */
export const runtime = "nodejs"

/**
 * Uploads a data-URL image to fal storage and returns the hosted URL.
 */
async function uploadDataUrl(dataUrl: string): Promise<string> {
  const blob = dataUrlToBlob(dataUrl)

  if (blob === null) {
    throw new Error("The image data URL could not be parsed.")
  }

  return fal.storage.upload(blob)
}

/**
 * Generates a Seedance 2.5 video on fal from the storyboard PNG, optional
 * character and environment reference images, and a structured prompt.
 */
async function generateVideoWithFal(
  request: VideoGenerationRequest,
  falKey: string
): Promise<string> {
  fal.config({ credentials: falKey })

  const { characterImageRefs, duration, environmentImageRefs, prompt, storyboardImage } =
    request
  // Order is load-bearing: the prompt's @ImageN bindings assume the
  // contact sheet, then character refs, then environment refs.
  const imageUrls = await Promise.all([
    uploadDataUrl(storyboardImage),
    ...characterImageRefs.map((dataUrl) => uploadDataUrl(dataUrl)),
    ...environmentImageRefs.map((dataUrl) => uploadDataUrl(dataUrl)),
  ])
  const result = await fal.subscribe(SEEDANCE_REFERENCE_TO_VIDEO_MODEL_ID, {
    input: {
      aspect_ratio: "16:9",
      duration,
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
    throw new ProviderNoOutputError("Seedance returned no video URL.")
  }

  return videoUrl
}

/**
 * Generates the Seedance video, preferring fal when configured (with a
 * Pika fallback on infrastructure failure) and using Pika directly when
 * fal has no key at all. At least one of `falKey` / `pikaKey` is defined —
 * the caller gates on that before parsing the request.
 */
async function generateVideo(
  request: VideoGenerationRequest,
  falKey: string | undefined,
  pikaKey: string | undefined
): Promise<string> {
  if (falKey === undefined) {
    if (pikaKey === undefined) {
      throw new Error("Video generation is not configured.")
    }

    return generateVideoWithPika(request, pikaKey)
  }

  return runWithProviderFallback({
    fallback:
      pikaKey === undefined
        ? undefined
        : () => generateVideoWithPika(request, pikaKey),
    label: "Seedance video generation",
    primary: () => generateVideoWithFal(request, falKey),
  })
}

/**
 * Generates a Seedance 2.5 video from the storyboard PNG, optional character
 * and environment reference images, and a structured 2.5 prompt. Runs on
 * fal, falling back to Pika when fal is unconfigured or fails for an
 * infrastructure reason.
 */
export async function POST(request: Request): Promise<Response> {
  const falKey = resolveFalApiKey()
  const pikaKey = resolvePikaApiKey()

  if (falKey === undefined && pikaKey === undefined) {
    return Response.json(
      { error: "Video generation is not configured." },
      { status: 503 }
    )
  }

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
          "Provide a video prompt, a storyboard PNG, and optional character and environment images.",
      },
      { status: 400 }
    )
  }

  try {
    const videoUrl = await generateVideo(parsedRequest.data, falKey, pikaKey)
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
