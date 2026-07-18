import { z } from "zod"

import {
  MAX_CHARACTER_SHEET_LENGTH,
  MAX_CHARACTER_SHEETS,
  MAX_VISUAL_STYLE_LENGTH,
} from "@/lib/board-composer"
import {
  IMAGE_MODELS,
  IMAGE_RESOLUTIONS,
  type ImageModel,
  type ImageResolution,
} from "@/lib/image-models"
import {
  CAMERA_OPTIONS,
  COLUMN_LIMITS,
  type GeneratedBoardScene,
  LENS_OPTIONS,
  LIGHTING_OPTIONS,
  MOVEMENT_OPTIONS,
  ROW_LIMITS,
  SCENE_TIME_LIMITS,
  type SelectOption,
} from "@/lib/storyboard"
import { IMAGE_UPLOAD_RULES, MAX_NOTE_LENGTH } from "@/lib/validation"

/**
 * Maximum number of image references accepted per generation request.
 * Both models' edit endpoints accept at least 10 input images; keep
 * headroom below that.
 */
export const MAX_IMAGE_REFERENCES = 9

/** User-facing message shared by client and server image-count validation. */
export const MAX_IMAGE_REFERENCES_ERROR = `Attach up to ${MAX_IMAGE_REFERENCES} reference images in total.`

/** Maximum number of planned scenes, balancing story coverage and frame detail. */
export const MAX_GENERATED_SCENES = 12

/** Maximum length of a single-scene image editing instruction. */
export const MAX_SCENE_IMAGE_EDIT_PROMPT_LENGTH = 2_000

/** Minimum number of beats produced for even a short logline. */
export const MIN_GENERATED_SCENES = 3

/** Maximum text length of the submitted logline or storyline. */
const MAX_PROMPT_LENGTH = 12_000

/** Base64-expanded limit derived from the binary upload limit. */
export const MAX_DATA_URL_LENGTH = Math.ceil(IMAGE_UPLOAD_RULES.maxBytes * 1.4)

/** Reusable Zod schema for a PNG or JPEG data URL within the upload size cap. */
export const dataUrlSchema = z
  .string()
  .max(MAX_DATA_URL_LENGTH)
  .refine(
    (value) => /^data:image\/(?:jpeg|png);base64,[a-z0-9+/=\s]+$/i.test(value),
    "Reference images must be PNG or JPEG data URLs."
  )

/** Runtime schema for the image model preference. */
export const imageModelSchema = z.enum(IMAGE_MODELS).default("nano-banana-pro")

/** Runtime schema for the 1K / 2K / 4K output resolution preference. */
export const imageResolutionSchema = z.enum(IMAGE_RESOLUTIONS).default("2K")

/** Runtime schema for requests entering the generation API boundary. */
export const storyboardGenerationRequestSchema = z
  .object({
    characterImageRefs: z.array(dataUrlSchema).max(MAX_IMAGE_REFERENCES),
    characterSheets: z
      .array(z.string().trim().min(1).max(MAX_CHARACTER_SHEET_LENGTH))
      .max(MAX_CHARACTER_SHEETS),
    imageModel: imageModelSchema,
    prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH),
    resolution: imageResolutionSchema,
    styleImageRefs: z.array(dataUrlSchema).max(MAX_IMAGE_REFERENCES),
    visualStyle: z.string().trim().max(MAX_VISUAL_STYLE_LENGTH),
  })
  .refine(
    ({ characterImageRefs, styleImageRefs }) =>
      characterImageRefs.length + styleImageRefs.length <= MAX_IMAGE_REFERENCES,
    {
      message: MAX_IMAGE_REFERENCES_ERROR,
      path: ["styleImageRefs"],
    }
  )

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

/** Runtime schema for requests that modify one existing scene image. */
export const sceneImageEditRequestSchema = z.object({
  imageModel: imageModelSchema,
  prompt: z.string().trim().min(1).max(MAX_SCENE_IMAGE_EDIT_PROMPT_LENGTH),
  resolution: imageResolutionSchema,
  sourceImage: dataUrlSchema,
  visualStyle: z.string().trim().max(MAX_VISUAL_STYLE_LENGTH),
})

/** Runtime schema for a successful single-scene image editing response. */
export const sceneImageEditResponseSchema = z.object({
  image: dataUrlSchema,
})

/** Client request submitted by the prompt composer. */
export interface StoryboardGenerationRequest {
  characterImageRefs: string[]
  characterSheets: string[]
  imageModel: ImageModel
  prompt: string
  resolution: ImageResolution
  styleImageRefs: string[]
  visualStyle: string
}

/** Client request submitted to modify one generated scene image. */
export interface SceneImageEditRequest {
  imageModel: ImageModel
  prompt: string
  resolution: ImageResolution
  sourceImage: string
  visualStyle: string
}

/** Successful response from the storyboard generation API. */
export interface StoryboardGenerationResponse {
  columns: number
  rows: number
  scenes: GeneratedBoardScene[]
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
