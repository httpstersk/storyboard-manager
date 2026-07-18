import type { BoardComposerDraft } from "@/lib/board-composer"
import type { StoredWorkspace } from "@/lib/persistence"
import {
  type Board,
  COLUMN_LIMITS,
  createBlankBoard,
  DEFAULT_ROWS,
  ROW_LIMITS,
  type Scene,
  snapToClosestPreset,
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
  /** Ids of placeholder boards whose generation is still in flight. */
  generatingBoardIds: string[]
  hydrated: boolean
  ioError: string | null
  /** Whether the prompt composer currently holds focus. */
  isComposerActive: boolean
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
  | { board: Board; columns: number; rows: number; type: "completeGeneration" }
  | { boardId: string; type: "deleteBoard" }
  | { boardId: string; error: string; type: "failGeneration" }
  | { boardId: string; title: string; type: "renameBoard" }
  | { boardId: string; type: "selectBoard" }
  | { columns: number; rows: number; type: "setGrid" }
  | { columns: number; type: "setColumns" }
  | { boardId: string | null; type: "setDeleteRequest" }
  | { isComposerActive: boolean; type: "setComposerActive" }
  | { error: string | null; type: "setIoError" }
  | { query: string; type: "setQuery" }
  | { board: Board; type: "startGeneration" }
  | { rows: number; type: "setRows" }
  | { sceneId: string | null; type: "setEditingScene" }
  | { showParameters: boolean; type: "setShowParameters" }
  | { collapsed: boolean; type: "setSidebarCollapsed" }
  | { patch: Partial<BoardComposerDraft>; type: "updateBoardComposer" }
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
    case "completeGeneration": {
      const generatingBoardIds = state.generatingBoardIds.filter(
        (id) => id !== action.board.id
      )

      // The placeholder may have been deleted mid-flight; drop the result.
      if (!state.boards.some((board) => board.id === action.board.id)) {
        return { ...state, generatingBoardIds, now }
      }

      const isSelected = state.selectedBoardId === action.board.id

      return {
        ...state,
        boards: state.boards.map((board) =>
          board.id === action.board.id ? action.board : board
        ),
        columns: isSelected
          ? clampInteger(action.columns, COLUMN_LIMITS)
          : state.columns,
        generatingBoardIds,
        now,
        rows: isSelected ? clampInteger(action.rows, ROW_LIMITS) : state.rows,
      }
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
        generatingBoardIds: state.generatingBoardIds.filter(
          (id) => id !== action.boardId
        ),
        now,
        selectedBoardId:
          state.selectedBoardId === action.boardId
            ? remainingBoards[0].id
            : state.selectedBoardId,
      }
    }
    case "failGeneration": {
      const generatingBoardIds = state.generatingBoardIds.filter(
        (id) => id !== action.boardId
      )
      const remainingBoards = state.boards.filter(
        (board) => board.id !== action.boardId
      )

      // The placeholder may have been deleted mid-flight, and the last
      // remaining board is never removed.
      if (remainingBoards.length === 0 ||
        remainingBoards.length === state.boards.length) {
        return { ...state, generatingBoardIds, ioError: action.error, now }
      }

      return {
        ...state,
        boards: remainingBoards,
        deleteRequestBoardId:
          state.deleteRequestBoardId === action.boardId
            ? null
            : state.deleteRequestBoardId,
        generatingBoardIds,
        ioError: action.error,
        now,
        selectedBoardId:
          state.selectedBoardId === action.boardId
            ? remainingBoards[0].id
            : state.selectedBoardId,
      }
    }
    case "hydrate": {
      if (action.workspace === null) {
        return { ...state, hydrated: true, now }
      }

      // Clamp first, then snap — stale values from before the preset
      // constraint was introduced are nudged to the nearest valid combo.
      const hydratedColumns = clampInteger(
        action.workspace.columns,
        COLUMN_LIMITS
      )
      const hydratedRows = clampInteger(action.workspace.rows, ROW_LIMITS)
      const snapped = snapToClosestPreset(hydratedColumns, hydratedRows)

      return {
        ...state,
        boards: action.workspace.boards,
        columns: snapped.columns,
        hydrated: true,
        now,
        rows: snapped.rows,
        selectedBoardId: action.workspace.selectedBoardId,
        sidebarCollapsed: action.workspace.sidebarCollapsed,
      }
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
    case "setGrid":
      return {
        ...state,
        columns: clampInteger(action.columns, COLUMN_LIMITS),
        rows: clampInteger(action.rows, ROW_LIMITS),
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
    case "setQuery":
      return { ...state, query: action.query }
    case "setRows":
      return { ...state, rows: clampInteger(action.rows, ROW_LIMITS) }
    case "setShowParameters":
      return { ...state, showParameters: action.showParameters }
    case "setSidebarCollapsed":
      return { ...state, sidebarCollapsed: action.collapsed }
    case "startGeneration":
      return {
        ...state,
        boards: [action.board, ...state.boards],
        generatingBoardIds: [...state.generatingBoardIds, action.board.id],
        ioError: null,
        now,
        selectedBoardId: action.board.id,
      }
    case "updateBoardComposer":
      return {
        ...state,
        boards: state.boards.map((board) =>
          board.id === state.selectedBoardId
            ? {
                ...board,
                composer: { ...board.composer, ...action.patch },
                updatedAt: now,
              }
            : board
        ),
        now,
      }
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
    generatingBoardIds: [],
    hydrated: false,
    ioError: null,
    isComposerActive: false,
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
