/**
 * Persisted user preference for how long the assembled Seedance video prompt
 * may grow. The selected length maps to a hard character cap enforced by
 * `buildSeedanceVideoPrompt` via graceful degradation.
 *
 * Backed by `atomWithStorage` on Jotai's default store, so no Provider is
 * required. Storage is read after mount (the `atomWithStorage` default),
 * keeping the server and first client render in sync.
 */

import { atomWithStorage } from "jotai/utils"

/** Available prompt lengths, ordered as they appear in the toolbar. */
export const PROMPT_LENGTHS = ["small", "medium", "large"] as const

/** How long the finished Seedance video prompt is allowed to grow. */
export type PromptLength = (typeof PROMPT_LENGTHS)[number]

/** Toolbar labels for each {@link PromptLength}. */
export const PROMPT_LENGTH_LABELS: Record<PromptLength, string> = {
  large: "Large",
  medium: "Medium",
  small: "Small",
}

/** Maximum character count of the finished prompt for each {@link PromptLength}. */
export const PROMPT_LENGTH_MAX_CHARS: Record<PromptLength, number> = {
  large: 5000,
  medium: 3500,
  small: 2500,
}

/** Default preference: a balanced mid-length prompt. */
const DEFAULT_PROMPT_LENGTH: PromptLength = "medium"

/** Versioned localStorage key for {@link promptLengthAtom}. */
const PROMPT_LENGTH_SETTINGS_KEY = "storyboard-studio:prompt-length:v1"

/**
 * Global, persisted prompt-length preference.
 * Drives the character cap applied to the derived Seedance video prompt.
 */
export const promptLengthAtom = atomWithStorage<PromptLength>(
  PROMPT_LENGTH_SETTINGS_KEY,
  DEFAULT_PROMPT_LENGTH
)

/** Type guard for values emitted by the Length segmented control. */
export function isPromptLength(value: string): value is PromptLength {
  return (PROMPT_LENGTHS as readonly string[]).includes(value)
}
