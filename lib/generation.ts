import { z } from "zod"

import {
  CAMERA_OPTIONS,
  COLUMN_LIMITS,
  LENS_OPTIONS,
  LIGHTING_OPTIONS,
  MOVEMENT_OPTIONS,
  ROW_LIMITS,
  SCENE_TIME_LIMITS,
  type SelectOption,
  type ShotSize,
} from "@/lib/storyboard"
import { IMAGE_UPLOAD_RULES, MAX_NOTE_LENGTH } from "@/lib/validation"

/** Maximum number of character sheets accepted by one generation request. */
export const MAX_CHARACTER_SHEETS = 4

/** Maximum text length of one character sheet. */
export const MAX_CHARACTER_SHEET_LENGTH = 20_000

/**
 * Maximum number of visual references accepted per generation request.
 * Nano Banana Lite edit supports up to 14 input images; keep headroom below that.
 */
export const MAX_IMAGE_REFERENCES = 9

/** Maximum number of planned scenes, balancing story coverage and frame detail. */
export const MAX_GENERATED_SCENES = 12

/** Minimum number of beats produced for even a short logline. */
export const MIN_GENERATED_SCENES = 3

/**
 * Pixel gap separating adjacent cells in the generated composite. Zero:
 * the model renders cells edge-to-edge so slice coordinates are pure
 * divisions of the sheet dimensions with no separator compensation.
 */
export const STORYBOARD_CELL_GAP = 0

/** Maximum text length of the submitted logline or storyline. */
const MAX_PROMPT_LENGTH = 12_000

/** Base64-expanded limit derived from the binary upload limit. */
const MAX_DATA_URL_LENGTH = Math.ceil(IMAGE_UPLOAD_RULES.maxBytes * 1.4)

const dataUrlSchema = z
  .string()
  .max(MAX_DATA_URL_LENGTH)
  .refine(
    (value) => /^data:image\/(?:jpeg|png);base64,[a-z0-9+/=\s]+$/i.test(value),
    "Visual references must be PNG or JPEG data URLs."
  )

/** Runtime schema for requests entering the generation API boundary. */
export const storyboardGenerationRequestSchema = z.object({
  characterSheets: z
    .array(z.string().trim().min(1).max(MAX_CHARACTER_SHEET_LENGTH))
    .max(MAX_CHARACTER_SHEETS),
  imageRefs: z.array(dataUrlSchema).max(MAX_IMAGE_REFERENCES),
  prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH),
})

const generatedShotSchema = z.enum(["CU", "MCU", "MS", "WS"])

/** Builds a Zod enum from select-option values, keeping one source of truth. */
function enumFromOptions(options: SelectOption[]): z.ZodType<string> {
  return z.enum(options.map((option) => option.value) as [string, ...string[]])
}

const generatedCameraSchema = enumFromOptions(CAMERA_OPTIONS)
const generatedLensSchema = enumFromOptions(LENS_OPTIONS)
const generatedLightingSchema = enumFromOptions(LIGHTING_OPTIONS)
const generatedMovementSchema = enumFromOptions(MOVEMENT_OPTIONS)
const generatedTimeSchema = z
  .number()
  .int()
  .min(SCENE_TIME_LIMITS.min)
  .max(SCENE_TIME_LIMITS.max)

/** Runtime schema used to constrain the OpenAI scene-planning response. */
export const storyboardPlanSchema = z.object({
  scenes: z
    .array(
      z.object({
        action: z.string().trim().min(1).max(MAX_NOTE_LENGTH),
        camera: generatedCameraSchema,
        dialogue: z.string().trim().max(MAX_NOTE_LENGTH),
        lens: generatedLensSchema,
        lighting: generatedLightingSchema,
        movement: generatedMovementSchema,
        shot: generatedShotSchema,
        timeSeconds: generatedTimeSchema,
      })
    )
    .min(MIN_GENERATED_SCENES)
    .max(MAX_GENERATED_SCENES),
  title: z.string().trim().min(1).max(60),
})

/** Runtime schema for a successful server generation response. */
export const storyboardGenerationResponseSchema = z.object({
  columns: z.number().int().min(COLUMN_LIMITS.min).max(COLUMN_LIMITS.max),
  rows: z.number().int().min(ROW_LIMITS.min).max(ROW_LIMITS.max),
  scenes: z.array(
    z.object({
      action: z.string(),
      camera: generatedCameraSchema,
      dialogue: z.string(),
      image: dataUrlSchema,
      lens: generatedLensSchema,
      lighting: generatedLightingSchema,
      movement: generatedMovementSchema,
      shot: generatedShotSchema,
      timeSeconds: generatedTimeSchema,
    })
  ),
  title: z.string().trim().min(1).max(60),
})

/** Client request submitted by the prompt composer. */
export interface StoryboardGenerationRequest {
  characterSheets: string[]
  imageRefs: string[]
  prompt: string
}

/** Planned scene metadata returned alongside each sliced frame. */
export interface GeneratedScene {
  action: string
  camera: string
  dialogue: string
  image: string
  lens: string
  lighting: string
  movement: string
  shot: ShotSize
  timeSeconds: number
}

/** Successful response from the storyboard generation API. */
export interface StoryboardGenerationResponse {
  columns: number
  rows: number
  scenes: GeneratedScene[]
  title: string
}

/** Grid dimensions selected for a dynamic scene count. */
export interface StoryboardLayout {
  columns: number
  rows: number
}

/**
 * Fits scenes to a compact 3–4-column grid while respecting workspace limits.
 */
export function layoutForSceneCount(sceneCount: number): StoryboardLayout {
  const boundedSceneCount = Math.min(
    MAX_GENERATED_SCENES,
    Math.max(MIN_GENERATED_SCENES, Math.round(sceneCount))
  )
  const columns = boundedSceneCount <= 6 ? 3 : 4

  return {
    columns,
    rows: Math.ceil(boundedSceneCount / columns),
  }
}
