"use client"

import { useAtom } from "jotai"
import * as React from "react"
import { flushSync } from "react-dom"

import type { BoardComposerDraft } from "@/lib/board-composer"
import { exportNodePng, parseBoardFile } from "@/lib/board-io"
import { requestStoryboardGeneration } from "@/lib/generate-storyboard-client"
import { type StoryboardGenerationRequest } from "@/lib/generation"
import { imageModelAtom } from "@/lib/image-model-settings"
import {
  clampResolution,
  isImageModel,
  isImageResolution,
  type ImageModel,
  type ImageResolution,
} from "@/lib/image-models"
import { imageResolutionAtom } from "@/lib/image-resolution-settings"
import {
  loadStoredWorkspace,
  saveStoredWorkspace,
  WORKSPACE_SAVE_DEBOUNCE_MS,
} from "@/lib/persistence"
import {
  type Board,
  createBlankBoard,
  createGeneratedBoard,
  createPlaceholderBoard,
  formatSeconds,
  nextUntitledBoardTitle,
  type Scene,
  totalRuntimeSeconds,
} from "@/lib/storyboard"
import {
  createBoardId,
  createInitialWorkspaceState,
  type WorkspaceAction,
  type WorkspaceState,
  workspaceReducer,
} from "@/lib/storyboard-workspace-state"

/**
 * Runs a DOM-mutating state update inside a View Transition when the
 * browser supports it and the user has not requested reduced motion.
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

interface StoryboardWorkspaceModel {
  canNavigateNextScene: boolean
  canNavigatePreviousScene: boolean
  deleteRequestBoard: Board | null
  dispatch: React.Dispatch<WorkspaceAction>
  editingIndex: number
  editingScene: Scene | null
  gridRef: React.RefObject<HTMLElement | null>
  handleColumnsChange: (columns: number) => void
  handleComposerActiveChange: (isComposerActive: boolean) => void
  handleEditScene: (sceneId: string) => void
  handleExportPng: (board: Board) => Promise<void>
  handleGenerateStoryboard: (
    generationRequest: StoryboardGenerationRequest
  ) => void
  handleImageModelChange: (value: string) => void
  handleImageResolutionChange: (value: string) => void
  handleImportClick: () => void
  handleImportFile: (file: File) => Promise<void>
  handleNewBoard: () => void
  handleRowsChange: (rows: number) => void
  handleSelectBoard: (boardId: string) => void
  handleShowParametersChange: (showParameters: boolean) => void
  handleUpdateBoardComposer: (patch: Partial<BoardComposerDraft>) => void
  handleUpdateScene: (sceneId: string, patch: Partial<Scene>) => void
  imageModel: ImageModel
  imageResolution: ImageResolution
  importInputRef: React.RefObject<HTMLInputElement | null>
  /** Whether the currently open board is a generation placeholder. */
  isSelectedBoardGenerating: boolean
  nextEditingSceneId: string | null
  previousEditingSceneId: string | null
  runtime: string
  selectedBoard: Board
  state: WorkspaceState
  visibleBoards: Board[]
  visibleScenes: Scene[]
}

