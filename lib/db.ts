/**
 * Dexie IndexedDB schema for the storyboard studio.
 *
 * Boards store scene parameters without image bytes. Scene frames live in
 * `sceneImages` as Blobs so large generated contact sheets do not hit
 * localStorage quotas.
 */

import Dexie, { type EntityTable } from "dexie"

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

/** Board record stored in IndexedDB (images live in `sceneImages`). */
export interface StoredBoardRecord {
  /** Stable identifier for the board. */
  id: string
  /** Scenes of the board, in order, without image data URLs. */
  scenes: StoredScene[]
  /** Display title of the board. */
  title: string
  /** Epoch milliseconds of the last edit. */
  updatedAt: number
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

/** Dexie database holding boards, scene images, and workspace meta. */
const db = new Dexie("storyboard-studio") as Dexie & {
  boards: EntityTable<StoredBoardRecord, "id">
  sceneImages: EntityTable<StoredSceneImage, "id">
  workspaceMeta: EntityTable<WorkspaceMetaRecord, "id">
}

db.version(1).stores({
  boards: "id, updatedAt, title",
  sceneImages: "id, boardId, sceneId",
  workspaceMeta: "id",
})

export { db }

/**
 * Builds the primary key for a scene image row.
 */
export function sceneImageId(boardId: string, sceneId: string): string {
  return `${boardId}::${sceneId}`
}

/**
 * Strips the optional `image` field from a scene for IndexedDB storage.
 */
export function toStoredScene(scene: Scene): StoredScene {
  return {
    action: scene.action,
    camera: scene.camera,
    dialogue: scene.dialogue,
    id: scene.id,
    lens: scene.lens,
    lighting: scene.lighting,
    movement: scene.movement,
    music: scene.music,
    shader: scene.shader,
    shot: scene.shot,
    timeSeconds: scene.timeSeconds,
  }
}
