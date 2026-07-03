/**
 * Input validation guards shared by the storyboard editor.
 *
 * Every user-supplied value (numbers, free text, uploaded files) passes
 * through this module before it reaches component state.
 */

import type { ValueLimits } from "@/lib/storyboard"

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
