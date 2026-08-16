"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface MentionListRootProps extends React.ComponentProps<"div"> {
  /** Stable id referenced by the textarea `aria-controls` attribute. */
  id: string
}

/**
 * Floating listbox of `@handles` for storyline mention autocomplete. Options
 * cover every composer note group, so a handle may name a character or an
 * environment.
 *
 * ```tsx
 * <MentionList id="composer-mentions">
 *   <MentionList.Option id="mention-0" isActive onSelect={…}>
 *     @Maya
 *   </MentionList.Option>
 * </MentionList>
 * ```
 */
function MentionListRoot({
  children,
  className,
  id,
  ...props
}: MentionListRootProps) {
  return (
    <div
      aria-label="Character and environment mentions"
      className={cn(
        "absolute top-full left-4 z-50 mt-1 min-w-44 max-w-64 overflow-hidden rounded-xl border border-edge bg-surface-raised p-1 shadow-popover",
        className
      )}
      id={id}
      role="listbox"
      {...props}
    >
      {children}
    </div>
  )
}

type MentionListEmptyProps = React.ComponentProps<"div">

/** Empty-state copy when no mention options are available. */
function MentionListEmpty({
  children,
  className,
  ...props
}: MentionListEmptyProps) {
  return (
    <div
      className={cn("px-2 py-1.5 text-caption text-ink-muted", className)}
      role="presentation"
      {...props}
    >
      {children}
    </div>
  )
}

interface MentionListOptionProps extends React.ComponentProps<"button"> {
  isActive: boolean
  onSelect: () => void
}

/** One selectable handle in a {@link MentionList}. */
function MentionListOption({
  children,
  className,
  isActive,
  onSelect,
  ...props
}: MentionListOptionProps) {
  return (
    <button
      {...props}
      aria-selected={isActive}
      className={cn(
        "flex w-full cursor-default items-center rounded-lg px-2 py-1.5 text-left text-label text-ink outline-none select-none",
        isActive && "bg-surface-panel text-ink-strong",
        className
      )}
      onMouseDown={(event) => {
        event.preventDefault()
        onSelect()
      }}
      role="option"
      type="button"
    >
      {children}
    </button>
  )
}

const MentionList = Object.assign(MentionListRoot, {
  Empty: MentionListEmpty,
  Option: MentionListOption,
})

export {
  MentionList,
  type MentionListEmptyProps,
  type MentionListOptionProps,
  type MentionListRootProps,
}
