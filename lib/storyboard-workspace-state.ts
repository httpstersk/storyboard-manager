import type { StoredWorkspace } from "@/lib/persistence"
import {
  type Board,
  COLUMN_LIMITS,
  createBlankBoard,
  DEFAULT_ROWS,
  ROW_LIMITS,
  type Scene,
  UNTITLED_BOARD_TITLE,
} from "@/lib/storyboard"
import { clampInteger } from "@/lib/validation"

/** Workspace UI and board collection state. */
export interface WorkspaceState {
  boards: Board[]
  columns: number
  /** Board pending delete confirmation, or null when none is pending. */
  deleteRequestBoardId: string | null
  editingSceneId: string | null
  hydrated: boolean
  ioError: string | null
  /** Whether the prompt composer currently holds focus. */
  isComposerActive: boolean
  isGenerating: boolean
  /** Reference time for relative "edited" labels, refreshed per action. */
  now: number
  query: string
  rows: number
  selectedBoardId: string
  showParameters: boolean
  sidebarCollapsed: boolean
}

export type WorkspaceAction =
  | { board: Board; type: "addBoard" }
  | { boardId: string; type: "deleteBoard" }
  | { boardId: string; title: string; type: "renameBoard" }
  | { boardId: string; type: "selectBoard" }
  | { columns: number; type: "setColumns" }
  | { boardId: string | null; type: "setDeleteRequest" }
  | { isComposerActive: boolean; type: "setComposerActive" }
  | { error: string | null; type: "setIoError" }
  | { isGenerating: boolean; type: "setIsGenerating" }
  | { query: string; type: "setQuery" }
  | { rows: number; type: "setRows" }
  | { sceneId: string | null; type: "setEditingScene" }
  | { showParameters: boolean; type: "setShowParameters" }
  | { collapsed: boolean; type: "setSidebarCollapsed" }
  | { patch: Partial<Scene>; sceneId: string; type: "updateScene" }
  | { type: "hydrate"; workspace: StoredWorkspace | null }

/** Reducer backing the storyboard workspace shell. */
export function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  const now = Date.now()

  switch (action.type) {
    case "addBoard":
      return {
        ...state,
        boards: [action.board, ...state.boards],
        ioError: null,
        now,
        selectedBoardId: action.board.id,
      }
    case "deleteBoard": {
      if (state.boards.length <= 1) {
        return state
      }

      const remainingBoards = state.boards.filter(
        (board) => board.id !== action.boardId
      )

      return {
        ...state,
        boards: remainingBoards,
        deleteRequestBoardId:
          state.deleteRequestBoardId === action.boardId
            ? null
            : state.deleteRequestBoardId,
        now,
        selectedBoardId:
          state.selectedBoardId === action.boardId
            ? remainingBoards[0].id
            : state.selectedBoardId,
      }
    }
    case "hydrate":
      return action.workspace === null
        ? { ...state, hydrated: true, now }
        : {
            ...state,
            boards: action.workspace.boards,
            columns: clampInteger(action.workspace.columns, COLUMN_LIMITS),
            hydrated: true,
            now,
            rows: clampInteger(action.workspace.rows, ROW_LIMITS),
            selectedBoardId: action.workspace.selectedBoardId,
            sidebarCollapsed: action.workspace.sidebarCollapsed,
          }
    case "renameBoard":
      return {
        ...state,
        boards: state.boards.map((board) =>
          board.id === action.boardId
            ? { ...board, title: action.title, updatedAt: now }
            : board
        ),
        now,
      }
    case "selectBoard":
      return {
        ...state,
        editingSceneId: null,
        selectedBoardId: action.boardId,
      }
    case "setColumns":
      return { ...state, columns: clampInteger(action.columns, COLUMN_LIMITS) }
    case "setDeleteRequest":
      return { ...state, deleteRequestBoardId: action.boardId }
    case "setComposerActive":
      return { ...state, isComposerActive: action.isComposerActive }
    case "setEditingScene":
      return { ...state, editingSceneId: action.sceneId }
    case "setIoError":
      return { ...state, ioError: action.error }
    case "setIsGenerating":
      return { ...state, isGenerating: action.isGenerating }
    case "setQuery":
      return { ...state, query: action.query }
    case "setRows":
      return { ...state, rows: clampInteger(action.rows, ROW_LIMITS) }
    case "setShowParameters":
      return { ...state, showParameters: action.showParameters }
    case "setSidebarCollapsed":
      return { ...state, sidebarCollapsed: action.collapsed }
    case "updateScene":
      return {
        ...state,
        boards: state.boards.map((board) =>
          board.id === state.selectedBoardId
            ? {
                ...board,
                scenes: board.scenes.map((scene) =>
                  scene.id === action.sceneId
                    ? { ...scene, ...action.patch }
                    : scene
                ),
                updatedAt: now,
              }
            : board
        ),
        now,
      }
  }
}

/** Creates the default workspace state before hydration. */
export function createInitialWorkspaceState(): WorkspaceState {
  const board = createBlankBoard("board-1", UNTITLED_BOARD_TITLE)

  return {
    boards: [board],
    columns: COLUMN_LIMITS.max - 1,
    deleteRequestBoardId: null,
    editingSceneId: null,
    hydrated: false,
    ioError: null,
    isComposerActive: false,
    isGenerating: false,
    now: board.updatedAt,
    query: "",
    rows: DEFAULT_ROWS,
    selectedBoardId: board.id,
    showParameters: true,
    sidebarCollapsed: true,
  }
}

/** Creates a unique board identifier for newly added boards. */
export function createBoardId(): string {
  return crypto.randomUUID()
}
