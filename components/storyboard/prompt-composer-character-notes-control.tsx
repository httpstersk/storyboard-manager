"use client"

import { DisclosureControl } from "@/components/storyboard/prompt-composer-disclosure-control"

interface CharacterNotesControlProps {
  /** Number of character rows with a name or notes entered. */
  characterCount: number
  /** Disables the toggle while generation is in flight. */
  isDisabled: boolean
  /** Whether the written character sheet is expanded. */
  isOpen: boolean
  /** Opens or closes the character notes editor. */
  onToggle: () => void
}

/** Attachment-style pill that toggles the written character sheet. */
function CharacterNotesControl({
  characterCount,
  isDisabled,
  isOpen,
  onToggle,
}: CharacterNotesControlProps) {
  const characterLabel =
    characterCount === 1 ? "1 character" : `${characterCount} characters`

  return (
    <DisclosureControl
      ariaLabel={`Character notes, ${characterLabel}`}
      count={characterCount}
      isDisabled={isDisabled}
      isOpen={isOpen}
      label="Character notes"
      onToggle={onToggle}
    />
  )
}

export { CharacterNotesControl, type CharacterNotesControlProps }
