"use client"

import { DisclosureControl } from "@/components/storyboard/prompt-composer-disclosure-control"

interface NotesControlProps {
  /** Number of rows in the group with a handle or notes entered. */
  count: number
  /** Disables the toggle while generation is in flight. */
  isDisabled: boolean
  /** Whether the written notes editor is expanded. */
  isOpen: boolean
  /** Pill label, e.g. `"Character Notes"`. */
  label: string
  /** Singular noun used in the accessible count, e.g. `"character"`. */
  noun: string
  /** Opens or closes the notes editor. */
  onToggle: () => void
}

/**
 * Attachment-style pill that toggles one written notes sheet. Rendered once
 * per composer note group (characters, environments).
 */
function NotesControl({
  count,
  isDisabled,
  isOpen,
  label,
  noun,
  onToggle,
}: NotesControlProps) {
  const countLabel = count === 1 ? `1 ${noun}` : `${count} ${noun}s`

  return (
    <DisclosureControl
      ariaLabel={`${label}, ${countLabel}`}
      count={count}
      isDisabled={isDisabled}
      isOpen={isOpen}
      label={label}
      onToggle={onToggle}
    />
  )
}

export { NotesControl, type NotesControlProps }
