"use client"

import {
  SFEllipsis,
  SFMagnifyingglass,
  SFPencil,
  SFPlus,
  SFSidebarLeft,
  SFSquareGrid2x2,
  SFTrash,
} from "sf-symbols-lib/monochrome"
import { m } from "motion/react"
import * as React from "react"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { IconButton } from "@/components/ui/icon-button"
import { SPRING_SNAPPY } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * The board navigation sidebar.
 *
 * ```tsx
 * <Sidebar>
 *   <Sidebar.Header title="Storyboards" />
 *   <Sidebar.NewBoardButton>New storyboard</Sidebar.NewBoardButton>
 *   <Sidebar.Search onQueryChange={setQuery} query={query} />
 *   <Sidebar.Section title="Recent">
 *     <Sidebar.BoardList>
 *       <Sidebar.BoardItem ... />
 *     </Sidebar.BoardList>
 *   </Sidebar.Section>
 *   <Sidebar.Footer>5 boards · synced</Sidebar.Footer>
 * </Sidebar>
 * ```
 */
function Sidebar({
  children,
  className,
  ...props
}: React.ComponentProps<"aside">) {
  return (
    <aside
      className={cn(
        "flex w-58 shrink-0 flex-col gap-3 rounded-2xl bg-surface-panel p-3",
        className
      )}
      {...props}
    >
      {children}
    </aside>
  )
}

/** Props for {@link SidebarHeader}. */
interface SidebarHeaderProps {
  className?: string
  /** Called when the collapse button is activated. */
  onCollapse: () => void
  /** Sidebar heading text. */
  title: string
}

/** Heading row of the {@link Sidebar} with a collapse affordance. */
function SidebarHeader({ className, onCollapse, title }: SidebarHeaderProps) {
  return (
    <div
      className={cn(
        "flex h-7.5 shrink-0 items-center justify-between pl-1.5",
        className
      )}
    >
      <h1 className="text-label font-medium text-ink-strong">{title}</h1>
      <IconButton label="Collapse sidebar" onClick={onCollapse} size="sm">
        <SFSidebarLeft aria-hidden />
      </IconButton>
    </div>
  )
}

/** Props for {@link SidebarRail}. */
interface SidebarRailProps {
  /** All boards, used to render the numbered switcher buttons. */
  boards: Array<{ id: string }>
  className?: string
  /** Called when the expand button is activated. */
  onExpand: () => void
  /** Called when the new board button is activated. */
  onNewBoard: () => void
  /** Called when a numbered board button is activated. */
  onSelectBoard: (boardId: string) => void
  /** Id of the currently open board. */
  selectedBoardId: string
}

/** Slim rail shown in place of the {@link Sidebar} while collapsed.
 * Renders as a pill-shaped column of icon buttons. */
function SidebarRail({
  boards,
  className,
  onExpand,
  onNewBoard,
  onSelectBoard,
  selectedBoardId,
}: SidebarRailProps) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col items-center gap-2 rounded-full bg-surface-panel p-3",
        className
      )}
    >
      <IconButton label="Expand sidebar" onClick={onExpand} size="sm">
        <SFSidebarLeft aria-hidden />
      </IconButton>
      <IconButton label="New storyboard" onClick={onNewBoard} size="sm">
        <SFPlus aria-hidden />
      </IconButton>
      {/* Divider separating actions from the per-board switcher */}
      <div aria-hidden className="h-px w-4 shrink-0 bg-surface-inset" />
      {/* Numbered board buttons — scrollable when there are many boards */}
      <div className="flex min-h-0 flex-1 flex-col items-center gap-1 overflow-y-auto">
        {boards.map((board, index) => (
          <button
            key={board.id}
            aria-current={board.id === selectedBoardId ? "true" : undefined}
            aria-label={`Storyboard ${index + 1}`}
            className={cn(
              "size-6 shrink-0 rounded-full text-caption font-medium tabular-nums outline-none transition-[color,background-color,transform] duration-150 ease-out active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel",
              board.id === selectedBoardId
                ? "bg-emphasis text-emphasis-foreground"
                : "bg-surface-inset text-ink-muted hover:text-ink-strong"
            )}
            onClick={() => onSelectBoard(board.id)}
            type="button"
          >
            {index + 1}
          </button>
        ))}
      </div>
    </aside>
  )
}

