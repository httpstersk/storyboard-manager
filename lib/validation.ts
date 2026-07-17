/**
 * Input validation guards shared by the storyboard editor.
 *
 * Every user-supplied value (numbers, free text, uploaded files) passes
 * through this module before it reaches component state.
 */

import {
  type Board,
  type Scene,
  SCENE_TIME_LIMITS,
  type SceneShaderPreset,
  SHOT_SIZE_OPTIONS,
  type ShotSize,
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
  return value.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, MAX_NOTE_LENGTH)
}

/** Maximum length of a board title. */
const MAX_TITLE_LENGTH = 60

/**
 * Normalises a board title: strips control characters and enforces
 * {@link MAX_TITLE_LENGTH}.
 */
function sanitizeTitle(value: string): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, MAX_TITLE_LENGTH)
    .trim()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function coerceNumber(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : fallback
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
    distortion: Math.min(1, Math.max(0, coerceNumber(value.distortion, 0.6))),
    grainMixer: Math.min(1, Math.max(0, coerceNumber(value.grainMixer, 0.15))),
    grainOverlay: Math.min(
      1,
      Math.max(0, coerceNumber(value.grainOverlay, 0.08))
    ),
    offsetX: Math.min(1, Math.max(-1, coerceNumber(value.offsetX, 0))),
    offsetY: Math.min(1, Math.max(-1, coerceNumber(value.offsetY, 0))),
    scale: Math.min(4, Math.max(0.01, coerceNumber(value.scale, 1))),
    speed: Math.min(2, Math.max(0, coerceNumber(value.speed, 0.4))),
    swirl: Math.min(1, Math.max(0, coerceNumber(value.swirl, 0.2))),
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

  const shader = coerceShader(value.shader)

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

  const scenes = value.scenes
    .map((scene, index) => coerceScene(scene, index))
    .filter((scene): scene is Scene => scene !== null)
  const title = sanitizeTitle(
    typeof value.title === "string" ? value.title : ""
  )

  if (scenes.length === 0 || title === "") {
    return null
  }

  return {
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
