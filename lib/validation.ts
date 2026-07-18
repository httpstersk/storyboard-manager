/**
 * Input validation guards shared by the storyboard editor.
 *
 * Every user-supplied value (numbers, free text, uploaded files) passes
 * through this module before it reaches component state.
 */

import {
  type BoardComposerDraft,
  type CharacterNote,
  createEmptyComposerDraft,
  MAX_CHARACTER_NAME_LENGTH,
  MAX_CHARACTER_NOTES_LENGTH,
  MAX_CHARACTER_SHEETS,
  MAX_VISUAL_STYLE_LENGTH,
} from "@/lib/board-composer"
import {
  type Board,
  type Scene,
  SCENE_TIME_LIMITS,
  type SceneShaderPreset,
  SHOT_SIZE_OPTIONS,
  type ShotSize,
  shaderPresetForIndex,
  type ValueLimits,
} from "@/lib/storyboard"

/** Result of validating an uploaded file. */
export interface FileValidationResult {
  /** Human-readable reason when `ok` is false. */
  error?: string
  /** True when the file passed every check. */
  ok: boolean
}

/** Upload constraints for scene reference images. */
export const IMAGE_UPLOAD_RULES = {
  /** MIME types accepted by the scene image drop zone. */
  acceptedTypes: ["image/jpeg", "image/png"],
  /** Maximum accepted file size in bytes (10 MB). */
  maxBytes: 10 * 1024 * 1024,
} as const

/** Maximum length of a scene note (action, dialogue, or music). */
export const MAX_NOTE_LENGTH = 140

/**
 * Clamps an integer to the given inclusive limits, coercing non-finite
 * input to the minimum.
 */
export function clampInteger(value: number, limits: ValueLimits): number {
  if (!Number.isFinite(value)) {
    return limits.min
  }

  return Math.min(limits.max, Math.max(limits.min, Math.round(value)))
}

/**
 * Normalises a scene note: strips control characters and enforces
 * {@link MAX_NOTE_LENGTH}.
 */
export function sanitizeNote(value: string): string {
  return sanitizeText(value, MAX_NOTE_LENGTH)
}

/** Maximum length of a board title. */
const MAX_TITLE_LENGTH = 60

/**
 * Normalises a board title: strips control characters and enforces
 * {@link MAX_TITLE_LENGTH}.
 */
function sanitizeTitle(value: string): string {
  return sanitizeText(value, MAX_TITLE_LENGTH).trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback
}

/**
 * Clamps a float to inclusive [min, max], coercing non-numeric values
 * to the fallback.
 */
function clampFloat(
  value: unknown,
  min: number,
  max: number,
  fallback: number
): number {
  return Math.min(max, Math.max(min, coerceNumber(value, fallback)))
}

function coerceShader(value: unknown): SceneShaderPreset | null {
  if (!isRecord(value)) {
    return null
  }

  const colors = Array.isArray(value.colors)
    ? value.colors.filter(
        (color): color is string =>
          typeof color === "string" && /^#[0-9a-f]{3,8}$/i.test(color)
      )
    : []

  if (colors.length === 0) {
    return null
  }

  return {
    colors,
    distortion: clampFloat(value.distortion, 0, 1, 0.6),
    grainMixer: clampFloat(value.grainMixer, 0, 1, 0.15),
    grainOverlay: clampFloat(value.grainOverlay, 0, 1, 0.08),
    offsetX: clampFloat(value.offsetX, -1, 1, 0),
    offsetY: clampFloat(value.offsetY, -1, 1, 0),
    scale: clampFloat(value.scale, 0.01, 4, 1),
    speed: clampFloat(value.speed, 0, 2, 0.4),
    swirl: clampFloat(value.swirl, 0, 1, 0.2),
  }
}

/** Strips control characters and caps a free-text value at the given length. */
function sanitizeText(value: unknown, maxLength: number): string {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, maxLength)
    : ""
}

/**
 * Validates and normalises the composer draft fields of one board from
 * untrusted JSON (imports and IndexedDB). Uploads are attached later from
 * their own blob rows, so the returned draft always starts without files.
 */