/** Primary action button of the {@link Sidebar}. */
function SidebarNewBoardButton({
  children,
  className,
  type = "button",
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      className={cn(
        "flex h-7.5 shrink-0 items-center justify-center gap-1.5 rounded-full bg-emphasis text-caption font-medium text-emphasis-foreground outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-emphasis/85 active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel",
        className
      )}
      type={type}
      {...props}
    >
      <SFPlus aria-hidden className="size-2.75" />
      {children}
    </button>
  )
}

/** Props for {@link SidebarSearch}. */
interface SidebarSearchProps {
  className?: string
  /** Called with the new query on every keystroke. */
  onQueryChange: (query: string) => void
  /** Current search query. */
  query: string
}

/** Board search input of the {@link Sidebar}. */
function SidebarSearch({ className, onQueryChange, query }: SidebarSearchProps) {
  return (
    <div
      className={cn(
        "flex h-7 shrink-0 items-center gap-2 rounded-full bg-surface-inset px-3 focus-within:ring-2 focus-within:ring-ring",
        className
      )}
    >
      <SFMagnifyingglass aria-hidden className="size-2.5 shrink-0 text-ink-muted" />
      <input
        aria-label="Search boards"
        className="w-full bg-transparent text-caption text-ink outline-none placeholder:text-ink-faint"
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Search boards"
        type="search"
        value={query}
      />
    </div>
  )
}

/** Props for {@link SidebarSection}. */
interface SidebarSectionProps {
  children: React.ReactNode
  className?: string
  /** Section heading text. */
  title: string
}

/** A titled section of the {@link Sidebar}. Grows to fill available space
 * so the board list inside can scroll when content overflows. */
function SidebarSection({ children, className, title }: SidebarSectionProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col gap-1.5", className)}>
      <h2 className="shrink-0 px-1.5 pt-1.5 pb-0.5 text-caption font-normal text-ink-muted">
        {title}
      </h2>
      {children}
    </div>
  )
}

/** List container for {@link SidebarBoardItem} entries. Scrolls internally
 * when there are more boards than the sidebar can display at once. */
function SidebarBoardList({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto",
        className
      )}
      {...props}
    />
  )
}

/** Props for {@link SidebarBoardItem}. */
interface SidebarBoardItemProps {
  /** Whether this board is the one currently open. */
  active: boolean
  /** Whether the board can be deleted (false for the last remaining board). */
  canDelete: boolean
  /** Secondary line, for example "8 scenes · 0:42 · edited now". */
  meta: string
  /** Called when deletion is requested from the actions menu. */
  onDeleteRequest: () => void
  /** Called when the board title is renamed inline. */
  onRename: (newTitle: string) => void
  /** Called when the board is selected. */
  onSelect: () => void
  /** Board title. */
  title: string
}

