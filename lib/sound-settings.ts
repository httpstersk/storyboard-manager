/**
 * Persisted user preferences for UI click sounds.
 *
 * Backed by `atomWithStorage` on Jotai's default store, so no Provider is
 * required. Storage is read after mount (the `atomWithStorage` default),
 * keeping the server and first client render in sync.
 */

import { atomWithStorage } from "jotai/utils"

/** User preferences for the UI click sound. */
export interface SoundSettings {
  /** Whether click sounds play at all; the mute toggle (true = audible). */
  enabled: boolean
  /** Playback volume in the range 0–1. */
  volume: number
}

/** Default preferences: enabled at a subtle mid volume. */
const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 0.6,
}

/** Versioned localStorage key for {@link soundSettingsAtom}. */
const SOUND_SETTINGS_KEY = "storyboard-manager:sound:v1"

/** Global, persisted click-sound preferences. */
export const soundSettingsAtom = atomWithStorage<SoundSettings>(
  SOUND_SETTINGS_KEY,
  DEFAULT_SOUND_SETTINGS
)
