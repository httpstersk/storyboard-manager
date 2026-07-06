"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { SFMoon, SFSunMax } from "sf-symbols-lib/monochrome"
import { AnimatePresence, m } from "motion/react"
import { useTheme } from "next-themes"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Number of extra repeated letters that playfully pop into the brand name
 * while it is hovered (e.g. `Boooards` -> `Booooooooards`).
 */
const BRAND_EXTRA_LETTERS = 5

/** Per-letter stagger (seconds) for the brand hover reveal. */
const BRAND_LETTER_STAGGER = 0.05

/**
 * Quick fade applied to a letter's `opacity`. Kept much shorter than the
 * width spring so the clipped box is fully transparent before it finishes
 * collapsing — otherwise a half-clipped glyph would jam against the next
 * letter while the word closes back up.
 */
const BRAND_LETTER_FADE_DURATION = 0.18

/**
 * Bouncy spring shared by every inserted brand letter. Springs the letter's
 * `width` open so the surrounding text is pushed apart with a lively wobble.
 */
const BRAND_LETTER_TRANSITION = {
  bounce: 0.5,
  duration: 0.5,
  type: "spring",
} as const

/**
 * Vertical nudge (em) applied to each inserted letter. An `inline-block`
 * with `overflow: hidden` (required to clip the width reveal) is baseline-
 * aligned by its bottom edge rather than the text baseline, which lifts the
 * glyph; this pushes it back down so it sits level with the static letters.
 */
const BRAND_LETTER_BASELINE_NUDGE = "0.22em"

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
function BoardToolbar({
  className,
  ...props
}: React.ComponentProps<"header">) {
  return (
    <header
      className={cn(
        "flex min-h-12 h-auto shrink-0 flex-wrap items-center justify-between gap-x-6 gap-y-3 px-1 py-3 lg:h-12 lg:py-0",
        className
      )}
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

/**
 * Splits a product name around its first run of two-or-more identical
 * letters so that run can be playfully extended on hover. For `Boooards`
 * this yields `{ prefix: "B", repeated: "o", suffix: "ards" }`. Names
 * without a repeated run animate nothing (`repeated` is `null`).
 */
function splitRepeatedRun(name: string): {
  prefix: string
  repeated: string | null
  suffix: string
} {
  const match = name.match(/(.)\1+/)
  if (!match || match.index === undefined) {
    return { prefix: name, repeated: null, suffix: "" }
  }
  const start = match.index
  return {
    prefix: name.slice(0, start + match[0].length),
    repeated: match[1],
    suffix: name.slice(start + match[0].length),
  }
}

/** Product name and version of the {@link BoardToolbar}. */
function BoardToolbarBrand({
  className,
  name,
  version,
}: BoardToolbarBrandProps) {
  const [hovered, setHovered] = React.useState(false)
  const { prefix, repeated, suffix } = React.useMemo(
    () => splitRepeatedRun(name),
    [name]
  )

  return (
    <div className={cn("flex shrink-0 items-baseline gap-1.5", className)}>
      <span
        className="text-heading font-medium text-ink-strong"
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
      >
        {repeated === null ? (
          name
        ) : (
          <>
            {prefix}
            <AnimatePresence initial={false}>
              {hovered &&
                Array.from({ length: BRAND_EXTRA_LETTERS }, (_, index) => (
                  <m.span
                    animate={{ opacity: 1, width: "auto" }}
                    className="inline-block overflow-hidden whitespace-pre align-baseline"
                    exit={{ opacity: 0, width: 0 }}
                    initial={{ opacity: 0, width: 0 }}
                    key={index}
                    style={{ y: BRAND_LETTER_BASELINE_NUDGE }}
                    transition={{
                      ...BRAND_LETTER_TRANSITION,
                      delay: index * BRAND_LETTER_STAGGER,
                      opacity: {
                        delay: index * BRAND_LETTER_STAGGER,
                        duration: BRAND_LETTER_FADE_DURATION,
                      },
                    }}
                  >
                    {repeated}
                  </m.span>
                ))}
            </AnimatePresence>
            {suffix}
          </>
        )}
      </span>
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
      className={cn(
        "flex w-full flex-wrap items-center gap-x-6 gap-y-2 lg:w-auto lg:flex-1",
        className
      )}
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
      className={cn("flex w-full flex-wrap items-center gap-2 lg:w-auto lg:shrink-0", className)}
      {...props}
    />
  )
}

const boardToolbarActionVariants = cva(
  "flex h-7 items-center gap-1.5 rounded-full px-3 text-caption font-medium outline-none transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-app [&_svg]:size-2.75 [&_svg]:shrink-0",
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
 * `aria-pressed` state and the sliding indicator are only attached after
 * hydration because the persisted theme is unknown on the server.
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
      <ThemeToggleOption
        active={hydrated ? resolvedTheme === "light" : undefined}
        fallbackClassName="bg-surface-raised text-ink-strong dark:bg-transparent dark:text-ink-muted"
        label="Light theme"
        onClick={() => setTheme("light")}
      >
        <SFSunMax aria-hidden className="relative z-10 size-2.75" />
      </ThemeToggleOption>
      <ThemeToggleOption
        active={hydrated ? resolvedTheme === "dark" : undefined}
        fallbackClassName="text-ink-muted dark:bg-surface-raised dark:text-ink-strong"
        label="Dark theme"
        onClick={() => setTheme("dark")}
      >
        <SFMoon aria-hidden className="relative z-10 size-2.75" />
      </ThemeToggleOption>
    </div>
  )
}

interface ThemeToggleOptionProps {
  /** Whether this option is active; `undefined` before hydration. */
  active: boolean | undefined
  children: React.ReactNode
  /** Pre-hydration styling driven by the `dark:` class already on `<html>`. */
  fallbackClassName: string
  label: string
  onClick: () => void
}

/**
 * A single light/dark option of {@link BoardToolbarThemeToggle}.
 *
 * `next-themes` disables CSS transitions site-wide while it swaps the
 * `dark` class (`disableTransitionOnChange`, set in `theme-provider.tsx`)
 * to avoid every element on the page cross-fading at once. That means a
 * plain CSS transition on this background would never actually animate.
 * A `motion.div` sidesteps this: once hydrated, a single shared
 * `layoutId="theme-toggle-thumb"` element is rendered inside whichever
 * option is active, and Motion animates it sliding to its new position
 * with a snappy, low-bounce spring whenever the active option changes.
 */
function ThemeToggleOption({
  active,
  children,
  fallbackClassName,
  label,
  onClick,
}: ThemeToggleOptionProps) {
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative flex size-6 items-center justify-center rounded-full text-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-ring",
        active === undefined ? fallbackClassName : active && "text-ink-strong"
      )}
      onClick={onClick}
      type="button"
    >
      {active && (
        <m.div
          className="absolute inset-0 rounded-full bg-surface-raised"
          layoutId="theme-toggle-thumb"
          transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
        />
      )}
      {children}
    </button>
  )
}

BoardToolbar.Action = BoardToolbarAction
BoardToolbar.Actions = BoardToolbarActions
BoardToolbar.Brand = BoardToolbarBrand
BoardToolbar.Controls = BoardToolbarControls
BoardToolbar.ThemeToggle = BoardToolbarThemeToggle

export {
  BoardToolbar,
  type BoardToolbarActionProps,
  type BoardToolbarBrandProps,
}
