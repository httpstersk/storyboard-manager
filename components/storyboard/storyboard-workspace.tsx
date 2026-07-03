"use client"

import { Download, Upload } from "lucide-react"
import * as React from "react"

import { Sidebar } from "@/components/storyboard/app-sidebar"
import { BoardStatusBar } from "@/components/storyboard/board-status-bar"
import { BoardToolbar } from "@/components/storyboard/board-toolbar"
import { EditSceneDialog } from "@/components/storyboard/edit-scene-dialog"
import { SceneGrid } from "@/components/storyboard/scene-grid"
import { Field } from "@/components/ui/field"
import { Stepper } from "@/components/ui/stepper"
import { Switch } from "@/components/ui/switch"
import { exportBoardJson, exportNodePng, parseBoardFile } from "@/lib/board-io"
import {
  loadStoredWorkspace,
  saveStoredWorkspace,
  type StoredWorkspace,
} from "@/lib/persistence"
import {
  type Board,
  COLUMN_LIMITS,
  createBlankBoard,
  formatEditedAt,
  formatSceneNumber,
  formatSeconds,
  nextUntitledBoardTitle,
  ROW_LIMITS,
  type Scene,
  totalRuntimeSeconds,
  UNTITLED_BOARD_TITLE,
} from "@/lib/storyboard"
import { clampInteger } from "@/lib/validation"

interface WorkspaceState {
  boards: Board[]
  columns: number
  editingSceneId: string | null
  hydrated: boolean
  ioError: string | null
  /** Reference time for relative "edited" labels, refreshed per action. */
  now: number
  query: string
  rows: number
  selectedBoardId: string
  showParameters: boolean
  sidebarCollapsed: boolean
}

type WorkspaceAction =
  | { board: Board; type: "addBoard" }
  | { boardId: string; type: "selectBoard" }
  | { columns: number; type: "setColumns" }
  | { error: string | null; type: "setIoError" }
  | { query: string; type: "setQuery" }
  | { rows: number; type: "setRows" }
  | { sceneId: string | null; type: "setEditingScene" }
  | { showParameters: boolean; type: "setShowParameters" }
  | { collapsed: boolean; type: "setSidebarCollapsed" }
  | { patch: Partial<Scene>; sceneId: string; type: "updateScene" }
  | { type: "hydrate"; workspace: StoredWorkspace | null }

function workspaceReducer(
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
    case "hydrate":
      return action.workspace === null
        ? { ...state, hydrated: true, now }
        : {
            ...state,
            boards: action.workspace.boards,
            hydrated: true,
            now,
            selectedBoardId: action.workspace.selectedBoardId,
          }
    case "selectBoard":
      return { ...state, now, selectedBoardId: action.boardId }
    case "setColumns":
      return { ...state, columns: clampInteger(action.columns, COLUMN_LIMITS) }
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

function createInitialState(): WorkspaceState {
  const board = createBlankBoard("board-1", UNTITLED_BOARD_TITLE)

  return {
    boards: [board],
    columns: COLUMN_LIMITS.max,
    editingSceneId: null,
    hydrated: false,
    ioError: null,
    now: board.updatedAt,
    query: "",
    rows: ROW_LIMITS.max,
    selectedBoardId: board.id,
    showParameters: true,
    sidebarCollapsed: false,
  }
}

function createBoardId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `board-${Date.now()}`
}

/**
 * Client-side shell of the storyboard manager: owns all board state and
 * composes the sidebar, toolbar, scene grid, status bar, and scene
 * editor dialog. Boards persist to localStorage after every change.
 */