/** Owns workspace state, persistence, and action handlers. */
function useStoryboardWorkspaceModel(): StoryboardWorkspaceModel {
  const [imageModel, setImageModel] = useAtom(imageModelAtom)
  const [imageResolution, setImageResolution] = useAtom(imageResolutionAtom)
  const [state, dispatch] = React.useReducer(
    workspaceReducer,
    undefined,
    createInitialWorkspaceState
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

    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current)
    }

    saveTimerRef.current = setTimeout(() => {
      saveTimerRef.current = null

      // Generation placeholders are session-only: their fetches cannot
      // survive a reload, so they never reach IndexedDB.
      void saveStoredWorkspace({
        boards: state.boards.filter(
          (board) => !state.generatingBoardIds.includes(board.id)
        ),
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
    state.generatingBoardIds,
    state.hydrated,
    state.rows,
    state.selectedBoardId,
    state.sidebarCollapsed,
  ])

  const selectedBoard =
    state.boards.find((board) => board.id === state.selectedBoardId) ??
    state.boards[0]
  const isSelectedBoardGenerating = state.generatingBoardIds.includes(
    selectedBoard.id
  )
  const deferredQuery = React.useDeferredValue(state.query)
  const normalizedQuery = deferredQuery.trim().toLowerCase()
  const visibleBoards = state.boards.filter((board) =>
    board.title.toLowerCase().includes(normalizedQuery)
  )
  const editingIndex = selectedBoard.scenes.findIndex(
    (scene) => scene.id === state.editingSceneId
  )
  const canNavigateNextScene =
    editingIndex !== -1 && editingIndex < selectedBoard.scenes.length - 1
  const canNavigatePreviousScene = editingIndex > 0
  const editingScene =
    editingIndex === -1 ? null : selectedBoard.scenes[editingIndex]
  const nextEditingSceneId = canNavigateNextScene
    ? (selectedBoard.scenes[editingIndex + 1]?.id ?? null)
    : null
  const previousEditingSceneId = canNavigatePreviousScene
    ? (selectedBoard.scenes[editingIndex - 1]?.id ?? null)
    : null
  const visibleScenes = selectedBoard.scenes.slice(
    0,
    state.rows * state.columns
  )
  const runtime = formatSeconds(totalRuntimeSeconds(visibleScenes))
  const deleteRequestBoard =
    state.boards.find((board) => board.id === state.deleteRequestBoardId) ??
    null

  const handleColumnsChange = (columns: number) => {
    dispatch({ columns, type: "setColumns" })
  }

  const handleComposerActiveChange = (isComposerActive: boolean) => {
    dispatch({ isComposerActive, type: "setComposerActive" })
  }

  const handleEditScene = (sceneId: string) => {
    dispatch({ sceneId, type: "setEditingScene" })
  }

  const handleImageModelChange = (value: string) => {
    if (isImageModel(value)) {
      setImageModel(value)
      // Keep the stored resolution valid for the newly selected model
      // (e.g. 4K snaps to 2K when switching to Seedream 5 Pro).
      setImageResolution(clampResolution(value, imageResolution))
    }
  }

  const handleImageResolutionChange = (value: string) => {
    if (isImageResolution(value)) {
      setImageResolution(value)
    }
  }

  const handleImportClick = () => {
    importInputRef.current?.click()
  }

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

  const handleRowsChange = (rows: number) => {
    dispatch({ rows, type: "setRows" })
  }

  const handleShowParametersChange = (showParameters: boolean) => {
    dispatch({ showParameters, type: "setShowParameters" })
  }

  const handleUpdateBoardComposer = (patch: Partial<BoardComposerDraft>) => {
    dispatch({ patch, type: "updateBoardComposer" })
  }

  const handleUpdateScene = (sceneId: string, patch: Partial<Scene>) => {
    dispatch({ patch, sceneId, type: "updateScene" })
  }

  const handleImportFile = async (file: File) => {
    const result = parseBoardFile(await file.text(), createBoardId())

    if (result.ok) {
      dispatch({ board: result.board, type: "addBoard" })
    } else {
      dispatch({ error: result.error, type: "setIoError" })
    }
  }

  async function handleExportPng(board: Board) {
    if (gridRef.current === null) {
      return
    }

    try {
      await exportNodePng(gridRef.current, board.title)
      dispatch({ error: null, type: "setIoError" })
    } catch {
      dispatch({ error: "The PNG export failed.", type: "setIoError" })
    }
  }

  function handleGenerateStoryboard(
    generationRequest: StoryboardGenerationRequest
  ) {
    // Captured up front so the draft that produced this generation moves
    // to the new board even if the selection changes mid-flight.
    const composerDraft = selectedBoard.composer
    const boardId = createBoardId()

    dispatch({
      board: createPlaceholderBoard(
        boardId,
        generationRequest.prompt,
        composerDraft
      ),
      type: "startGeneration",
    })

    // Runs detached so further generations can start while this one is
    // in flight; the result is keyed back to its placeholder board.
    void requestStoryboardGeneration(generationRequest)
      .then((result) => {
        React.startTransition(() => {
          dispatch({
            board: createGeneratedBoard(
              boardId,
              result.scenes,
              result.title,
              composerDraft
            ),
            columns: result.columns,
            rows: result.rows,
            type: "completeGeneration",
          })
        })
      })
      .catch((error: unknown) => {
        dispatch({
          boardId,
          error:
            error instanceof Error
              ? error.message
              : "The storyboard could not be generated.",
          type: "failGeneration",
        })
      })
  }

  return {
    canNavigateNextScene,
    canNavigatePreviousScene,
    deleteRequestBoard,
    dispatch,
    editingIndex,
    editingScene,
    gridRef,
    handleColumnsChange,
    handleComposerActiveChange,
    handleEditScene,
    handleExportPng,
    handleGenerateStoryboard,
    handleImageModelChange,
    handleImageResolutionChange,
    handleImportClick,
    handleImportFile,
    handleNewBoard,
    handleRowsChange,
    handleSelectBoard,
    handleShowParametersChange,
    handleUpdateBoardComposer,
    handleUpdateScene,
    imageModel,
    imageResolution,
    importInputRef,
    isSelectedBoardGenerating,
    nextEditingSceneId,
    previousEditingSceneId,
    runtime,
    selectedBoard,
    state,
    visibleBoards,
    visibleScenes,
  }
}

export { useStoryboardWorkspaceModel, type StoryboardWorkspaceModel }
