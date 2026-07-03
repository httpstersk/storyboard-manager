"use client"

import {
  Ellipsis,
  LayoutGrid,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Search,
} from "lucide-react"
import * as React from "react"

import { IconButton } from "@/components/ui/icon-button"
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
function SidebarRoot({
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
        <PanelLeftClose aria-hidden />
      </IconButton>
    </div>
  )
}

/** Props for {@link SidebarRail}. */
interface SidebarRailProps {
  className?: string
  /** Called when the expand button is activated. */
  onExpand: () => void
  /** Called when the new board button is activated. */
  onNewBoard: () => void
}

/** Slim rail shown in place of the {@link Sidebar} while collapsed. */
function SidebarRail({ className, onExpand, onNewBoard }: SidebarRailProps) {
  return (
    <aside
      className={cn(
        "flex shrink-0 flex-col items-center gap-3 rounded-2xl bg-surface-panel p-3",
        className
      )}
    >
      <IconButton label="Expand sidebar" onClick={onExpand} size="sm">
        <PanelLeftOpen aria-hidden />
      </IconButton>
      <IconButton label="New storyboard" onClick={onNewBoard} size="sm">
        <Plus aria-hidden />
      </IconButton>
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
        "flex h-7.5 shrink-0 items-center justify-center gap-1.5 rounded-full bg-emphasis text-caption font-medium text-emphasis-foreground transition-colors outline-none hover:bg-emphasis/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel",
        className
      )}
      type={type}
      {...props}
    >
      <Plus aria-hidden className="size-2.75" />
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
      <Search aria-hidden className="size-2.5 shrink-0 text-ink-muted" />
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

/** A titled section of the {@link Sidebar}. */
function SidebarSection({ children, className, title }: SidebarSectionProps) {
  return (
    <div className={cn("flex min-h-0 flex-col gap-1.5", className)}>
      <h2 className="px-1.5 pt-1.5 pb-0.5 text-caption font-normal text-ink-muted">
        {title}
      </h2>
      {children}
    </div>
  )
}

/** List container for {@link SidebarBoardItem} entries. */
function SidebarBoardList({
  className,
  ...props
}: React.ComponentProps<"ul">) {
  return (
    <ul className={cn("flex flex-col gap-1.5", className)} {...props} />
  )
}

/** Props for {@link SidebarBoardItem}. */
interface SidebarBoardItemProps {
  /** Whether this board is the one currently open. */
  active: boolean
  /** Secondary line, for example "8 scenes · 0:42 · edited now". */
  meta: string
  /** Called when the board is selected. */
  onSelect: () => void
  /** Board title. */
  title: string
}

/** A selectable board entry inside {@link SidebarBoardList}. */
function SidebarBoardItem({
  active,
  meta,
  onSelect,
  title,
}: SidebarBoardItemProps) {
  return (
    <li>
      <button
        aria-current={active ? "true" : undefined}
        className={cn(
          "flex w-full flex-col gap-1 rounded-xl p-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active ? "bg-surface-raised" : "hover:bg-surface-inset/60"
        )}
        onClick={onSelect}
        type="button"
      >
        <span className="flex w-full items-center justify-between gap-2">
          <span
            className={cn(
              "truncate text-label font-medium",
              active ? "text-ink-strong" : "text-ink"
            )}
          >
            {title}
          </span>
          <Ellipsis aria-hidden className="size-2.75 shrink-0 text-ink-faint" />
        </span>
        <span className="text-caption text-ink-muted">{meta}</span>
      </button>
    </li>
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
      <LayoutGrid aria-hidden className="size-2.5 shrink-0 text-ink-muted" />
      <span className="text-caption text-ink-muted">{children}</span>
    </div>
  )
}

const Sidebar = Object.assign(SidebarRoot, {
  BoardItem: SidebarBoardItem,
  BoardList: SidebarBoardList,
  Footer: SidebarFooter,
  Header: SidebarHeader,
  NewBoardButton: SidebarNewBoardButton,
  Rail: SidebarRail,
  Search: SidebarSearch,
  Section: SidebarSection,
})

export {
  Sidebar,
  type SidebarBoardItemProps,
  type SidebarHeaderProps,
  type SidebarRailProps,
  type SidebarSearchProps,
  type SidebarSectionProps,
}
