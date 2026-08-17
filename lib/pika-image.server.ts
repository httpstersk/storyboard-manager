/**
 * Pika fallback for composite storyboard generation and single-scene image
 * editing, used when fal is unconfigured or fails for an infrastructure
 * reason. Mirrors the request shapes of `app/api/generate-storyboard` and
 * `app/api/edit-scene-image`, both driven by the fal-oriented model
 * registry in `lib/image-models.ts`.
 */

import { z } from "zod"

import { type StoryboardLayout } from "@/lib/generation"
import {
  clampResolution,
  type ImageModel,
  type ImageResolution,
  resolvePikaEditPath,
} from "@/lib/image-models"
import {
  awaitPikaJob,
  fetchPikaFileBytes,
  submitPikaJob,
  uploadPikaImage,
} from "@/lib/pika-client.server"
import { chooseCompositeAspectRatio } from "@/lib/storyboard-generation.server"

/** Aspect ratio Pika receives for a single-scene edit: always one 16:9 frame. */
const SCENE_EDIT_ASPECT_RATIO = "16:9"

/**
 * Poll budget for an image job, kept below the image routes' 300s
 * `maxDuration` to leave room for a prior fal attempt and uploads.
 */
const PIKA_IMAGE_JOB_TIMEOUT_MS = 180_000

const pikaImageOutputSchema = z.object({
  images: z.array(z.object({ url: z.string().url() })).min(1),
})

/**
 * Generates a storyboard composite contact sheet via Pika, from the same
 * reference images and prompt the fal route composites.
 */
export async function generateCompositeWithPika({
  apiKey,
  imageModel,
  layout,
  prompt,
  referenceImages,
  resolution,
}: {
  apiKey: string
  imageModel: ImageModel
  layout: StoryboardLayout
  prompt: string
  referenceImages: string[]
  resolution: ImageResolution
}): Promise<Uint8Array> {
  const imageUrls = await Promise.all(
    referenceImages.map((dataUrl) => uploadPikaImage(dataUrl, apiKey))
  )

  return submitAndDownloadPikaImage({
    apiKey,
    body: buildPikaImageRequestBody({
      aspectRatio: chooseCompositeAspectRatio(layout),
      imageModel,
      imageUrls,
      prompt,
      resolution,
    }),
    imageModel,
  })
}

/**
 * Edits one stored scene image via Pika, applying the same instruction
 * prompt the fal route sends.
 */
export async function editSceneImageWithPika({
  apiKey,
  imageModel,
  prompt,
  resolution,
  sourceImage,
}: {
  apiKey: string
  imageModel: ImageModel
  prompt: string
  resolution: ImageResolution
  sourceImage: string
}): Promise<Uint8Array> {
  const imageUrls = [await uploadPikaImage(sourceImage, apiKey)]

  return submitAndDownloadPikaImage({
    apiKey,
    body: buildPikaImageRequestBody({
      aspectRatio: SCENE_EDIT_ASPECT_RATIO,
      imageModel,
      imageUrls,
      prompt,
      resolution,
    }),
    imageModel,
  })
}

/**
 * Builds the model-specific Pika request body. Seedream 5 Pro sizes via a
 * plain `size` enum; Nano Banana Pro (Gemini 3 Pro Image) additionally
 * accepts `aspect_ratio`, matching the same ratio fal's composite path
 * computes from the grid.
 */
function buildPikaImageRequestBody({
  aspectRatio,
  imageModel,
  imageUrls,
  prompt,
  resolution,
}: {
  aspectRatio: string
  imageModel: ImageModel
  imageUrls: string[]
  prompt: string
  resolution: ImageResolution
}): Record<string, unknown> {
  if (imageModel === "seedream-5-pro") {
    return {
      image_urls: imageUrls,
      num_images: 1,
      prompt,
      size: clampResolution(imageModel, resolution),
    }
  }

  return {
    aspect_ratio: aspectRatio,
    image_urls: imageUrls,
    num_images: 1,
    output_format: "png",
    prompt,
    resolution: clampResolution(imageModel, resolution),
  }
}

/** Submits an image job, awaits completion, and downloads the result bytes. */
async function submitAndDownloadPikaImage({
  apiKey,
  body,
  imageModel,
}: {
  apiKey: string
  body: Record<string, unknown>
  imageModel: ImageModel
}): Promise<Uint8Array> {
  const jobId = await submitPikaJob(resolvePikaEditPath(imageModel), apiKey, body)
  const output = await awaitPikaJob(jobId, apiKey, {
    timeoutMs: PIKA_IMAGE_JOB_TIMEOUT_MS,
  })
  const { images } = pikaImageOutputSchema.parse(output)

  return fetchPikaFileBytes(images[0].url)
}
