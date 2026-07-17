"use client"

import { useAtom } from "jotai"
import { SFArrowDownToLine, SFArrowUpToLine } from "sf-symbols-lib/monochrome"
import { AnimatePresence, m } from "motion/react"
import * as React from "react"
import { flushSync } from "react-dom"

import { Sidebar } from "@/components/storyboard/app-sidebar"
import { BoardStatusBar } from "@/components/storyboard/board-status-bar"
import { BoardToolbar } from "@/components/storyboard/board-toolbar"
import { EditSceneDialog } from "@/components/storyboard/edit-scene-dialog"
import { PromptComposer } from "@/components/storyboard/prompt-composer"
import { SceneGrid } from "@/components/storyboard/scene-grid"
import { SoundControl } from "@/components/storyboard/sound-control"
import { Dialog } from "@/components/ui/dialog"
import { Field } from "@/components/ui/field"
import { SegmentedControl } from "@/components/ui/segmented-control"
import { Stepper } from "@/components/ui/stepper"
import { Switch } from "@/components/ui/switch"
import { exportBoardJson, exportNodePng, parseBoardFile } from "@/lib/board-io"
import {
  IMAGE_MODELS,
  type ImageModel,
  type StoryboardGenerationRequest,
  storyboardGenerationResponseSchema,
} from "@/lib/generation"
import { imageModelAtom } from "@/lib/image-model-settings"
import { EASE_OUT } from "@/lib/motion"
import {
  loadStoredWorkspace,
  saveStoredWorkspace,
  type StoredWorkspace,
  WORKSPACE_SAVE_DEBOUNCE_MS,
} from "@/lib/persistence"
import {
  type Board,
  COLUMN_LIMITS,
  createBlankBoard,
  createGeneratedBoard,
  DEFAULT_ROWS,
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

type WorkspaceAction =
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
      return { ...state, now, selectedBoardId: action.boardId }
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

function createInitialState(): WorkspaceState {
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
    // Start closed: the sidebar now floats over the content when open, so
    // the board loads unobstructed and the user opens the sidebar on demand.
    sidebarCollapsed: true,
  }
}

function createBoardId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `board-${Date.now()}`
}

/**
 * Runs a DOM-mutating state update inside a View Transition when the
 * browser supports it and the user has not requested reduced motion, so
 * switching boards cross-fades the scene grid; otherwise applies the
 * update directly. `flushSync` forces React to commit synchronously so the
 * browser captures the post-update DOM for the transition.
 */
function withViewTransition(update: () => void): void {
  if (
    typeof document !== "undefined" &&
    "startViewTransition" in document &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    document.startViewTransition(() => flushSync(update))

    return
  }

  update()
}

/** Shared spring for the sidebar collapse/expand transition; interruptible
 * so rapid toggling doesn't fight itself. */
const SIDEBAR_SPRING = { type: "spring", duration: 0.4, bounce: 0.1 } as const

/** Quick fade/scale used for cross-fading the sidebar/rail contents. */
const SIDEBAR_CONTENT_TRANSITION = { duration: 0.15, ease: EASE_OUT } as const

/**
 * Client-side shell of the storyboard studio: owns all board state and
 * composes the sidebar, toolbar, scene grid, status bar, and scene
 * editor dialog. Boards persist to IndexedDB after every change.
 */
