/**
 * Board file input/output: JSON export, JSON import parsing, and PNG
 * capture of the scene grid.
 */

import type { Board } from "@/lib/storyboard"
import { coerceBoard } from "@/lib/validation"

/** Version written into exported board files (v3 adds composer fields). */
const BOARD_FILE_VERSION = 3

/** Result of parsing an imported board file. */
export type BoardImportResult =
  | { board: Board; ok: true }
  | { error: string; ok: false }

/** Optional fields included alongside the board in a JSON export. */
export interface BoardJsonExportOptions {
  /**
   * Seedance video prompt derived from the current scenes and character
   * notes. Empty string when the board has no scenes.
   */
  videoPrompt?: string
}

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
 * Downloads the given board as a versioned JSON file. Scene `shader`
 * presets are omitted — they are UI-only empty-state gradients and are
 * restored to defaults on import when missing. Composer uploads are
 * binary and stay out of exports; written character notes and the
 * visual style travel with the file. Includes the Seedance video
 * prompt when provided.
 */
export function exportBoardJson(
  board: Board,
  options: BoardJsonExportOptions = {}
): void {
  const payload = {
    characterNotes: board.composer.characterNotes,
    scenes: board.scenes.map(({ shader: _shader, ...scene }) => scene),
    title: board.title,
    version: BOARD_FILE_VERSION,
    videoPrompt: options.videoPrompt ?? "",
    visualStyle: board.composer.visualStyle,
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
 * Resolved `toPng` reference — cached after the first successful import so
 * all subsequent captures bypass the dynamic-import overhead.
 */
let cachedToPng: ((node: HTMLElement, options?: object) => Promise<string>) | null = null

/**
 * Minimum length of a plausible PNG data URL (header + tiny payload).
 * Empty captures from html-to-image return `"data:,"` (length 6).
 */
const MIN_PNG_DATA_URL_LENGTH = 32

/** Returns whether the string is a non-empty PNG data URL. */
function isValidPngDataUrl(dataUrl: string): boolean {
  return (
    dataUrl.startsWith("data:image/png") &&
    dataUrl.length >= MIN_PNG_DATA_URL_LENGTH
  )
}

/**
 * Captures the given element as a PNG data URL.
 *
 * `toPng` is called twice deliberately: html-to-image renders the DOM
 * inside an SVG `foreignObject` and loads embedded images asynchronously.
 * On the first pass the browser has not yet cached the data-URL images,
 * so the first scene's image draws blank. The second pass finds every
 * image already in the browser's internal cache and captures them all.
 *
 * If the node is unmounted between passes (board switch / AnimatePresence),
 * the second pass returns an empty `"data:,"` URL — fall back to the first
 * valid pass instead of downloading a blank file.
 */
export async function captureNodePngDataUrl(node: HTMLElement): Promise<string> {
  if (cachedToPng === null) {
    const module = await import("html-to-image")
    cachedToPng = module.toPng
  }

  const toPng = cachedToPng
  const options = { pixelRatio: 2 }

  // Prime the browser's image cache so all data-URL images are ready.
  const primed = await toPng(node, options)

  // Board switches unmount the capture target; a second pass then yields
  // an empty data URL. Prefer the primed frame over a blank download.
  if (!node.isConnected) {
    if (isValidPngDataUrl(primed)) {
      return primed
    }

    throw new Error("The storyboard grid was unmounted during capture.")
  }

  const result = await toPng(node, options)

  if (isValidPngDataUrl(result)) {
    return result
  }

  if (isValidPngDataUrl(primed)) {
    return primed
  }

  throw new Error("PNG capture produced an empty image.")
}

/**
 * Captures the given element as a PNG and downloads it. Shader
 * thumbnails are WebGL canvases and may capture blank on some browsers.
 */
export async function exportNodePng(
  node: HTMLElement,
  title: string
): Promise<void> {
  const dataUrl = await captureNodePngDataUrl(node)
  const response = await fetch(dataUrl)
  const blob = await response.blob()

  if (blob.size === 0 || !blob.type.startsWith("image/")) {
    throw new Error("PNG capture produced an empty image.")
  }

  downloadBlob(blob, `${fileStem(title)}.png`)
}
