import { z } from "zod"

import { COLUMN_LIMITS, ROW_LIMITS, type ShotSize } from "@/lib/storyboard"
import { IMAGE_UPLOAD_RULES, MAX_NOTE_LENGTH } from "@/lib/validation"

/** Maximum number of character sheets accepted by one generation request. */
export const MAX_CHARACTER_SHEETS = 4

/** Maximum text length of one character sheet. */
export const MAX_CHARACTER_SHEET_LENGTH = 20_000

/** Maximum number of visual references accepted by Nano Banana Lite. */
export const MAX_IMAGE_REFERENCES = 3

/** Maximum number of planned scenes, balancing story coverage and frame detail. */
export const MAX_GENERATED_SCENES = 12

/** Minimum number of beats produced for even a short logline. */
export const MIN_GENERATED_SCENES = 3

/** Pixel gap separating adjacent cells in the generated composite. */
export const STORYBOARD_CELL_GAP = 1

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

/** Runtime schema used to constrain the OpenAI scene-planning response. */
export const storyboardPlanSchema = z.object({
  scenes: z
    .array(
      z.object({
        action: z.string().trim().min(1).max(MAX_NOTE_LENGTH),
        dialogue: z.string().trim().max(MAX_NOTE_LENGTH),
        shot: generatedShotSchema,
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
      dialogue: z.string(),
      image: dataUrlSchema,
      shot: generatedShotSchema,
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
  dialogue: string
  image: string
  shot: ShotSize
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
