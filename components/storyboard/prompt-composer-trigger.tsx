"use client"

import * as React from "react"

import { SubmitButton } from "@/components/storyboard/prompt-composer-actions"
import { cn } from "@/lib/utils"

/** Placeholder shown in the trigger pill before any storyline is typed. */
const TRIGGER_PLACEHOLDER = "Describe a film, sequence, or complete storyline…"

/** Props for {@link PromptComposerTrigger}. */
interface PromptComposerTriggerProps {
  /** Additional classes merged onto the pill's outer shell. */
  className?: string
  /** Disables opening the sheet and submitting. */
  disabled?: boolean
  /** Opens the bottom sheet, focusing the primary textarea once shown. */
  onOpen: () => void
  /** Submits the current prompt directly, without opening the sheet. */
  onSubmit: () => void
  /** Current storyline text, previewed truncated in the pill. */
  prompt: string
  /**
   * Ref of the open affordance, handed to `bottomSheet.show()` so focus
   * returns here once the sheet closes.
   */
  triggerRef: React.Ref<HTMLButtonElement>
}

/**
 * Always-visible, pill-shaped affordance that opens the storyboard prompt
 * composer's bottom sheet. Doubles as a quick preview of the current
 * storyline and a one-tap submit when a prompt is already typed.
 */
function PromptComposerTrigger({
  className,
  disabled = false,
  onOpen,
  onSubmit,
  prompt,
  triggerRef,
}: PromptComposerTriggerProps) {
  const trimmedPrompt = prompt.trim()

  return (
    <div
      className={cn(
        "mx-auto flex w-full max-w-3xl items-center gap-2 rounded-full bg-surface-panel py-1.5 pr-1.5 pl-4 shadow-popover transition-shadow duration-150 ease-out hover:shadow-modal",
        className
      )}
    >
      <button
        aria-haspopup="dialog"
        className="flex h-9 min-w-0 flex-1 items-center rounded-lg text-left text-body outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel disabled:cursor-not-allowed disabled:opacity-60"
        disabled={disabled}
        onClick={onOpen}
        ref={triggerRef}
        type="button"
      >
        <span
          className={cn(
            "block w-full truncate",
            trimmedPrompt === "" ? "text-ink-faint" : "text-ink-strong"
          )}
        >
          {trimmedPrompt === "" ? TRIGGER_PLACEHOLDER : prompt}
        </span>
      </button>
      <SubmitButton
        disabled={disabled || trimmedPrompt === ""}
        onClick={onSubmit}
      />
    </div>
  )
}

export { PromptComposerTrigger }
