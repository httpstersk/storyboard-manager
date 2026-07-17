"use client"

import { SFChevronDown } from "sf-symbols-lib/monochrome"

import {
  ATTACHMENT_PILL_CHIP_CLASS_NAME,
  ATTACHMENT_PILL_CLASS_NAME,
} from "@/components/storyboard/prompt-composer-attachment-pill"
import { cn } from "@/lib/utils"

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
    <button
      aria-expanded={isOpen}
      aria-label={`Character notes, ${characterLabel}`}
      className={cn(
        ATTACHMENT_PILL_CLASS_NAME,
        "transition-[color,transform] duration-150 ease-out outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
        isOpen && "text-ink-strong"
      )}
      disabled={isDisabled}
      onClick={onToggle}
      type="button"
    >
      <span>Character notes</span>
      <span className="flex items-center gap-0.5">
        <span
          aria-hidden
          className={cn(ATTACHMENT_PILL_CHIP_CLASS_NAME, "tabular-nums")}
        >
          {characterCount}
        </span>
        <span aria-hidden className={ATTACHMENT_PILL_CHIP_CLASS_NAME}>
          <SFChevronDown
            className={cn(
              "transition-transform duration-150 ease-out",
              isOpen && "rotate-180"
            )}
          />
        </span>
      </span>
    </button>
  )
}

export { CharacterNotesControl, type CharacterNotesControlProps }
