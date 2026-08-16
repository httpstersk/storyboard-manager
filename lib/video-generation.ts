/**
 * Zod schemas and constants for Seedance 2.5 video generation via fal.
 */

import { z } from "zod"

import { dataUrlSchema } from "@/lib/generation"

/**
 * Minimum clip length Seedance 2.5 accepts, in seconds.
 */
export const SEEDANCE_DURATION_MIN = 4

/**
 * Maximum clip length Seedance 2.5 accepts, in seconds.
 */
export const SEEDANCE_DURATION_MAX = 30

/**
 * Fal `duration` values Seedance 2.5 accepts, excluding `auto`.
 * The client always sends a clamped whole-second length so the prompt's
 * stage ranges and the API request stay aligned.
 */
export const SEEDANCE_DURATION_OPTIONS = [
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "11",
  "12",
  "13",
  "14",
  "15",
  "16",
  "17",
  "18",
  "19",
  "20",
  "21",
  "22",
  "23",
  "24",
  "25",
  "26",
  "27",
  "28",
  "29",
  "30",
] as const

/** Whole-second clip length sent to fal Seedance 2.5. */
export type SeedanceDuration = (typeof SEEDANCE_DURATION_OPTIONS)[number]

/**
 * Maximum reference images accepted by Seedance 2.5 reference-to-video.
 * @Image1 is always the storyboard PNG; attached refs fill the rest.
 * Images cap at 30; video and audio slots are unused in this pass.
 */
export const MAX_SEEDANCE_REFERENCE_IMAGES = 30

/**
 * Maximum attached reference images after reserving @Image1 for the
 * storyboard contact sheet. Characters and environments share this budget.
 */
export const MAX_SEEDANCE_ATTACHED_IMAGES = MAX_SEEDANCE_REFERENCE_IMAGES - 1

/**
 * User-facing message when character and environment stills exceed the
 * Seedance attached-image budget.
 */
export const MAX_SEEDANCE_ATTACHED_IMAGES_ERROR = `Attach up to ${MAX_SEEDANCE_ATTACHED_IMAGES} character and environment stills in total.`

/** Maximum text length of a Seedance video prompt. */
export const MAX_SEEDANCE_VIDEO_PROMPT_LENGTH = 20_000

/** Fal model id for ByteDance Seedance 2.5 reference-to-video. */
export const SEEDANCE_REFERENCE_TO_VIDEO_MODEL_ID =
  "bytedance/seedance-2.5/reference-to-video" as const

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

const seedanceDurationSchema = z.enum(SEEDANCE_DURATION_OPTIONS)

/** Runtime schema for requests entering the video generation API. */
export const videoGenerationRequestSchema = z
  .object({
    characterImageRefs: z
      .array(dataUrlSchema)
      .max(MAX_SEEDANCE_ATTACHED_IMAGES),
    duration: seedanceDurationSchema,
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
      message: MAX_SEEDANCE_ATTACHED_IMAGES_ERROR,
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
  duration: SeedanceDuration
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

/**
 * Clamps a board's planned runtime to a Seedance 2.5 `duration` enum value.
 * Totals of 1 to 3 seconds become `"4"`; totals above 30 become `"30"`.
 *
 * @param totalSeconds - Sum of scene `timeSeconds` on the visible board.
 * @returns The fal duration string to send with the generation request.
 */
export function resolveSeedanceDuration(
  totalSeconds: number
): SeedanceDuration {
  return String(
    resolveSeedanceDurationSeconds(totalSeconds)
  ) as SeedanceDuration
}

/**
 * Clamps a board's planned runtime to Seedance 2.5's 4 to 30 second window.
 *
 * @param totalSeconds - Sum of scene `timeSeconds` on the visible board.
 * @returns Whole seconds to request from fal and to budget in the prompt.
 */
export function resolveSeedanceDurationSeconds(totalSeconds: number): number {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return SEEDANCE_DURATION_MIN
  }

  return Math.min(
    SEEDANCE_DURATION_MAX,
    Math.max(SEEDANCE_DURATION_MIN, Math.round(totalSeconds))
  )
}