function StoryboardWorkspace() {
  const [state, dispatch] = React.useReducer(
    workspaceReducer,
    undefined,
    createInitialState
  )
  const gridRef = React.useRef<HTMLElement>(null)
  const importInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    dispatch({ type: "hydrate", workspace: loadStoredWorkspace() })
  }, [])

  React.useEffect(() => {
    if (state.hydrated) {
      saveStoredWorkspace({
        boards: state.boards,
        selectedBoardId: state.selectedBoardId,
      })
    }
  }, [state.boards, state.hydrated, state.selectedBoardId])

  const selectedBoard =
    state.boards.find((board) => board.id === state.selectedBoardId) ??
    state.boards[0]
  const normalizedQuery = state.query.trim().toLowerCase()
  const visibleBoards = state.boards.filter((board) =>
    board.title.toLowerCase().includes(normalizedQuery)
  )
  const editingIndex = selectedBoard.scenes.findIndex(
    (scene) => scene.id === state.editingSceneId
  )
  const editingScene =
    editingIndex === -1 ? null : selectedBoard.scenes[editingIndex]
  const runtime = formatSeconds(totalRuntimeSeconds(selectedBoard.scenes))

  const handleNewBoard = () => {
    dispatch({
      board: createBlankBoard(
        createBoardId(),
        nextUntitledBoardTitle(state.boards)
      ),
      type: "addBoard",
    })
  }

  const handleImportFile = async (file: File) => {
    const result = parseBoardFile(await file.text(), createBoardId())

    if (result.ok) {
      dispatch({ board: result.board, type: "addBoard" })
    } else {
      dispatch({ error: result.error, type: "setIoError" })
    }
  }

  const handleExportPng = async () => {
    if (gridRef.current === null) {
      return
    }

    try {
      await exportNodePng(gridRef.current, selectedBoard.title)
      dispatch({ error: null, type: "setIoError" })
    } catch {
      dispatch({ error: "The PNG export failed.", type: "setIoError" })
    }
  }

  return (
    <div className="flex min-h-svh gap-3.5 bg-surface-app p-4.5">
      {state.sidebarCollapsed ? (
        <Sidebar.Rail
          onExpand={() =>
            dispatch({ collapsed: false, type: "setSidebarCollapsed" })
          }
          onNewBoard={handleNewBoard}
        />
      ) : (
        <Sidebar>
          <Sidebar.Header
            onCollapse={() =>
              dispatch({ collapsed: true, type: "setSidebarCollapsed" })
            }
            title="Storyboards"
          />
          <Sidebar.NewBoardButton onClick={handleNewBoard}>
            New storyboard
          </Sidebar.NewBoardButton>
          <Sidebar.Search
            onQueryChange={(query) => dispatch({ query, type: "setQuery" })}
            query={state.query}
          />
          <Sidebar.Section title="Recent">
            <Sidebar.BoardList>
              {visibleBoards.map((board) => (
                <Sidebar.BoardItem
                  active={board.id === selectedBoard.id}
                  key={board.id}
                  meta={`${board.scenes.length} scenes · ${formatSeconds(totalRuntimeSeconds(board.scenes))} · ${formatEditedAt(board.updatedAt, state.now)}`}
                  onSelect={() =>
                    dispatch({ boardId: board.id, type: "selectBoard" })
                  }
                  title={board.title}
                />
              ))}
            </Sidebar.BoardList>
          </Sidebar.Section>
          <Sidebar.Footer>
            {state.boards.length}{" "}
            {state.boards.length === 1 ? "board" : "boards"} · synced
          </Sidebar.Footer>
        </Sidebar>
      )}
      <main className="flex min-w-0 flex-1 flex-col gap-3.5">
        <BoardToolbar>
          <BoardToolbar.Brand name="boards" version="v1.2" />
          <BoardToolbar.Controls>
            <GridSteppers
              columns={state.columns}
              onColumnsChange={(columns) =>
                dispatch({ columns, type: "setColumns" })
              }
              onRowsChange={(rows) => dispatch({ rows, type: "setRows" })}
              rows={state.rows}
            />
            <Field>
              <Field.Label>Parameters</Field.Label>
              <Field.Control>
                <Switch
                  checked={state.showParameters}
                  onCheckedChange={(showParameters) =>
                    dispatch({ showParameters, type: "setShowParameters" })
                  }
                />
              </Field.Control>
            </Field>
          </BoardToolbar.Controls>
          <BoardToolbar.Actions>
            <BoardToolbar.Action
              onClick={() => importInputRef.current?.click()}
            >
              <Upload aria-hidden />
              Import
            </BoardToolbar.Action>
            <BoardToolbar.Action onClick={() => exportBoardJson(selectedBoard)}>
              <Download aria-hidden />
              JSON
            </BoardToolbar.Action>
            <BoardToolbar.Action onClick={handleExportPng} variant="emphasis">
              <Download aria-hidden />
              PNG
            </BoardToolbar.Action>
            <BoardToolbar.ThemeToggle />
          </BoardToolbar.Actions>
        </BoardToolbar>
        <input
          accept="application/json,.json"
          aria-label="Import storyboard file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]

            if (file) {
              void handleImportFile(file)
            }

            event.target.value = ""
          }}
          ref={importInputRef}
          type="file"
        />
        <SceneGrid
          columns={state.columns}
          onEditScene={(sceneId) =>
            dispatch({ sceneId, type: "setEditingScene" })
          }
          onUpdateScene={(sceneId, patch) =>
            dispatch({ patch, sceneId, type: "updateScene" })
          }
          ref={gridRef}
          rows={state.rows}
          scenes={selectedBoard.scenes}
          showParameters={state.showParameters}
        />
        <BoardStatusBar>
          <BoardStatusBar.Summary>
            {selectedBoard.scenes.length} scenes · {runtime} total · 16:9
          </BoardStatusBar.Summary>
          {state.ioError !== null && (
            <BoardStatusBar.Error>{state.ioError}</BoardStatusBar.Error>
          )}
          <BoardStatusBar.Autosave>Autosaved just now</BoardStatusBar.Autosave>
        </BoardStatusBar>
      </main>
      <EditSceneDialog
        onOpenChange={(open) => {
          if (!open) {
            dispatch({ sceneId: null, type: "setEditingScene" })
          }
        }}
        onSave={(patch) => {
          if (editingScene) {
            dispatch({ patch, sceneId: editingScene.id, type: "updateScene" })
          }
        }}
        open={editingScene !== null}
        scene={editingScene}
        sceneNumber={formatSceneNumber(Math.max(editingIndex, 0))}
      />
    </div>
  )
}

interface GridSteppersProps {
  columns: number
  onColumnsChange: (columns: number) => void
  onRowsChange: (rows: number) => void
  rows: number
}

/** Rows and columns steppers of the board toolbar. */
function GridSteppers({
  columns,
  onColumnsChange,
  onRowsChange,
  rows,
}: GridSteppersProps) {
  return (
    <>
      <Field>
        <Field.Label>Rows</Field.Label>
        <Field.Control>
          <Stepper
            label="Rows"
            max={ROW_LIMITS.max}
            min={ROW_LIMITS.min}
            onValueChange={onRowsChange}
            value={rows}
          >
            <Stepper.Decrement />
            <Stepper.Value className="min-w-3" />
            <Stepper.Increment />
          </Stepper>
        </Field.Control>
      </Field>
      <Field>
        <Field.Label>Columns</Field.Label>
        <Field.Control>
          <Stepper
            label="Columns"
            max={COLUMN_LIMITS.max}
            min={COLUMN_LIMITS.min}
            onValueChange={onColumnsChange}
            value={columns}
          >
            <Stepper.Decrement />
            <Stepper.Value className="min-w-3" />
            <Stepper.Increment />
          </Stepper>
        </Field.Control>
      </Field>
    </>
  )
}

export { StoryboardWorkspace }
