/**
 * Persisted user preference for how the board's shots are cut together.
 *
 * Backed by `atomWithStorage` on Jotai's default store, so no Provider is
 * required. Storage is read after mount (the `atomWithStorage` default),
 * keeping the server and first client render in sync.
 */

import { atomWithStorage } from "jotai/utils"

/** Available shot modes, ordered as they appear in the toolbar. */
export const SHOT_MODES = ["continuous", "multi-shot", "voyeuristic"] as const

/** How the board's beats relate to one another in the finished video. */
export type ShotMode = (typeof SHOT_MODES)[number]

/** Toolbar labels for each {@link ShotMode}. */
export const SHOT_MODE_LABELS: Record<ShotMode, string> = {
  continuous: "Continuous",
  "multi-shot": "Multi-shot",
  voyeuristic: "Voyeuristic",
}

/** Default preference: cut-based multi-shot sequences. */
const DEFAULT_SHOT_MODE: ShotMode = "multi-shot"

/** Versioned localStorage key for {@link shotModeAtom}. */
const SHOT_MODE_SETTINGS_KEY = "storyboard-studio:shot-mode:v1"

/**
 * Global, persisted shot mode preference.
 * Drives both storyboard planning and the Seedance video prompt.
 */
export const shotModeAtom = atomWithStorage<ShotMode>(
  SHOT_MODE_SETTINGS_KEY,
  DEFAULT_SHOT_MODE
)

/** Type guard for values emitted by the Shots segmented control. */
export function isShotMode(value: string): value is ShotMode {
  return (SHOT_MODES as readonly string[]).includes(value)
}
