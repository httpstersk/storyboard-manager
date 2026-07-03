"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * The board header toolbar.
 *
 * ```tsx
 * <BoardToolbar>
 *   <BoardToolbar.Brand name="boards" version="v1.2" />
 *   <BoardToolbar.Controls>...</BoardToolbar.Controls>
 *   <BoardToolbar.Actions>
 *     <BoardToolbar.Action>Import</BoardToolbar.Action>
 *     <BoardToolbar.ThemeToggle />
 *   </BoardToolbar.Actions>
 * </BoardToolbar>
 * ```
 */
function BoardToolbarRoot({
  className,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      className={cn("flex h-12 shrink-0 items-center gap-6 px-1", className)}
      {...props}
    />
  )
}

/** Props for {@link BoardToolbarBrand}. */
interface BoardToolbarBrandProps {
  className?: string
  /** Product name. */
  name: string
  /** Version label shown next to the name. */
  version: string
}

/** Product name and version of the {@link BoardToolbar}. */
function BoardToolbarBrand({
  className,
  name,
  version,
}: BoardToolbarBrandProps) {
  return (
    <div className={cn("flex shrink-0 items-baseline gap-1.5", className)}>
      <span className="text-heading font-medium text-ink-strong">{name}</span>
      <span className="text-caption text-ink-muted">{version}</span>
    </div>
  )
}

/** Growing middle section of the {@link BoardToolbar}. */
function BoardToolbarControls({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex flex-1 items-center gap-6", className)}
      {...props}
    />
  )
}

/** Trailing actions section of the {@link BoardToolbar}. */
function BoardToolbarActions({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("flex shrink-0 items-center gap-2", className)}
      {...props}
    />
  )
}

const boardToolbarActionVariants = cva(
  "flex h-7.5 items-center gap-1.5 rounded-full px-3 text-caption font-medium transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-app [&_svg]:size-2.75 [&_svg]:shrink-0",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default:
          "bg-surface-inset text-ink hover:text-ink-strong",
        emphasis:
          "bg-emphasis text-emphasis-foreground hover:bg-emphasis/85",
      },
    },
  }
)

/** Props for {@link BoardToolbarAction}. */
interface BoardToolbarActionProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof boardToolbarActionVariants> {}

/** A pill action button inside {@link BoardToolbarActions}. */
function BoardToolbarAction({
  className,
  type = "button",
  variant,
  ...props
}: BoardToolbarActionProps) {
  return (
    <button
      className={cn(boardToolbarActionVariants({ className, variant }))}
      type={type}
      {...props}
    />
  )
}

const emptySubscribe = () => () => {}

/**
 * Light/dark theme switcher. Active-segment styling is driven by CSS
 * `dark:` variants so it renders correctly before hydration; the
 * `aria-pressed` state is only attached after hydration because the
 * persisted theme is unknown on the server.
 */
function BoardToolbarThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme()
  const hydrated = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  )

  return (
    <div
      aria-label="Colour theme"
      className={cn(
        "flex items-center gap-0.5 rounded-full bg-surface-inset p-0.5",
        className
      )}
      role="group"
    >
      <button
        aria-label="Light theme"
        aria-pressed={hydrated ? resolvedTheme === "light" : undefined}
        className="flex size-6 items-center justify-center rounded-full bg-surface-raised text-ink-strong outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-transparent dark:text-ink-muted"
        onClick={() => setTheme("light")}
        type="button"
      >
        <Sun aria-hidden className="size-2.75" />
      </button>
      <button
        aria-label="Dark theme"
        aria-pressed={hydrated ? resolvedTheme === "dark" : undefined}
        className="flex size-6 items-center justify-center rounded-full text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-ring dark:bg-surface-raised dark:text-ink-strong"
        onClick={() => setTheme("dark")}
        type="button"
      >
        <Moon aria-hidden className="size-2.75" />
      </button>
    </div>
  )
}

const BoardToolbar = Object.assign(BoardToolbarRoot, {
  Action: BoardToolbarAction,
  Actions: BoardToolbarActions,
  Brand: BoardToolbarBrand,
  Controls: BoardToolbarControls,
  ThemeToggle: BoardToolbarThemeToggle,
})

export {
  BoardToolbar,
  type BoardToolbarActionProps,
  type BoardToolbarBrandProps,
}
