import { z } from "zod"

import {
  MAX_COMPOSER_SHEET_LENGTH,
  MAX_COMPOSER_SHEETS,
  MAX_VISUAL_STYLE_LENGTH,
} from "@/lib/board-composer"
import { isImageDataUrl } from "@/lib/image-data"
import {
  IMAGE_MODELS,
  IMAGE_RESOLUTIONS,
  type ImageModel,
  type ImageResolution,
} from "@/lib/image-models"
import { SHOT_MODES, type ShotMode } from "@/lib/shot-mode-settings"
import {
  CAMERA_OPTIONS,
  COLUMN_LIMITS,
  type GeneratedBoardScene,
  GRID_PRESETS,
  LENS_OPTIONS,
  LIGHTING_OPTIONS,
  MOVEMENT_OPTIONS,
  ROW_LIMITS,
  SCENE_TIME_LIMITS,
  type SelectOption,
} from "@/lib/storyboard"
import { IMAGE_UPLOAD_RULES, MAX_NOTE_LENGTH } from "@/lib/validation"

/**
 * Maximum number of image references accepted per storyboard image-generation
 * request. Seedance video stills use a separate, higher cap in
 * `lib/video-generation.ts`. Both image models' edit endpoints accept at
 * least 10 input images; keep headroom below that.
 */
export const MAX_IMAGE_REFERENCES = 15

/** User-facing message when storyboard-gen stills exceed the image-model budget. */
export const MAX_IMAGE_REFERENCES_ERROR = `Attach up to ${MAX_IMAGE_REFERENCES} reference images in total.`

/** User-facing message when style stills exceed the storyboard-gen budget. */
export const MAX_STYLE_IMAGE_REFERENCES_ERROR = `Attach up to ${MAX_IMAGE_REFERENCES} style reference images.`

/**
 * Scene counts that fill a generation layout with no leftover cells:
 * 2×2, 3×2, 3×3, and 4×3.
 */
export const GENERATED_SCENE_COUNTS = [
  GRID_PRESETS[0].columns * GRID_PRESETS[0].rows,
  GRID_PRESETS[1].columns * GRID_PRESETS[1].rows,
  GRID_PRESETS[2].columns * GRID_PRESETS[2].rows,
  GRID_PRESETS[4].columns * GRID_PRESETS[4].rows,
] as const

/** Maximum number of planned scenes, balancing story coverage and frame detail. */
export const MAX_GENERATED_SCENES =
  GENERATED_SCENE_COUNTS[GENERATED_SCENE_COUNTS.length - 1]

/** Maximum length of a single-scene image editing instruction. */
export const MAX_SCENE_IMAGE_EDIT_PROMPT_LENGTH = 2_000

/** Minimum number of beats produced for even a short logline. */
export const MIN_GENERATED_SCENES = GENERATED_SCENE_COUNTS[0]

/** Maximum text length of the submitted logline or storyline. */
const MAX_PROMPT_LENGTH = 12_000

/** Base64-expanded limit derived from the binary upload limit. */
export const MAX_DATA_URL_LENGTH = Math.ceil(IMAGE_UPLOAD_RULES.maxBytes * 1.4)

/** Reusable Zod schema for a PNG or JPEG data URL within the upload size cap. */
export const dataUrlSchema = z
  .string()
  .max(MAX_DATA_URL_LENGTH)
  .refine(
    (value) => isImageDataUrl(value),
    "Reference images must be PNG or JPEG data URLs."
  )

/** Runtime schema for the image model preference. */
export const imageModelSchema = z.enum(IMAGE_MODELS).default("nano-banana-pro")

/** Runtime schema for the 1K / 2K / 4K output resolution preference. */
export const imageResolutionSchema = z.enum(IMAGE_RESOLUTIONS).default("2K")

/** Runtime schema for the multi-shot / continuous shot mode preference. */
export const shotModeSchema = z.enum(SHOT_MODES).default("multi-shot")

