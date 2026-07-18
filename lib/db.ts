/**
 * Dexie IndexedDB schema for the storyboard studio.
 *
 * Boards store scene parameters without image bytes. Scene frames live in
 * `sceneImages` and composer reference uploads in `referenceImages` as
 * Blobs so large binary payloads do not hit localStorage quotas.
 */

import Dexie, { type EntityTable } from "dexie"

import type { CharacterNote } from "@/lib/board-composer"
import type { Scene, SceneShaderPreset, ShotSize } from "@/lib/storyboard"

/** Scene record persisted without an embedded image data URL. */
export interface StoredScene {
  /** What happens on screen during the scene. */
  action: string
  /** Camera body used for the scene. */
  camera: string
  /** Spoken dialogue, empty when the scene is silent. */
  dialogue: string
  /** Stable identifier for the scene. */
  id: string
  /** Lens mounted for the scene. */
  lens: string
  /** Lighting condition of the scene. */
  lighting: string
  /** Camera movement during the scene. */
  movement: string
  /** Music or sound design note for the scene. */
  music: string
  /** Animated shader preset rendered behind the scene numeral. */
  shader: SceneShaderPreset
  /** Shot size of the scene. */
  shot: ShotSize
  /** Duration of the scene in seconds. */
  timeSeconds: number
}

/** Board record stored in IndexedDB (binary uploads live in blob tables). */
export interface StoredBoardRecord {
  /** Written character definitions of the board's composer draft. */
  characterNotes: CharacterNote[]
  /** Stable identifier for the board. */
  id: string
  /** Scenes of the board, in order, without image data URLs. */
  scenes: StoredScene[]
  /** Display title of the board. */
  title: string
  /** Epoch milliseconds of the last edit. */
  updatedAt: number
  /** Textual visual-style description of the board's composer draft. */
  visualStyle: string
}

/** Binary image attached to a scene. */
export interface StoredSceneImage {
  /** Owning board id (for cascade deletes and compound uniqueness). */
  boardId: string
  /** Image bytes (typically PNG or JPEG). */
  blob: Blob
  /**
   * Primary key: `${boardId}::${sceneId}` so scene ids that repeat across
   * boards (e.g. `scene-01`) never collide.
   */
  id: string
  /** MIME type recorded when the Blob was written. */
  mimeType: string
  /** Scene id within the board. */
  sceneId: string
}

/** Attachment slot a composer reference upload belongs to. */
export type ReferenceImageKind = "character" | "style"

/** Composer reference upload attached to a board. */
export interface StoredReferenceImage {
  /** Image bytes as uploaded. */
  blob: Blob
  /** Owning board id (for cascade deletes). */
  boardId: string
  /**
   * Primary key: `${boardId}::${kind}::${index}` so uploads stay unique
   * per board and attachment slot.
   */
  id: string
  /** Position of the upload within its attachment group. */
  index: number
  /** Whether the upload is a character or visual-style reference. */
  kind: ReferenceImageKind
  /** MIME type recorded when the Blob was written. */
  mimeType: string
  /** Original file name, used to rebuild the `File` on load. */
  name: string
}

/** Singleton workspace UI preferences and selection. */
export interface WorkspaceMetaRecord {
  /** Board ids in sidebar order. */
  boardOrder: string[]
  /** Grid column count for the open board. */
  columns: number
  /** Fixed primary key for the singleton settings row. */
  id: "settings"
  /** Grid row count for the open board. */
  rows: number
  /** Id of the currently open board. */
  selectedBoardId: string
  /** Whether the board sidebar is collapsed. */
  sidebarCollapsed: boolean
}

/** Dexie database holding boards, blob uploads, and workspace meta. */
const db = new Dexie("storyboard-studio") as Dexie & {
  boards: EntityTable<StoredBoardRecord, "id">
  referenceImages: EntityTable<StoredReferenceImage, "id">
  sceneImages: EntityTable<StoredSceneImage, "id">
  workspaceMeta: EntityTable<WorkspaceMetaRecord, "id">
}

db.version(1).stores({
  boards: "id, updatedAt, title",
  sceneImages: "id, boardId, sceneId",
  workspaceMeta: "id",
})

// v2 adds composer reference uploads. Existing board records simply lack
// the new draft fields and are defaulted during load-time coercion.
db.version(2).stores({
  referenceImages: "id, boardId",
})

export { db }

/**
 * Builds the primary key for a composer reference upload row.
 */
export function referenceImageId(
  boardId: string,
  kind: ReferenceImageKind,
  index: number
): string {
  return `${boardId}::${kind}::${index}`
}

/**
 * Builds the primary key for a scene image row.
 */
export function sceneImageId(boardId: string, sceneId: string): string {
  return `${boardId}::${sceneId}`
}

/**
 * Strips the optional `image` field from a scene for IndexedDB storage.
 */
export function toStoredScene({ image: _image, ...rest }: Scene): StoredScene {
  return rest
}
