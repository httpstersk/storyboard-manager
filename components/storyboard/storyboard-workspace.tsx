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
import {
  type BoardSummary,
  COLUMN_LIMITS,
  formatSceneNumber,
  formatSeconds,
  ROW_LIMITS,
  type Scene,
  totalRuntimeSeconds,
} from "@/lib/storyboard"
import { clampInteger } from "@/lib/validation"

interface WorkspaceState {
  columns: number
  editingSceneId: string | null
  query: string
  rows: number
  scenes: Scene[]
  selectedBoardId: string
  showParameters: boolean
}

type WorkspaceAction =
  | { boardId: string; type: "selectBoard" }
  | { columns: number; type: "setColumns" }
  | { query: string; type: "setQuery" }
  | { rows: number; type: "setRows" }
  | { sceneId: string | null; type: "setEditingScene" }
  | { showParameters: boolean; type: "setShowParameters" }
  | { patch: Partial<Scene>; sceneId: string; type: "updateScene" }

function workspaceReducer(
  state: WorkspaceState,
  action: WorkspaceAction
): WorkspaceState {
  switch (action.type) {
    case "selectBoard":
      return { ...state, selectedBoardId: action.boardId }
    case "setColumns":
      return { ...state, columns: clampInteger(action.columns, COLUMN_LIMITS) }
    case "setEditingScene":
      return { ...state, editingSceneId: action.sceneId }
    case "setQuery":
      return { ...state, query: action.query }
    case "setRows":
      return { ...state, rows: clampInteger(action.rows, ROW_LIMITS) }
    case "setShowParameters":
      return { ...state, showParameters: action.showParameters }
    case "updateScene":
      return {
        ...state,
        scenes: state.scenes.map((scene) =>
          scene.id === action.sceneId ? { ...scene, ...action.patch } : scene
        ),
      }
  }
}

/** Props for {@link StoryboardWorkspace}. */
interface StoryboardWorkspaceProps {
  /** Boards listed in the sidebar. */
  boards: BoardSummary[]
  /** Scenes of the initially selected board. */
  initialScenes: Scene[]
}

/**
 * Client-side shell of the storyboard manager: owns all board state and
 * composes the sidebar, toolbar, scene grid, status bar, and scene
 * editor dialog.
 */
function StoryboardWorkspace({
  boards,
  initialScenes,
}: StoryboardWorkspaceProps) {
  const [state, dispatch] = React.useReducer(workspaceReducer, {
    columns: COLUMN_LIMITS.max,
    editingSceneId: null,
    query: "",
    rows: ROW_LIMITS.max,
    scenes: initialScenes,
    selectedBoardId: boards[0]?.id ?? "",
    showParameters: true,
  })

  const normalizedQuery = state.query.trim().toLowerCase()
  const visibleBoards = boards.filter((board) =>
    board.title.toLowerCase().includes(normalizedQuery)
  )
  const editingIndex = state.scenes.findIndex(
    (scene) => scene.id === state.editingSceneId
  )
  const editingScene = editingIndex === -1 ? null : state.scenes[editingIndex]
  const runtime = formatSeconds(totalRuntimeSeconds(state.scenes))

  return (
    <div className="flex min-h-svh gap-3.5 bg-surface-app p-4.5">
      <Sidebar>
        <Sidebar.Header title="Storyboards" />
        <Sidebar.NewBoardButton>New storyboard</Sidebar.NewBoardButton>
        <Sidebar.Search
          onQueryChange={(query) => dispatch({ query, type: "setQuery" })}
          query={state.query}
        />
        <Sidebar.Section title="Recent">
          <Sidebar.BoardList>
            {visibleBoards.map((board) => (
              <Sidebar.BoardItem
                active={board.id === state.selectedBoardId}
                key={board.id}
                meta={`${board.sceneCount} scenes · ${formatSeconds(board.runtimeSeconds)} · ${board.editedAt}`}
                onSelect={() =>
                  dispatch({ boardId: board.id, type: "selectBoard" })
                }
                title={board.title}
              />
            ))}
          </Sidebar.BoardList>
        </Sidebar.Section>
        <Sidebar.Footer>{boards.length} boards · synced</Sidebar.Footer>
      </Sidebar>
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
            <BoardToolbar.Action>
              <Upload aria-hidden />
              Import
            </BoardToolbar.Action>
            <BoardToolbar.Action>
              <Download aria-hidden />
              JSON
            </BoardToolbar.Action>
            <BoardToolbar.Action variant="emphasis">
              <Download aria-hidden />
              PNG
            </BoardToolbar.Action>
            <BoardToolbar.ThemeToggle />
          </BoardToolbar.Actions>
        </BoardToolbar>
        <SceneGrid
          columns={state.columns}
          onEditScene={(sceneId) =>
            dispatch({ sceneId, type: "setEditingScene" })
          }
          onUpdateScene={(sceneId, patch) =>
            dispatch({ patch, sceneId, type: "updateScene" })
          }
          rows={state.rows}
          scenes={state.scenes}
          showParameters={state.showParameters}
        />
        <BoardStatusBar>
          <BoardStatusBar.Summary>
            {state.scenes.length} scenes · {runtime} total · 16:9
          </BoardStatusBar.Summary>
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

export { StoryboardWorkspace, type StoryboardWorkspaceProps }
