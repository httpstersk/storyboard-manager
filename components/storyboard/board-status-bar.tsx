import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The slim status footer under the scene grid.
 *
 * ```tsx
 * <BoardStatusBar>
 *   <BoardStatusBar.Summary>8 scenes · 0:42 total · 16:9</BoardStatusBar.Summary>
 *   <BoardStatusBar.Autosave>Autosaved just now</BoardStatusBar.Autosave>
 * </BoardStatusBar>
 * ```
 */
function BoardStatusBarRoot({
  className,
  ...props
}: React.ComponentProps<"footer">) {
  return (
    <footer
      className={cn(
        "flex h-6 shrink-0 items-center justify-between px-1.5",
        className
      )}
      {...props}
    />
  )
}

/** Left-hand summary text of the {@link BoardStatusBar}. */
function BoardStatusBarSummary({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-caption text-ink-muted", className)}
      {...props}
    />
  )
}

/** Import/export error line of the {@link BoardStatusBar}. */
function BoardStatusBarError({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      className={cn("text-caption text-destructive", className)}
      role="alert"
      {...props}
    >
      {children}
    </p>
  )
}

/** Right-hand autosave indicator, announced politely when it changes. */
function BoardStatusBarAutosave({
  children,
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      aria-live="polite"
      className={cn(
        "flex items-center gap-1.5 text-caption text-ink-muted",
        className
      )}
      {...props}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-emphasis" />
      {children}
    </p>
  )
}

const BoardStatusBar = Object.assign(BoardStatusBarRoot, {
  Autosave: BoardStatusBarAutosave,
  Error: BoardStatusBarError,
  Summary: BoardStatusBarSummary,
})

export { BoardStatusBar }
