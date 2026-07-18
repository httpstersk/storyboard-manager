/**
 * Jotai atoms for the Seedance video section: prompt source, derived prompt,
 * and per-board generation result state.
 */

import { atom } from "jotai"

import type { SeedanceCharacterNote } from "@/lib/seedance-video-prompt"
import { buildSeedanceVideoPrompt } from "@/lib/seedance-video-prompt"
import type { Scene } from "@/lib/storyboard"

/**
 * Session-only Seedance generation state for a single storyboard.
 * Not persisted — keyed by board id so boards generate independently.
 */
export interface BoardVideoState {
  /** User-facing error from the last failed generation, if any. */
  error: string | null
  /** Whether a Seedance request is in flight for this board. */
  isGenerating: boolean
  /** URL of the last successfully generated video, if any. */
  videoUrl: string | null
}

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
  /** Optional textual visual-style guidance from the composer. */
  visualStyle: string
}

/** Default video state for a board that has never generated. */
export const EMPTY_BOARD_VIDEO_STATE: BoardVideoState = {
  error: null,
  isGenerating: false,
  videoUrl: null,
}

/** Empty prompt source used before the first sync. */
export const EMPTY_VIDEO_PROMPT_SOURCE: VideoPromptSource = {
  characterImageCount: 0,
  characterNotes: [],
  scenes: [],
  visualStyle: "",
}

/**
 * Character reference image files from the floating composer.
 * Held in memory only — not persisted. Read at Generate Video time.
 */
export const composerCharacterImageFilesAtom = atom<File[]>([])

/**
 * Textual visual-style description from the floating composer.
 * Held in memory only — not persisted. Read at scene-edit time.
 */
export const composerVisualStyleAtom = atom("")

/**
 * Per-board Seedance generation state (session-only).
 * Results are keyed by board id so switching boards does not block or
 * overwrite another board’s in-flight generation.
 */
export const videoGenerationByBoardIdAtom = atom<
  Record<string, BoardVideoState>
>({})

/** Writable source for the derived Seedance video prompt. */
export const videoPromptSourceAtom = atom<VideoPromptSource>(
  EMPTY_VIDEO_PROMPT_SOURCE
)

/** Derived Seedance 2.0 prompt that updates whenever the source changes. */
export const seedanceVideoPromptAtom = atom((get) => {
  const source = get(videoPromptSourceAtom)

  return buildSeedanceVideoPrompt(source)
})

/**
 * Records a successful generation for a board.
 * No-ops when the board entry was removed (e.g. board deleted mid-flight).
 */
export function completeBoardVideoGeneration(
  boardId: string,
  map: Record<string, BoardVideoState>,
  videoUrl: string
): Record<string, BoardVideoState> {
  if (!(boardId in map)) {
    return map
  }

  return {
    ...map,
    [boardId]: {
      error: null,
      isGenerating: false,
      videoUrl,
    },
  }
}

/**
 * Records a failed generation for a board.
 * No-ops when the board entry was removed (e.g. board deleted mid-flight).
 */
export function failBoardVideoGeneration(
  boardId: string,
  error: string,
  map: Record<string, BoardVideoState>
): Record<string, BoardVideoState> {
  if (!(boardId in map)) {
    return map
  }

  return {
    ...map,
    [boardId]: {
      error,
      isGenerating: false,
      videoUrl: map[boardId]?.videoUrl ?? null,
    },
  }
}

/**
 * Returns the video state for a board, or {@link EMPTY_BOARD_VIDEO_STATE}
 * when that board has never generated.
 */
export function getBoardVideoState(
  boardId: string,
  map: Record<string, BoardVideoState>
): BoardVideoState {
  return map[boardId] ?? EMPTY_BOARD_VIDEO_STATE
}

/**
 * Drops a board’s video state (e.g. on delete).
 * In-flight completions for that id then no-op via the complete/fail helpers.
 */
export function removeBoardVideoState(
  boardId: string,
  map: Record<string, BoardVideoState>
): Record<string, BoardVideoState> {
  if (!(boardId in map)) {
    return map
  }

  const next = { ...map }
  delete next[boardId]

  return next
}

/**
 * Marks a board as generating and clears its error.
 * Preserves any previous video URL until a new one succeeds.
 */
export function startBoardVideoGeneration(
  boardId: string,
  map: Record<string, BoardVideoState>
): Record<string, BoardVideoState> {
  return {
    ...map,
    [boardId]: {
      error: null,
      isGenerating: true,
      videoUrl: map[boardId]?.videoUrl ?? null,
    },
  }
}