/** Reusable Zod schema for one group of written composer sheets. */
const composerSheetsSchema = z
  .array(z.string().trim().min(1).max(MAX_COMPOSER_SHEET_LENGTH))
  .max(MAX_COMPOSER_SHEETS)

/** Runtime schema for requests entering the generation API boundary. */
export const storyboardGenerationRequestSchema = z
  .object({
    characterImageRefs: z.array(dataUrlSchema).max(MAX_IMAGE_REFERENCES),
    characterSheets: composerSheetsSchema,
    depthMapStyle: z.boolean().default(false),
    environmentImageRefs: z.array(dataUrlSchema).max(MAX_IMAGE_REFERENCES),
    environmentSheets: composerSheetsSchema,
    imageModel: imageModelSchema,
    prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH),
    resolution: imageResolutionSchema,
    shotMode: shotModeSchema,
    styleImageRefs: z.array(dataUrlSchema).max(MAX_IMAGE_REFERENCES),
    visualStyle: z.string().trim().max(MAX_VISUAL_STYLE_LENGTH),
  })
  .refine(
    ({ characterImageRefs, environmentImageRefs, styleImageRefs }) =>
      characterImageRefs.length +
        environmentImageRefs.length +
        styleImageRefs.length <=
      MAX_IMAGE_REFERENCES,
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
    .max(MAX_GENERATED_SCENES)
    .refine(
      (scenes) =>
        (GENERATED_SCENE_COUNTS as readonly number[]).includes(scenes.length),
      {
        message: `Scene count must fill a grid: ${GENERATED_SCENE_COUNTS.join(", ")}.`,
      }
    ),
  title: z.string().trim().min(1).max(60),
})

/** Structured scene plan produced by the storyboard planner. */
export type StoryboardPlan = z.infer<typeof storyboardPlanSchema>

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

/** Runtime schema for requests that analyse uploaded visual-style images. */
export const visualStyleAnalysisRequestSchema = z.object({
  styleImageRefs: z.array(dataUrlSchema).min(1).max(MAX_IMAGE_REFERENCES),
})

/** Runtime schema for a successful visual-style analysis response. */
export const visualStyleAnalysisResponseSchema = z.object({
  visualStyle: z.string().trim().min(1).max(MAX_VISUAL_STYLE_LENGTH),
})

