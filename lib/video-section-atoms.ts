/**
 * Jotai atoms for the Seedance video section: prompt source, derived prompt,
 * and generation result state.
 */

import { atom } from "jotai"

import type { SeedanceCharacterNote } from "@/lib/seedance-video-prompt"
import { buildSeedanceVideoPrompt } from "@/lib/seedance-video-prompt"
import type { Scene } from "@/lib/storyboard"

/**
 * Writable snapshot that drives {@link seedanceVideoPromptAtom}.
 * Scenes sync from the workspace reducer; character fields sync from the
 * prompt composer (external-store sync via useEffect).
 */
export interface VideoPromptSource {
  /** Character reference images attached after the storyboard PNG. */
  characterImageCount: number
  /** Written character definitions from the composer. */
  characterNotes: SeedanceCharacterNote[]
  /** Ordered scenes of the selected board. */
  scenes: Scene[]
}

/** Empty prompt source used before the first sync. */
export const EMPTY_VIDEO_PROMPT_SOURCE: VideoPromptSource = {
  characterImageCount: 0,
  characterNotes: [],
  scenes: [],
}

/** Writable source for the derived Seedance video prompt. */
export const videoPromptSourceAtom = atom<VideoPromptSource>(
  EMPTY_VIDEO_PROMPT_SOURCE
)

/**
 * Character reference image files from the floating composer.
 * Held in memory only — not persisted. Read at Generate Video time.
 */
export const composerCharacterImageFilesAtom = atom<File[]>([])

/** Derived Seedance 2.0 prompt that updates whenever the source changes. */
export const seedanceVideoPromptAtom = atom((get) => {
  const source = get(videoPromptSourceAtom)

  return buildSeedanceVideoPrompt(source)
})

/** URL of the last successfully generated Seedance video, if any. */
export const generatedVideoUrlAtom = atom<string | null>(null)

/** Whether a Seedance generation request is in flight. */
export const isGeneratingVideoAtom = atom(false)

/** User-facing error from the last failed video generation, if any. */
export const videoGenerationErrorAtom = atom<string | null>(null)
