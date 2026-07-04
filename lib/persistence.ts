/**
 * localStorage persistence for the storyboard workspace.
 *
 * Stored payloads are treated as untrusted and re-validated through the
 * guards in `lib/validation.ts` on every load.
 */

import type { Board } from "@/lib/storyboard"
import { coerceBoard } from "@/lib/validation"

/** Versioned key under which the workspace is stored. */
const STORAGE_KEY = "storyboard-studio:v1"

/** Workspace snapshot persisted across reloads. */
export interface StoredWorkspace {
  /** All boards, in sidebar order. */
  boards: Board[]
  /** Id of the currently open board. */
  selectedBoardId: string
}

/**
 * Loads the persisted workspace, or null when nothing usable is stored.
 */
export function loadStoredWorkspace(): StoredWorkspace | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)

    if (raw === null) {
      return null
    }

    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { boards?: unknown }).boards)
    ) {
      return null
    }

    const boards = (parsed as { boards: unknown[] }).boards
      .map((board, index) => coerceBoard(board, `board-${index + 1}`))
      .filter((board): board is Board => board !== null)

    if (boards.length === 0) {
      return null
    }

    const storedId = (parsed as { selectedBoardId?: unknown }).selectedBoardId
    const selectedBoardId = boards.some((board) => board.id === storedId)
      ? (storedId as string)
      : boards[0].id

    return { boards, selectedBoardId }
  } catch {
    return null
  }
}

/**
 * Persists the workspace. When the payload exceeds the storage quota
 * (typically because of large reference images), it retries once with
 * all images stripped so board data itself is never lost.
 */
export function saveStoredWorkspace(workspace: StoredWorkspace): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  } catch {
    try {
      const withoutImages: StoredWorkspace = {
        ...workspace,
        boards: workspace.boards.map((board) => ({
          ...board,
          scenes: board.scenes.map((scene) => ({
            ...scene,
            image: undefined,
          })),
        })),
      }

      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withoutImages))
    } catch {
      // Storage unavailable (private mode, disabled); boards stay in memory.
    }
  }
}