/** Runtime schema for requests that modify one existing scene image. */
export const sceneImageEditRequestSchema = z.object({
  depthMapStyle: z.boolean().default(false),
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
  depthMapStyle: boolean
  environmentImageRefs: string[]
  environmentSheets: string[]
  imageModel: ImageModel
  prompt: string
  resolution: ImageResolution
  shotMode: ShotMode
  styleImageRefs: string[]
  visualStyle: string
}

/** Client request submitted to analyse uploaded visual-style images. */
export interface VisualStyleAnalysisRequest {
  styleImageRefs: string[]
}

/** Client request submitted to modify one generated scene image. */
export interface SceneImageEditRequest {
  depthMapStyle: boolean
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
 * How many character, environment, and style stills fit in the storyboard
 * image-model input budget. Style is kept first, then characters, then
 * environments, so Seedream/Nano Banana never receive more than
 * {@link MAX_IMAGE_REFERENCES} images.
 */
export interface StoryboardReferenceSlots {
  characterCount: number
  environmentCount: number
  styleCount: number
}

/**
 * Allocates {@link MAX_IMAGE_REFERENCES} across style, character, and
 * environment stills for storyboard image generation. Style stills are
 * kept first because they lock the look; leftover slots go to characters,
 * then environments.
 *
 * @param characterCount - Character reference images the board holds.
 * @param environmentCount - Environment reference images the board holds.
 * @param styleCount - Visual-style reference images the board holds.
 * @returns The counts that fit the image-model budget.
 */
export function allocateStoryboardReferenceSlots(
  characterCount: number,
  environmentCount: number,
  styleCount: number
): StoryboardReferenceSlots {
  const style = Math.min(Math.max(styleCount, 0), MAX_IMAGE_REFERENCES)
  const remainingAfterStyle = MAX_IMAGE_REFERENCES - style
  const characters = Math.min(Math.max(characterCount, 0), remainingAfterStyle)
  const remainingAfterCharacters = remainingAfterStyle - characters
  const environments = Math.min(
    Math.max(environmentCount, 0),
    remainingAfterCharacters
  )

  return {
    characterCount: characters,
    environmentCount: environments,
    styleCount: style,
  }
}

/**
 * Whether `action` names `handle` as a distinct token.
 * `@Ann` must not match `@Anna`. Bare names count only when capitalized
 * (`Five` satisfies `@Five`; lowercase `will` does not satisfy `@Will`).
 */
export function actionNamesHandle(action: string, handle: string): boolean {
  const normalizedHandle = handle.trim()

  if (normalizedHandle === "") {
    return false
  }

  const body = normalizedHandle.replace(/^@+/, "")

  if (body === "") {
    return false
  }

  const escapedHandle = escapeRegExp(normalizedHandle)

  if (new RegExp(`${escapedHandle}(?![\\w-])`, "i").test(action)) {
    return true
  }

  const escapedBody = escapeRegExp(body)
  const unadorned = action.match(
    new RegExp(`(?:^|[^\\w@])(${escapedBody})(?![\\w-])`, "i")
  )

  return unadorned !== null && /[A-Z]/.test(unadorned[1] ?? "")
}

/**
 * Appends each missing `@handle` to the shortest scene action so a finished
 * plan always names the full cast. Last resort after planning and repair.
 */
export function foldMissingHandlesIntoScenes<T extends { action: string }>(
  scenes: T[],
  characterHandles: string[]
): T[] {
  const nextScenes = scenes.map((scene) => ({ ...scene }))

  for (const handle of missingCharacterHandles(nextScenes, characterHandles)) {
    const target = nextScenes.reduce((shortest, scene) =>
      scene.action.length <= shortest.action.length ? scene : shortest
    )
    target.action = appendHandleToAction(target.action, handle)
  }

  return nextScenes
}

/**
 * Maps a scene count to the tightest valid {@link StoryboardLayout} preset.
 * Planned counts are 4, 6, 9, or 12, which fill these layouts with no leftover cells:
 * - 4 scenes  → 2×2
 * - 6 scenes  → 3×2
 * - 9 scenes  → 3×3
 * - 12 scenes → 4×3
 */
export function layoutForSceneCount(sceneCount: number): StoryboardLayout {
  const bounded = Math.min(
    MAX_GENERATED_SCENES,
    Math.max(MIN_GENERATED_SCENES, Math.round(sceneCount))
  )

  if (bounded <= 4) return GRID_PRESETS[0] // 2×2
  if (bounded <= 6) return GRID_PRESETS[1] // 3×2
  if (bounded <= 9) return GRID_PRESETS[2] // 3×3
  return GRID_PRESETS[4] // 4×3
}

/**
 * Named character `@handles` that do not appear in any scene action.
 */
export function missingCharacterHandles(
  scenes: Array<{ action: string }>,
  characterHandles: string[]
): string[] {
  return characterHandles.filter(
    (handle) => !scenes.some((scene) => actionNamesHandle(scene.action, handle))
  )
}

/**
 * Appends `handle` to `action`, trimming the existing clause when needed so
 * the result stays within {@link MAX_NOTE_LENGTH}.
 */
function appendHandleToAction(action: string, handle: string): string {
  const suffix = ` with ${handle}`

  if (action.length + suffix.length <= MAX_NOTE_LENGTH) {
    return `${trimTrailingTerminators(action)}${suffix}`
  }

  const budget = Math.max(0, MAX_NOTE_LENGTH - suffix.length)
  const trimmed = trimTrailingTerminators(action.slice(0, budget))

  return `${trimmed}${suffix}`
}

/** Escapes `value` so it can be used as a literal in a `RegExp`. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Strips trailing whitespace and clause punctuation. */
function trimTrailingTerminators(value: string): string {
  return value.replace(/[\s,;:.]+$/u, "")
}
