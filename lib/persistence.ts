/**
 * IndexedDB persistence for the storyboard workspace via Dexie.
 *
 * Boards and scene parameters are stored as structured records. Scene
 * images are stored as Blobs. On load, Blobs are converted back to data
 * URLs for in-memory UI. Untrusted payloads are re-validated through
 * `lib/validation.ts`.
 */

import {
  db,
  sceneImageId,
  type StoredBoardRecord,
  type StoredSceneImage,
  toStoredScene,
  type WorkspaceMetaRecord,
} from "@/lib/db"
import { blobToDataUrl, dataUrlToBlob } from "@/lib/image-data"
import {
  type Board,
  COLUMN_LIMITS,
  DEFAULT_ROWS,
  ROW_LIMITS,
} from "@/lib/storyboard"
import { clampInteger, coerceBoard } from "@/lib/validation"

/** Legacy localStorage key used before IndexedDB migration. */
const LEGACY_STORAGE_KEY = "storyboard-studio:v1"

/** Autosave debounce interval in milliseconds. */
export const WORKSPACE_SAVE_DEBOUNCE_MS = 300

/** Workspace snapshot persisted across reloads. */
export interface StoredWorkspace {
  /** All boards, in sidebar order. */
  boards: Board[]
  /** Grid column count for the open board. */
  columns: number
  /** Grid row count for the open board. */
  rows: number
  /** Id of the currently open board. */
  selectedBoardId: string
  /** Whether the board sidebar is collapsed. */
  sidebarCollapsed: boolean
}

/**
 * Loads the persisted workspace, migrating from localStorage once when
 * IndexedDB is empty. Returns null when nothing usable is stored.
 */
export async function loadStoredWorkspace(): Promise<StoredWorkspace | null> {
  if (typeof window === "undefined") {
    return null
  }

  try {
    await migrateLegacyLocalStorageIfNeeded()

    const boardCount = await db.boards.count()

    if (boardCount === 0) {
      return null
    }

    const [boardRecords, imageRecords, meta] = await Promise.all([
      db.boards.toArray(),
      db.sceneImages.toArray(),
      db.workspaceMeta.get("settings"),
    ])

    const imagesByKey = new Map(
      imageRecords.map((record) => [record.id, record] as const)
    )

    const boardsWithImages = await Promise.all(
      boardRecords.map(async (record) => {
        const scenes = await Promise.all(
          record.scenes.map(async (scene) => {
            const imageRecord = imagesByKey.get(
              sceneImageId(record.id, scene.id)
            )
            const image =
              imageRecord === undefined
                ? undefined
                : await blobToDataUrl(imageRecord.blob, imageRecord.mimeType)

            return image === undefined ? scene : { ...scene, image }
          })
        )

        return { ...record, scenes }
      })
    )

    const boardsById = new Map(
      boardsWithImages
        .map((board, index) => coerceBoard(board, `board-${index + 1}`))
        .filter((board): board is Board => board !== null)
        .map((board) => [board.id, board] as const)
    )

    if (boardsById.size === 0) {
      return null
    }

    const orderedIds =
      meta?.boardOrder?.filter((id) => boardsById.has(id)) ?? []
    const orderedIdSet = new Set(orderedIds)
    const missingIds = [...boardsById.keys()].filter(
      (id) => !orderedIdSet.has(id)
    )
    const boards = [...orderedIds, ...missingIds].map(
      (id) => boardsById.get(id) as Board
    )

    const selectedBoardId = boards.some(
      (board) => board.id === meta?.selectedBoardId
    )
      ? (meta?.selectedBoardId as string)
      : boards[0].id

    return {
      boards,
      columns: clampInteger(
        meta?.columns ?? COLUMN_LIMITS.max - 1,
        COLUMN_LIMITS
      ),
      rows: clampInteger(meta?.rows ?? DEFAULT_ROWS, ROW_LIMITS),
      selectedBoardId,
      sidebarCollapsed: meta?.sidebarCollapsed ?? true,
    }
  } catch (error) {
    console.error("Failed to load workspace from IndexedDB", error)
    return null
  }
}

