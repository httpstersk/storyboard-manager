"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

interface CharacterMentionListRootProps extends React.ComponentProps<"div"> {
  /** Stable id referenced by the textarea `aria-controls` attribute. */
  id: string
}

/**
 * Floating listbox of character `@handles` for storyline mention autocomplete.
 *
 * ```tsx
 * <CharacterMentionList id="character-mentions">
 *   <CharacterMentionList.Option id="mention-0" isActive onSelect={…}>
 *     @Maya
 *   </CharacterMentionList.Option>
 * </CharacterMentionList>
 * ```
 */
function CharacterMentionListRoot({
  children,
  className,
  id,
  ...props
}: CharacterMentionListRootProps) {
  return (
    <div
      aria-label="Character mentions"
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

interface CharacterMentionListEmptyProps extends React.ComponentProps<"div"> {}

/** Empty-state copy when no mention options are available. */
function CharacterMentionListEmpty({
  children,
  className,
  ...props
}: CharacterMentionListEmptyProps) {
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

interface CharacterMentionListOptionProps extends React.ComponentProps<"button"> {
  isActive: boolean
  onSelect: () => void
}

/** One selectable character handle in a {@link CharacterMentionList}. */
function CharacterMentionListOption({
  children,
  className,
  isActive,
  onSelect,
  ...props
}: CharacterMentionListOptionProps) {
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

const CharacterMentionList = Object.assign(CharacterMentionListRoot, {
  Empty: CharacterMentionListEmpty,
  Option: CharacterMentionListOption,
})

export {
  CharacterMentionList,
  type CharacterMentionListEmptyProps,
  type CharacterMentionListOptionProps,
  type CharacterMentionListRootProps,
}
