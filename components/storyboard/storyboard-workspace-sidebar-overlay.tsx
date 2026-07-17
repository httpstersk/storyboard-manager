"use client"

import { AnimatePresence, m } from "motion/react"

import { Sidebar } from "@/components/storyboard/app-sidebar"
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/motion"
import {
  type Board,
  formatEditedAt,
  formatSeconds,
  totalRuntimeSeconds,
} from "@/lib/storyboard"

/** Shared spring for the sidebar collapse/expand transition. */
const SIDEBAR_SPRING = { ...SPRING_LAYOUT } as const

/** Quick fade used for cross-fading the sidebar/rail contents. */
const SIDEBAR_CONTENT_TRANSITION = { duration: 0.15, ease: EASE_OUT } as const

interface StoryboardWorkspaceSidebarOverlayProps {
  /** All boards available in the workspace. */
  boards: Board[]
  /** Reference time for relative edited labels. */
  now: number
  /** Creates a new blank storyboard. */
  onCollapse: () => void
  /** Requests deletion confirmation for a board. */
  onDeleteRequest: (boardId: string) => void
  /** Creates a new blank storyboard. */
  onNewBoard: () => void
  /** Updates the sidebar search query. */
  onQueryChange: (query: string) => void
  /** Renames a board title. */
  onRenameBoard: (boardId: string, title: string) => void
  /** Selects a board as the active workspace target. */
  onSelectBoard: (boardId: string) => void
  /** Current sidebar search query. */
  query: string
  /** Currently selected board id. */
  selectedBoard: Board
  /** Currently selected board id. */
  selectedBoardId: string
  /** Whether the floating sidebar overlay is visible. */
  sidebarCollapsed: boolean
  /** Boards matching the current sidebar search query. */
  visibleBoards: Board[]
}

/** Floating sidebar overlay rendered above the main workspace content. */
function StoryboardWorkspaceSidebarOverlay({
  boards,
  now,
  onCollapse,
  onDeleteRequest,
  onNewBoard,
  onQueryChange,
  onRenameBoard,
  onSelectBoard,
  query,
  selectedBoard,
  selectedBoardId,
  sidebarCollapsed,
  visibleBoards,
}: StoryboardWorkspaceSidebarOverlayProps) {
  return (
    <AnimatePresence>
      {!sidebarCollapsed ? (
        <m.div
          animate={{ opacity: 1 }}
          aria-hidden
          className="absolute inset-0 z-40 bg-scrim"
          exit={{ opacity: 0 }}
          initial={{ opacity: 0 }}
          key="sidebar-backdrop"
          onClick={onCollapse}
          transition={SIDEBAR_CONTENT_TRANSITION}
        />
      ) : null}
      {!sidebarCollapsed ? (
        <m.div
          animate={{ opacity: 1, x: 0 }}
          className="absolute start-4.5 top-7.5 z-50 h-[var(--height-shell)]"
          exit={{ opacity: 0, x: -12 }}
          initial={{ opacity: 0, x: -12 }}
          key="sidebar-panel"
          transition={SIDEBAR_SPRING}
        >
          <Sidebar className="h-full shadow-modal">
            <Sidebar.Header onCollapse={onCollapse} title="Storyboards" />
            <Sidebar.NewBoardButton onClick={onNewBoard}>
              New storyboard
            </Sidebar.NewBoardButton>
            <Sidebar.BoardSwitcher
              boards={boards}
              onSelectBoard={onSelectBoard}
              selectedBoardId={selectedBoardId}
            />
            <Sidebar.Search onQueryChange={onQueryChange} query={query} />
            <Sidebar.Section title="Recent">
              <Sidebar.BoardList>
                {visibleBoards.map((board) => (
                  <Sidebar.BoardItem
                    active={board.id === selectedBoard.id}
                    canDelete={boards.length > 1}
                    key={board.id}
                    meta={`${board.scenes.length} scenes · ${formatSeconds(totalRuntimeSeconds(board.scenes))} · ${formatEditedAt(board.updatedAt, now)}`}
                    onDeleteRequest={() => onDeleteRequest(board.id)}
                    onRename={(newTitle) => onRenameBoard(board.id, newTitle)}
                    onSelect={() => onSelectBoard(board.id)}
                    title={board.title}
                  />
                ))}
              </Sidebar.BoardList>
            </Sidebar.Section>
            <Sidebar.Footer>
              {boards.length} {boards.length === 1 ? "board" : "boards"} · synced
            </Sidebar.Footer>
          </Sidebar>
        </m.div>
      ) : null}
    </AnimatePresence>
  )
}

export {
  SIDEBAR_CONTENT_TRANSITION,
  StoryboardWorkspaceSidebarOverlay,
  type StoryboardWorkspaceSidebarOverlayProps,
}
