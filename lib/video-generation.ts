/**
 * Zod schemas and constants for Seedance 2.0 video generation via fal.
 */

import { z } from "zod"

import { dataUrlSchema } from "@/lib/generation"

/**
 * Maximum reference images accepted by Seedance 2.0 reference-to-video.
 * @Image1 is always the storyboard PNG; attached refs fill the rest.
 */
export const MAX_SEEDANCE_REFERENCE_IMAGES = 9

/**
 * Maximum attached reference images after reserving @Image1 for the
 * storyboard contact sheet. Characters and environments share this budget.
 */
export const MAX_SEEDANCE_ATTACHED_IMAGES = MAX_SEEDANCE_REFERENCE_IMAGES - 1

/** Maximum text length of a Seedance video prompt. */
export const MAX_SEEDANCE_VIDEO_PROMPT_LENGTH = 20_000

/** Fal model id for ByteDance Seedance 2.0 reference-to-video. */
export const SEEDANCE_REFERENCE_TO_VIDEO_MODEL_ID =
  "bytedance/seedance-2.0/reference-to-video" as const

/** PNG data URLs for storyboard capture may exceed the reference upload cap. */
const MAX_STORYBOARD_PNG_DATA_URL_LENGTH = Math.ceil(
  25 * 1024 * 1024 * 1.4
)

const storyboardPngDataUrlSchema = z
  .string()
  .max(MAX_STORYBOARD_PNG_DATA_URL_LENGTH)
  .refine(
    (value) => /^data:image\/png;base64,[a-z0-9+/=\s]+$/i.test(value),
    "Storyboard capture must be a PNG data URL."
  )

/** Runtime schema for requests entering the video generation API. */
export const videoGenerationRequestSchema = z
  .object({
    characterImageRefs: z
      .array(dataUrlSchema)
      .max(MAX_SEEDANCE_ATTACHED_IMAGES),
    environmentImageRefs: z
      .array(dataUrlSchema)
      .max(MAX_SEEDANCE_ATTACHED_IMAGES),
    prompt: z.string().trim().min(1).max(MAX_SEEDANCE_VIDEO_PROMPT_LENGTH),
    storyboardImage: storyboardPngDataUrlSchema,
  })
  .refine(
    ({ characterImageRefs, environmentImageRefs }) =>
      characterImageRefs.length + environmentImageRefs.length <=
      MAX_SEEDANCE_ATTACHED_IMAGES,
    {
      message: `Attach up to ${MAX_SEEDANCE_ATTACHED_IMAGES} reference images in total.`,
      path: ["environmentImageRefs"],
    }
  )

/** Runtime schema for a successful Seedance video generation response. */
export const videoGenerationResponseSchema = z.object({
  videoUrl: z.string().url(),
})

/** Client request submitted to generate a Seedance video. */
export interface VideoGenerationRequest {
  characterImageRefs: string[]
  environmentImageRefs: string[]
  prompt: string
  storyboardImage: string
}

/** Successful response from the video generation API. */
export interface VideoGenerationResponse {
  videoUrl: string
}

/** How many character and environment refs fit in Seedance's slot budget. */
export interface SeedanceReferenceSlots {
  characterCount: number
  environmentCount: number
}

/**
 * Allocates the shared Seedance reference-image budget between characters
 * and environments, filling characters first.
 *
 * Single source of truth for the split so the prompt's `@ImageN` bindings
 * and the uploaded `image_urls` array can never disagree.
 *
 * @param characterCount - Character reference images the board holds.
 * @param environmentCount - Environment reference images the board holds.
 * @returns The counts that fit, characters prioritised.
 */
export function allocateSeedanceReferenceSlots(
  characterCount: number,
  environmentCount: number
): SeedanceReferenceSlots {
  const characters = Math.min(characterCount, MAX_SEEDANCE_ATTACHED_IMAGES)

  return {
    characterCount: characters,
    environmentCount: Math.min(
      environmentCount,
      MAX_SEEDANCE_ATTACHED_IMAGES - characters
    ),
  }
}
