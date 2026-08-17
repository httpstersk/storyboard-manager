/**
 * Pika fallback for Seedance 2.5 reference-to-video generation, used when
 * fal is unconfigured or fails for an infrastructure reason.
 */

import { z } from "zod"

import { awaitPikaJob, submitPikaJob, uploadPikaImage } from "@/lib/pika-client.server"
import { type VideoGenerationRequest } from "@/lib/video-generation"

/** Pika model path for Seedance 2.5 reference-to-video. */
const PIKA_SEEDANCE_REFERENCE_TO_VIDEO_PATH =
  "/v1/media/bytedance/seedance-2.5/reference-to-video"

/**
 * Poll budget for the video job, kept below the route's 600s `maxDuration`
 * to leave room for a prior fal attempt and the reference uploads.
 */
const PIKA_VIDEO_JOB_TIMEOUT_MS = 480_000

const pikaVideoOutputSchema = z.object({
  video: z.object({ url: z.string().url() }),
})

/**
 * Generates a Seedance 2.5 video via Pika from the same request shape the
 * fal route accepts, returning the hosted video URL.
 */
export async function generateVideoWithPika(
  request: VideoGenerationRequest,
  apiKey: string
): Promise<string> {
  const { characterImageRefs, duration, environmentImageRefs, prompt, storyboardImage } =
    request
  // Order is load-bearing: mirrors the fal route so the prompt's @ImageN
  // bindings stay aligned — storyboard contact sheet, then character refs,
  // then environment refs.
  const imageUrls = await Promise.all([
    uploadPikaImage(storyboardImage, apiKey),
    ...characterImageRefs.map((dataUrl) => uploadPikaImage(dataUrl, apiKey)),
    ...environmentImageRefs.map((dataUrl) => uploadPikaImage(dataUrl, apiKey)),
  ])
  const jobId = await submitPikaJob(
    PIKA_SEEDANCE_REFERENCE_TO_VIDEO_PATH,
    apiKey,
    {
      duration: Number(duration),
      generate_audio: true,
      image_urls: imageUrls,
      prompt,
      ratio: "16:9",
      resolution: "720p",
      watermark: false,
    }
  )
  const output = await awaitPikaJob(jobId, apiKey, {
    timeoutMs: PIKA_VIDEO_JOB_TIMEOUT_MS,
  })
  const { video } = pikaVideoOutputSchema.parse(output)

  return video.url
}