function StoryboardWorkspace() {
  const [imageModel, setImageModel] = useAtom(imageModelAtom)
  const [state, dispatch] = React.useReducer(
    workspaceReducer,
    undefined,
    createInitialState
  )
  const gridRef = React.useRef<HTMLElement>(null)
  const importInputRef = React.useRef<HTMLInputElement>(null)
  const saveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => {
    let cancelled = false

    void loadStoredWorkspace()
      .then((workspace) => {
        if (!cancelled) {
          dispatch({ type: "hydrate", workspace })
        }
      })
      .catch(() => {
        if (!cancelled) {
          dispatch({ type: "hydrate", workspace: null })
        }
      })

    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (!state.hydrated) {
      return
    }

    // Debounce IndexedDB writes so rapid scene edits do not rewrite every
    // image Blob on each keystroke.
    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null

      void saveStoredWorkspace({
        boards: state.boards,
        columns: state.columns,
        rows: state.rows,
        selectedBoardId: state.selectedBoardId,
        sidebarCollapsed: state.sidebarCollapsed,
      }).catch(() => {
        dispatch({
          error: "Could not save boards to this browser.",
          type: "setIoError",
        })
      })
    }, WORKSPACE_SAVE_DEBOUNCE_MS)

    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
    }
  }, [
    state.boards,
    state.columns,
    state.hydrated,
    state.rows,
    state.selectedBoardId,
    state.sidebarCollapsed,
  ])

  const selectedBoard =
    state.boards.find((board) => board.id === state.selectedBoardId) ??
    state.boards[0]
  const deferredQuery = React.useDeferredValue(state.query)
  const normalizedQuery = deferredQuery.trim().toLowerCase()
  const visibleBoards = state.boards.filter((board) =>
    board.title.toLowerCase().includes(normalizedQuery)
  )
  const editingIndex = selectedBoard.scenes.findIndex(
    (scene) => scene.id === state.editingSceneId
  )
  const editingScene =
    editingIndex === -1 ? null : selectedBoard.scenes[editingIndex]
  const visibleScenes = selectedBoard.scenes.slice(
    0,
    state.rows * state.columns
  )
  const runtime = formatSeconds(totalRuntimeSeconds(visibleScenes))
  const deleteRequestBoard =
    state.boards.find((board) => board.id === state.deleteRequestBoardId) ??
    null

  const handleNewBoard = () => {
    dispatch({
      board: createBlankBoard(
        createBoardId(),
        nextUntitledBoardTitle(state.boards)
      ),
      type: "addBoard",
    })
  }

  const handleSelectBoard = (boardId: string) => {
    if (boardId === state.selectedBoardId) {
      return
    }

    withViewTransition(() => dispatch({ boardId, type: "selectBoard" }))
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

  const handleGenerateStoryboard = async (
    generationRequest: StoryboardGenerationRequest
  ) => {
    dispatch({ error: null, type: "setIoError" })
    dispatch({ isGenerating: true, type: "setIsGenerating" })

    try {
      const response = await fetch("/api/generate-storyboard", {
        body: JSON.stringify(generationRequest),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      })
      const responseBody: unknown = await response.json()

      if (!response.ok) {
        const message =
          typeof responseBody === "object" &&
            responseBody !== null &&
            "error" in responseBody &&
            typeof responseBody.error === "string"
            ? responseBody.error
            : "The storyboard could not be generated."

        throw new Error(message)
      }

      const result = storyboardGenerationResponseSchema.parse(responseBody)
      const board = createGeneratedBoard(
        createBoardId(),
        result.scenes,
        result.title
      )

      React.startTransition(() => {
        dispatch({ board, type: "addBoard" })
        dispatch({ columns: result.columns, type: "setColumns" })
        dispatch({ rows: result.rows, type: "setRows" })
      })
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "The storyboard could not be generated."

      dispatch({ error: message, type: "setIoError" })
      throw error
    } finally {
      dispatch({ isGenerating: false, type: "setIsGenerating" })
    }
  }

  return (
    <div className="relative flex h-svh gap-3.5 overflow-hidden bg-surface-app p-4.5">
      {/* Persistent slim rail. It always occupies layout space so <main>
          keeps a constant position and size whether the full sidebar is
          open or closed -- opening the sidebar overlays the content (see
          the floating panel below) instead of widening this column. Kept
          at a fixed viewport height rather than stretching to <main>'s
          natural height so a rows/columns edit can't distort it. */}
      <div className="mt-3 h-[var(--height-shell)] shrink-0">
        <Sidebar.Rail
          boards={state.boards}
          className="h-full"
          onExpand={() =>
            dispatch({ collapsed: false, type: "setSidebarCollapsed" })
          }
          onNewBoard={handleNewBoard}
          onSelectBoard={handleSelectBoard}
          selectedBoardId={state.selectedBoardId}
        />
      </div>
      {/* <main> is a plain flex child: the sidebar now floats above it
          (see the overlay below), so nothing shifts or resizes the
          content and no layout animation is needed here. It is `relative`
          so the prompt composer and its focus backdrop can pin to it. */}
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 overflow-hidden">
        <BoardToolbar>
          <BoardToolbar.Brand name="Boooards" version="v1.3" />
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
              <Field.Label>Nano Banana</Field.Label>
              <Field.Control>
                <div>
                  <SegmentedControl
                    label="Image model"
                    onValueChange={(value) => {
                      if (isImageModel(value)) {
                        setImageModel(value)
                      }
                    }}
                    value={imageModel}
                    variant="raised"
                  >
                    <SegmentedControl.Option value="lite">
                      Lite
                    </SegmentedControl.Option>
                    <SegmentedControl.Option value="pro">
                      Pro
                    </SegmentedControl.Option>
                  </SegmentedControl>
                </div>
              </Field.Control>
            </Field>
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
              <SFArrowUpToLine aria-hidden />
              Import
            </BoardToolbar.Action>
            <BoardToolbar.Action onClick={() => exportBoardJson(selectedBoard)}>
              <SFArrowDownToLine aria-hidden />
              JSON
            </BoardToolbar.Action>
            <BoardToolbar.Action onClick={handleExportPng} variant="emphasis">
              <SFArrowDownToLine aria-hidden />
              PNG
            </BoardToolbar.Action>
            <SoundControl />
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
          isGenerating={state.isGenerating}
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
        {/* The composer floats above the scene grid so it remains available
            without turning the input into a separate layout section. */}
        <div className="absolute inset-x-0 bottom-10 z-50 mx-auto w-full max-w-3xl px-4">
          <PromptComposer.Root
            disabled={state.isGenerating}
            onActiveChange={(isComposerActive) =>
              dispatch({ isComposerActive, type: "setComposerActive" })
            }
            onSubmit={handleGenerateStoryboard}
          >
            <PromptComposer.Input />
            <PromptComposer.Attachments />
            <PromptComposer.Actions />
          </PromptComposer.Root>
        </div>
        <BoardStatusBar>
          <BoardStatusBar.Summary>
            {visibleScenes.length} scenes · {runtime} total
          </BoardStatusBar.Summary>
          {state.ioError !== null && (
            <BoardStatusBar.Error>{state.ioError}</BoardStatusBar.Error>
          )}
          <BoardStatusBar.Autosave pulsing={state.isGenerating}>
            {state.isGenerating
              ? "Generating storyboard"
              : "Autosaved just now"}
          </BoardStatusBar.Autosave>
        </BoardStatusBar>
      </main>
      {/* Workspace-wide focus backdrop. It covers the sidebar rail and main
          canvas while remaining below the floating composer. */}
      <AnimatePresence>
        {state.isComposerActive && (
          <m.div
            animate={{ opacity: 1 }}
            aria-hidden
            className="absolute inset-0 z-40 bg-scrim backdrop-blur-sm"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="composer-backdrop"
            onClick={() =>
              dispatch({ isComposerActive: false, type: "setComposerActive" })
            }
            transition={SIDEBAR_CONTENT_TRANSITION}
          />
        )}
      </AnimatePresence>
      {/* Floating sidebar overlay. Rendered above <main> and positioned to
          sit exactly over the rail, so opening it layers the sidebar on
          top of the content instead of pushing or resizing it. The
          backdrop dims the board and closes the sidebar on outside click;
          the panel's shadow reinforces that it floats above. */}
      <AnimatePresence>
        {!state.sidebarCollapsed && (
          <m.div
            animate={{ opacity: 1 }}
            aria-hidden
            className="absolute inset-0 z-40 bg-scrim"
            exit={{ opacity: 0 }}
            initial={{ opacity: 0 }}
            key="sidebar-backdrop"
            onClick={() =>
              dispatch({ collapsed: true, type: "setSidebarCollapsed" })
            }
            transition={SIDEBAR_CONTENT_TRANSITION}
          />
        )}
        {!state.sidebarCollapsed && (
          <m.div
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-7.5 start-4.5 z-50 h-[var(--height-shell)]"
            exit={{ opacity: 0, x: -12 }}
            initial={{ opacity: 0, x: -12 }}
            key="sidebar-panel"
            transition={SIDEBAR_SPRING}
          >
            <Sidebar className="h-full shadow-modal">
              <Sidebar.Header
                onCollapse={() =>
                  dispatch({ collapsed: true, type: "setSidebarCollapsed" })
                }
                title="Storyboards"
              />
              <Sidebar.NewBoardButton onClick={handleNewBoard}>
                New storyboard
              </Sidebar.NewBoardButton>
              <Sidebar.BoardSwitcher
                boards={state.boards}
                onSelectBoard={handleSelectBoard}
                selectedBoardId={state.selectedBoardId}
              />
              <Sidebar.Search
                onQueryChange={(query) => dispatch({ query, type: "setQuery" })}
                query={state.query}
              />
              <Sidebar.Section title="Recent">
                <Sidebar.BoardList>
                  {visibleBoards.map((board) => (
                    <Sidebar.BoardItem
                      active={board.id === selectedBoard.id}
                      canDelete={state.boards.length > 1}
                      key={board.id}
                      meta={`${board.scenes.length} scenes · ${formatSeconds(totalRuntimeSeconds(board.scenes))} · ${formatEditedAt(board.updatedAt, state.now)}`}
                      onDeleteRequest={() =>
                        dispatch({
                          boardId: board.id,
                          type: "setDeleteRequest",
                        })
                      }
                      onRename={(newTitle) =>
                        dispatch({
                          boardId: board.id,
                          title: newTitle,
                          type: "renameBoard",
                        })
                      }
                      onSelect={() => handleSelectBoard(board.id)}
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
          </m.div>
        )}
      </AnimatePresence>
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
      <DeleteBoardConfirmDialog
        board={deleteRequestBoard}
        onConfirm={() => {
          if (deleteRequestBoard) {
            dispatch({ boardId: deleteRequestBoard.id, type: "deleteBoard" })
          }
        }}
        onOpenChange={(open) => {
          if (!open) {
            dispatch({ boardId: null, type: "setDeleteRequest" })
          }
        }}
      />
    </div>
  )
}

interface DeleteBoardConfirmDialogProps {
  /** Board pending deletion, or null when the dialog is closed. */
  board: Board | null
  /** Called when the user confirms the delete. */
  onConfirm: () => void
  /** Called when the dialog requests to open or close. */
  onOpenChange: (open: boolean) => void
}

/** Confirmation dialog shown before a storyboard is permanently deleted. */
function DeleteBoardConfirmDialog({
  board,
  onConfirm,
  onOpenChange,
}: DeleteBoardConfirmDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={board !== null}>
      <Dialog.Content className="max-w-sm">
        <Dialog.Header>
          <Dialog.Title>Delete storyboard</Dialog.Title>
        </Dialog.Header>
        <p className="px-5 py-4 text-body text-pretty text-ink-muted">
          Delete &ldquo;{board?.title}&rdquo;? This can&rsquo;t be undone.
        </p>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <button
              className="flex h-7.5 items-center rounded-full bg-surface-inset px-4 text-label text-ink transition-[color,transform] duration-150 ease-out outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              type="button"
            >
              Cancel
            </button>
          </Dialog.Close>
          <button
            className="flex h-7.5 items-center rounded-full bg-destructive px-4 text-label font-medium text-white transition-[background-color,transform] duration-150 ease-out outline-none hover:bg-destructive/85 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            onClick={onConfirm}
            type="button"
          >
            Delete
          </button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  )
}

/** Type guard for values emitted by the Model segmented control. */
function isImageModel(value: string): value is ImageModel {
  return (IMAGE_MODELS as readonly string[]).includes(value)
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
