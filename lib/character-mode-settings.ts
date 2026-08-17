/**
 * Persisted user preference for how many named characters may share a scene.
 *
 * Backed by `atomWithStorage` on Jotai's default store, so no Provider is
 * required. Storage is read after mount (the `atomWithStorage` default),
 * keeping the server and first client render in sync.
 */

import { atomWithStorage } from "jotai/utils"

/** Available character modes, ordered as they appear in the toolbar. */
export const CHARACTER_MODES = ["multiple", "isolated"] as const

/** Whether generated scenes may name several characters or only one. */
export type CharacterMode = (typeof CHARACTER_MODES)[number]

/** Toolbar labels for each {@link CharacterMode}. */
export const CHARACTER_MODE_LABELS: Record<CharacterMode, string> = {
  isolated: "Isolated",
  multiple: "Multiple",
}

/** Default preference: named characters may share a scene. */
const DEFAULT_CHARACTER_MODE: CharacterMode = "multiple"

/** Versioned localStorage key for {@link characterModeAtom}. */
const CHARACTER_MODE_SETTINGS_KEY = "storyboard-studio:character-mode:v1"

/**
 * Global, persisted character mode preference.
 * Drives storyboard planning and the composite image generation prompt.
 */
export const characterModeAtom = atomWithStorage<CharacterMode>(
  CHARACTER_MODE_SETTINGS_KEY,
  DEFAULT_CHARACTER_MODE
)

/** Type guard for values emitted by the Characters segmented control. */
export function isCharacterMode(value: string): value is CharacterMode {
  return (CHARACTER_MODES as readonly string[]).includes(value)
}