/**
 * Persists the workspace to IndexedDB: board metadata, scene image Blobs,
 * and UI layout preferences. Throws when IndexedDB is unavailable.
 */
export async function saveStoredWorkspace(
  workspace: StoredWorkspace
): Promise<void> {
  if (typeof window === "undefined") {
    return
  }

  const boardRecords: StoredBoardRecord[] = workspace.boards.map((board) => ({
    id: board.id,
    scenes: board.scenes.map(toStoredScene),
    title: board.title,
    updatedAt: board.updatedAt,
  }))

  const nextImageIds = new Set<string>()
  const imageRecords: StoredSceneImage[] = []

  for (const board of workspace.boards) {
    for (const scene of board.scenes) {
      if (scene.image === undefined || scene.image === "") {
        continue
      }

      const blob = dataUrlToBlob(scene.image)

      if (blob === null) {
        continue
      }

      const id = sceneImageId(board.id, scene.id)

      nextImageIds.add(id)
      imageRecords.push({
        boardId: board.id,
        blob,
        id,
        mimeType: blob.type || "image/png",
        sceneId: scene.id,
      })
    }
  }

  const meta: WorkspaceMetaRecord = {
    boardOrder: workspace.boards.map((board) => board.id),
    columns: workspace.columns,
    id: "settings",
    rows: workspace.rows,
    selectedBoardId: workspace.selectedBoardId,
    sidebarCollapsed: workspace.sidebarCollapsed,
  }

  await db.transaction(
    "rw",
    db.boards,
    db.sceneImages,
    db.workspaceMeta,
    async () => {
      const nextBoardIds = new Set(
        workspace.boards.map((board) => board.id)
      )
      const existingBoardIds = await db.boards.toCollection().primaryKeys()
      const boardsToDelete = existingBoardIds.filter(
        (id) => !nextBoardIds.has(id)
      )

      if (boardsToDelete.length > 0) {
        await db.boards.bulkDelete(boardsToDelete)
        await db.sceneImages.where("boardId").anyOf(boardsToDelete).delete()
      }

      await db.boards.bulkPut(boardRecords)

      const existingImageIds = await db.sceneImages.toCollection().primaryKeys()
      const imagesToDelete = existingImageIds.filter(
        (id) => !nextImageIds.has(id)
      )

      if (imagesToDelete.length > 0) {
        await db.sceneImages.bulkDelete(imagesToDelete)
      }

      if (imageRecords.length > 0) {
        await db.sceneImages.bulkPut(imageRecords)
      }

      await db.workspaceMeta.put(meta)
    }
  )
}

/**
 * Imports legacy localStorage workspace into IndexedDB when IndexedDB has
 * no boards yet, then removes the legacy key.
 */
async function migrateLegacyLocalStorageIfNeeded(): Promise<void> {
  const boardCount = await db.boards.count()

  if (boardCount > 0) {
    return
  }

  const raw = window.localStorage.getItem(LEGACY_STORAGE_KEY)

  if (raw === null) {
    return
  }

  try {
    const parsed: unknown = JSON.parse(raw)

    if (
      typeof parsed !== "object" ||
      parsed === null ||
      !Array.isArray((parsed as { boards?: unknown }).boards)
    ) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
      return
    }

    const boards = (parsed as { boards: unknown[] }).boards
      .map((board, index) => coerceBoard(board, `board-${index + 1}`))
      .filter((board): board is Board => board !== null)

    if (boards.length === 0) {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY)
      return
    }

    const storedId = (parsed as { selectedBoardId?: unknown }).selectedBoardId
    const selectedBoardId = boards.some((board) => board.id === storedId)
      ? (storedId as string)
      : boards[0].id

    await saveStoredWorkspace({
      boards,
      columns: COLUMN_LIMITS.max - 1,
      rows: DEFAULT_ROWS,
      selectedBoardId,
      sidebarCollapsed: true,
    })
  } catch (error) {
    console.error("Failed to migrate localStorage workspace", error)
  } finally {
    window.localStorage.removeItem(LEGACY_STORAGE_KEY)
  }
}
