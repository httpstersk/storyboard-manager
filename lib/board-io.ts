/**
 * Board file input/output: JSON export, JSON import parsing, and PNG
 * capture of the scene grid.
 */

import type { Board } from "@/lib/storyboard"
import { coerceBoard } from "@/lib/validation"

/** Version written into exported board files. */
const BOARD_FILE_VERSION = 1

/** Result of parsing an imported board file. */
export type BoardImportResult =
  | { board: Board; ok: true }
  | { error: string; ok: false }

/** Turns a board title into a safe file name stem, e.g. "night-chase". */
function fileStem(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug === "" ? "storyboard" : slug
}

/** Triggers a browser download of the given blob. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")

  anchor.download = filename
  anchor.href = url
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Downloads the given board as a versioned JSON file.
 */
export function exportBoardJson(board: Board): void {
  const payload = {
    scenes: board.scenes,
    title: board.title,
    version: BOARD_FILE_VERSION,
  }
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  })

  downloadBlob(blob, `${fileStem(board.title)}.json`)
}

/**
 * Parses and validates the text of an imported board file. The imported
 * board always receives the given fresh id.
 */
export function parseBoardFile(text: string, boardId: string): BoardImportResult {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    return { error: "This file is not valid JSON.", ok: false }
  }

  const board = coerceBoard(parsed, boardId)

  if (board === null) {
    return {
      error: "This file does not contain a valid storyboard.",
      ok: false,
    }
  }

  return { board: { ...board, id: boardId, updatedAt: Date.now() }, ok: true }
}

/**
 * Captures the given element as a PNG and downloads it. Shader
 * thumbnails are WebGL canvases and may capture blank on some browsers.
 */
export async function exportNodePng(
  node: HTMLElement,
  title: string
): Promise<void> {
  const { toPng } = await import("html-to-image")
  const dataUrl = await toPng(node, { pixelRatio: 2 })
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  downloadBlob(blob, `${fileStem(title)}.png`)
}