export function coerceComposerDraft(
  value: Record<string, unknown>
): BoardComposerDraft {
  const draft = createEmptyComposerDraft()
  const characterNotes = (
    Array.isArray(value.characterNotes) ? value.characterNotes : []
  )
    .filter(isRecord)
    .slice(0, MAX_CHARACTER_SHEETS)
    .map(
      (note, index): CharacterNote => ({
        id: index,
        name: sanitizeText(note.name, MAX_CHARACTER_NAME_LENGTH),
        notes: sanitizeText(note.notes, MAX_CHARACTER_NOTES_LENGTH),
      })
    )

  return {
    ...draft,
    characterNotes:
      characterNotes.length > 0 ? characterNotes : draft.characterNotes,
    visualStyle: sanitizeText(value.visualStyle, MAX_VISUAL_STYLE_LENGTH),
  }
}

const SHOT_SIZE_VALUES = SHOT_SIZE_OPTIONS.map((option) => option.value)

/**
 * Validates and normalises one scene from untrusted JSON (imports and
 * IndexedDB). Returns null when the value is not a usable scene.
 */
function coerceScene(value: unknown, index: number): Scene | null {
  if (!isRecord(value)) {
    return null
  }

  const shader =
    value.shader === undefined
      ? shaderPresetForIndex(index)
      : coerceShader(value.shader)

  if (shader === null) {
    return null
  }

  const requiredStrings = [
    value.camera,
    value.lens,
    value.lighting,
    value.movement,
  ]

  if (requiredStrings.some((entry) => typeof entry !== "string")) {
    return null
  }

  const image =
    typeof value.image === "string" && value.image.startsWith("data:image/")
      ? value.image
      : undefined

  return {
    action: sanitizeNote(typeof value.action === "string" ? value.action : ""),
    camera: value.camera as string,
    dialogue: sanitizeNote(
      typeof value.dialogue === "string" ? value.dialogue : ""
    ),
    id: `scene-${String(index + 1).padStart(2, "0")}`,
    image,
    lens: value.lens as string,
    lighting: value.lighting as string,
    movement: value.movement as string,
    music: sanitizeNote(typeof value.music === "string" ? value.music : ""),
    shader,
    shot: SHOT_SIZE_VALUES.includes(value.shot as ShotSize)
      ? (value.shot as ShotSize)
      : "WS",
    timeSeconds: clampInteger(
      coerceNumber(value.timeSeconds, SCENE_TIME_LIMITS.min),
      SCENE_TIME_LIMITS
    ),
  }
}

/**
 * Validates and normalises one board from untrusted JSON. Returns null
 * when the value has no usable title or scenes.
 */
export function coerceBoard(value: unknown, fallbackId: string): Board | null {
  if (!isRecord(value) || !Array.isArray(value.scenes)) {
    return null
  }

  const scenes = value.scenes.flatMap((scene, index) => {
    const coerced = coerceScene(scene, index)

    return coerced === null ? [] : [coerced]
  })
  const title = sanitizeTitle(
    typeof value.title === "string" ? value.title : ""
  )

  if (scenes.length === 0 || title === "") {
    return null
  }

  return {
    composer: coerceComposerDraft(value),
    id: typeof value.id === "string" && value.id !== "" ? value.id : fallbackId,
    scenes,
    title,
    updatedAt: coerceNumber(value.updatedAt, Date.now()),
  }
}

/**
 * Validates an uploaded scene image against {@link IMAGE_UPLOAD_RULES}.
 */
export function validateImageFile(file: File): FileValidationResult {
  if (!(IMAGE_UPLOAD_RULES.acceptedTypes as readonly string[]).includes(file.type)) {
    return { error: "Only PNG or JPG images are supported.", ok: false }
  }

  if (file.size > IMAGE_UPLOAD_RULES.maxBytes) {
    return { error: "Images must be 10 MB or smaller.", ok: false }
  }

  return { ok: true }
}
