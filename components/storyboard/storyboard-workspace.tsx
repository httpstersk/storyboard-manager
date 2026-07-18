"use client"

import { useSetAtom } from "jotai"
import { AnimatePresence, m } from "motion/react"
import * as React from "react"

import { Sidebar } from "@/components/storyboard/app-sidebar"
import { BoardStatusBar } from "@/components/storyboard/board-status-bar"
import { EditSceneDialog } from "@/components/storyboard/edit-scene-dialog"
import { SceneGrid } from "@/components/storyboard/scene-grid"
import { DeleteBoardConfirmDialog } from "@/components/storyboard/storyboard-workspace-delete-dialog"
import { SelectedBoardContext } from "@/components/storyboard/storyboard-workspace-selected-board-context"
import {
  SIDEBAR_CONTENT_TRANSITION,
  StoryboardWorkspaceSidebarOverlay,
} from "@/components/storyboard/storyboard-workspace-sidebar-overlay"
import { WorkspacePromptComposer } from "@/components/storyboard/storyboard-workspace-prompt-composer"
import { WorkspaceToolbar } from "@/components/storyboard/storyboard-workspace-toolbar"
import { useStoryboardWorkspaceModel } from "@/components/storyboard/use-storyboard-workspace-model"
import { VideoSection } from "@/components/storyboard/video-section"
import { formatSceneNumber } from "@/lib/storyboard"
import {
  removeBoardVideoState,
  videoGenerationByBoardIdAtom,
} from "@/lib/video-section-atoms"

/** Status-bar autosave label reflecting the number of in-flight generations. */
function autosaveLabel(generatingCount: number): string {
  if (generatingCount === 0) {
    return "Autosaved just now"
  }

  return generatingCount === 1
    ? "Generating storyboard"
    : `Generating ${generatingCount} storyboards`
}

/**
 * Client-side shell of the storyboard studio: owns all board state and
 * composes the sidebar, toolbar, scene grid, status bar, and scene
 * editor dialog. Boards persist to IndexedDB after every change.
 */
function StoryboardWorkspace() {
  const setVideoByBoardId = useSetAtom(videoGenerationByBoardIdAtom)
  const {
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
  } = useStoryboardWorkspaceModel()

  return (
    <div className="relative flex h-svh gap-3.5 overflow-hidden bg-surface-app p-4.5">
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
      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col gap-3.5 overflow-hidden">
        <SelectedBoardContext.Provider value={selectedBoard}>
          <WorkspaceToolbar
            columns={state.columns}
            imageModel={imageModel}
            imageResolution={imageResolution}
            onColumnsChange={handleColumnsChange}
            onExportPng={handleExportPng}
            onImageModelChange={handleImageModelChange}
            onImageResolutionChange={handleImageResolutionChange}
            onImport={handleImportClick}
            onRowsChange={handleRowsChange}
            onShowParametersChange={handleShowParametersChange}
            rows={state.rows}
            showParameters={state.showParameters}
          />
        </SelectedBoardContext.Provider>
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
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto">
          <SceneGrid
            columns={state.columns}
            isGenerating={isSelectedBoardGenerating}
            onEditScene={handleEditScene}
            onUpdateScene={handleUpdateScene}
            ref={gridRef}
            rows={state.rows}
            scenes={selectedBoard.scenes}
            showParameters={state.showParameters}
          />
          <VideoSection.Root
            boardId={selectedBoard.id}
            className="pb-112"
            gridRef={gridRef}
            scenes={visibleScenes}
          >
            <VideoSection.Prompt />
            <VideoSection.Player />
          </VideoSection.Root>
        </div>
        <div className="absolute inset-x-0 bottom-10 z-50 mx-auto w-full max-w-3xl px-4">
          <WorkspacePromptComposer
            draft={selectedBoard.composer}
            onActiveChange={handleComposerActiveChange}
            onDraftChange={handleUpdateBoardComposer}
            onSubmit={handleGenerateStoryboard}
          />
        </div>
        <BoardStatusBar>
          <BoardStatusBar.Summary>
            {visibleScenes.length} scenes · {runtime} total
          </BoardStatusBar.Summary>
          {state.ioError !== null && (
            <BoardStatusBar.Error>{state.ioError}</BoardStatusBar.Error>
          )}
          <BoardStatusBar.Autosave
            pulsing={state.generatingBoardIds.length > 0}
          >
            {autosaveLabel(state.generatingBoardIds.length)}
          </BoardStatusBar.Autosave>
        </BoardStatusBar>
      </main>
      <AnimatePresence>
        {state.isComposerActive ? (
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
        ) : null}
      </AnimatePresence>
      <StoryboardWorkspaceSidebarOverlay
        boards={state.boards}
        generatingBoardIds={state.generatingBoardIds}
        now={state.now}
        onCollapse={() =>
          dispatch({ collapsed: true, type: "setSidebarCollapsed" })
        }
        onDeleteRequest={(boardId) =>
          dispatch({ boardId, type: "setDeleteRequest" })
        }
        onNewBoard={handleNewBoard}
        onQueryChange={(query) => dispatch({ query, type: "setQuery" })}
        onRenameBoard={(boardId, title) =>
          dispatch({ boardId, title, type: "renameBoard" })
        }
        onSelectBoard={handleSelectBoard}
        query={state.query}
        selectedBoard={selectedBoard}
        selectedBoardId={state.selectedBoardId}
        sidebarCollapsed={state.sidebarCollapsed}
        visibleBoards={visibleBoards}
      />
      <EditSceneDialog
        canNavigateNext={canNavigateNextScene}
        canNavigatePrevious={canNavigatePreviousScene}
        onNavigateNext={() => {
          if (nextEditingSceneId !== null) {
            dispatch({ sceneId: nextEditingSceneId, type: "setEditingScene" })
          }
        }}
        onNavigatePrevious={() => {
          if (previousEditingSceneId !== null) {
            dispatch({
              sceneId: previousEditingSceneId,
              type: "setEditingScene",
            })
          }
        }}
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
            const deletedBoardId = deleteRequestBoard.id
            dispatch({ boardId: deletedBoardId, type: "deleteBoard" })
            setVideoByBoardId((previous) =>
              removeBoardVideoState(deletedBoardId, previous)
            )
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

export { StoryboardWorkspace }
