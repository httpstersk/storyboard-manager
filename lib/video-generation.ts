/**
 * Zod schemas and constants for Seedance 2.0 video generation via fal.
 */

import { z } from "zod"

import { IMAGE_UPLOAD_RULES } from "@/lib/validation"

/**
 * Maximum reference images accepted by Seedance 2.0 reference-to-video.
 * @Image1 is always the storyboard PNG; character refs fill the rest.
 */
export const MAX_SEEDANCE_REFERENCE_IMAGES = 9

/**
 * Maximum character reference images after reserving @Image1 for the
 * storyboard contact sheet.
 */
export const MAX_SEEDANCE_CHARACTER_IMAGES =
  MAX_SEEDANCE_REFERENCE_IMAGES - 1

/** Maximum text length of a Seedance video prompt. */
export const MAX_SEEDANCE_VIDEO_PROMPT_LENGTH = 20_000

/** Fal model id for ByteDance Seedance 2.0 reference-to-video. */
export const SEEDANCE_REFERENCE_TO_VIDEO_MODEL_ID =
  "bytedance/seedance-2.0/reference-to-video" as const

/** Base64-expanded limit derived from the binary upload limit. */
const MAX_DATA_URL_LENGTH = Math.ceil(IMAGE_UPLOAD_RULES.maxBytes * 1.4)

/** PNG data URLs for storyboard capture may exceed the reference upload cap. */
const MAX_STORYBOARD_PNG_DATA_URL_LENGTH = Math.ceil(25 * 1024 * 1024 * 1.4)

const dataUrlSchema = z
  .string()
  .max(MAX_DATA_URL_LENGTH)
  .refine(
    (value) => /^data:image\/(?:jpeg|png);base64,[a-z0-9+/=\s]+$/i.test(value),
    "Reference images must be PNG or JPEG data URLs."
  )

const storyboardPngDataUrlSchema = z
  .string()
  .max(MAX_STORYBOARD_PNG_DATA_URL_LENGTH)
  .refine(
    (value) => /^data:image\/png;base64,[a-z0-9+/=\s]+$/i.test(value),
    "Storyboard capture must be a PNG data URL."
  )

/** Runtime schema for requests entering the video generation API. */
export const videoGenerationRequestSchema = z.object({
  characterImageRefs: z
    .array(dataUrlSchema)
    .max(MAX_SEEDANCE_CHARACTER_IMAGES),
  prompt: z.string().trim().min(1).max(MAX_SEEDANCE_VIDEO_PROMPT_LENGTH),
  storyboardImage: storyboardPngDataUrlSchema,
})

/** Runtime schema for a successful Seedance video generation response. */
export const videoGenerationResponseSchema = z.object({
  videoUrl: z.string().url(),
})

/** Client request submitted to generate a Seedance video. */
export interface VideoGenerationRequest {
  characterImageRefs: string[]
  prompt: string
  storyboardImage: string
}

/** Successful response from the video generation API. */
export interface VideoGenerationResponse {
  videoUrl: string
}