/** A selectable board entry inside {@link SidebarBoardList}. */
function SidebarBoardItem({
  active,
  canDelete,
  meta,
  onDeleteRequest,
  onRename,
  onSelect,
  title,
}: SidebarBoardItemProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleConfirm = () => {
    if (!inputRef.current) return

    const newTitle = inputRef.current.value.trim()

    if (newTitle && newTitle !== title) {
      onRename(newTitle)
    }

    setIsEditing(false)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault()
      handleConfirm()
    } else if (event.key === "Escape") {
      event.preventDefault()
      setIsEditing(false)
    }
  }

  return (
    <li>
      <div
        className={cn(
          "group relative flex w-full items-center gap-1 rounded-xl p-2.5",
          !active && "hover:bg-surface-inset/60"
        )}
      >
        {active && (
          <m.div
            className="absolute inset-0 rounded-xl bg-surface-raised"
            layoutId="active-board"
            transition={SPRING_SNAPPY}
          />
        )}
        {isEditing ? (
          <div className="relative z-10 flex min-w-0 flex-1 flex-col gap-1">
            <input
              aria-label="Board name"
              className="w-full rounded-md bg-transparent px-1 text-label font-medium text-ink-strong outline-none ring-1 ring-ring"
              defaultValue={title}
              onBlur={handleConfirm}
              onKeyDown={handleKeyDown}
              ref={inputRef}
              type="text"
            />
            <span className="text-caption text-ink-muted">{meta}</span>
          </div>
        ) : (
          <>
            <button
              aria-current={active ? "true" : undefined}
              className="relative z-10 flex min-w-0 flex-1 flex-col gap-1 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
              onClick={onSelect}
              type="button"
            >
              <span
                className={cn(
                  "truncate text-label font-medium",
                  active ? "text-ink-strong" : "text-ink"
                )}
              >
                {title}
              </span>
              <span className="text-caption text-ink-muted">{meta}</span>
            </button>
            <IconButton
              className="relative z-10 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
              label={`Rename ${title}`}
              onClick={(event) => {
                event.stopPropagation()
                setIsEditing(true)
                requestAnimationFrame(() => {
                  inputRef.current?.focus()
                  inputRef.current?.select()
                })
              }}
              size="sm"
              variant="ghost"
            >
              <SFPencil aria-hidden />
            </IconButton>
          </>
        )}
        {!isEditing && (
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton
                className="relative z-10 shrink-0"
                label={`More actions for ${title}`}
                size="sm"
                variant="ghost"
              >
                <SFEllipsis aria-hidden />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content align="end">
              <DropdownMenu.Item
                disabled={!canDelete}
                onSelect={onDeleteRequest}
                variant="destructive"
              >
                <SFTrash aria-hidden />
                Delete storyboard
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
      </div>
    </li>
  )
}

/** Props for {@link SidebarBoardSwitcher}. */
interface SidebarBoardSwitcherProps {
  /** All boards, used to render the numbered switcher buttons. */
  boards: Array<{ id: string }>
  className?: string
  /** Called when a numbered board button is activated. */
  onSelectBoard: (boardId: string) => void
  /** Id of the currently open board. */
  selectedBoardId: string
}

/** Compact row of numbered board-switcher buttons shown below the new-board
 * action in the expanded sidebar. Hidden when fewer than two boards exist. */
function SidebarBoardSwitcher({
  boards,
  className,
  onSelectBoard,
  selectedBoardId,
}: SidebarBoardSwitcherProps) {
  if (boards.length <= 1) return null

  return (
    <div className={cn("flex shrink-0 flex-wrap gap-1", className)}>
      {boards.map((board, index) => (
        <button
          key={board.id}
          aria-current={board.id === selectedBoardId ? "true" : undefined}
          aria-label={`Switch to storyboard ${index + 1}`}
          className={cn(
            "size-6 shrink-0 rounded-full text-caption font-medium tabular-nums outline-none transition-[color,background-color,transform] duration-150 ease-out active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel",
            board.id === selectedBoardId
              ? "bg-emphasis text-emphasis-foreground"
              : "bg-surface-inset text-ink-muted hover:text-ink-strong"
          )}
          onClick={() => onSelectBoard(board.id)}
          type="button"
        >
          {index + 1}
        </button>
      ))}
    </div>
  )
}

/** Footer status row of the {@link Sidebar}. */
function SidebarFooter({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-auto flex shrink-0 items-center gap-2 border-t border-surface-inset px-1.5 pt-3",
        className
      )}
      {...props}
    >
      <SFSquareGrid2x2 aria-hidden className="size-2.5 shrink-0 text-ink-muted" />
      <span className="text-caption text-ink-muted">{children}</span>
    </div>
  )
}

Sidebar.BoardItem = SidebarBoardItem
Sidebar.BoardList = SidebarBoardList
Sidebar.BoardSwitcher = SidebarBoardSwitcher
Sidebar.Footer = SidebarFooter
Sidebar.Header = SidebarHeader
Sidebar.NewBoardButton = SidebarNewBoardButton
Sidebar.Rail = SidebarRail
Sidebar.Search = SidebarSearch
Sidebar.Section = SidebarSection

export {
  Sidebar,
  type SidebarBoardItemProps,
  type SidebarBoardSwitcherProps,
  type SidebarHeaderProps,
  type SidebarRailProps,
  type SidebarSearchProps,
  type SidebarSectionProps,
}
