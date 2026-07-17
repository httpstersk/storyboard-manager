"use client"

import { AnimatePresence, m } from "motion/react"

import { usePromptComposer } from "@/components/storyboard/prompt-composer-context"
import { TRANSITION_FADE_FAST } from "@/lib/motion"

/** Submit action shown when the composer is embedded in the scene editor. */
function PromptComposerImageEditActions() {
  const { isDisabled, isSubmitting, prompt, submit } = usePromptComposer()

  return (
    <div className="flex shrink-0 items-center gap-1.5 pr-1">
      <AnimatePresence initial={false}>
        {isSubmitting ? (
          <m.span
            animate={{ opacity: 1, y: 0 }}
            aria-live="polite"
            className="text-caption text-ink-muted"
            exit={{ opacity: 0, y: -2 }}
            initial={{ opacity: 0, y: -2 }}
            key="composer-image-edit-submitting"
            role="status"
            transition={TRANSITION_FADE_FAST}
          >
            Editing image…
          </m.span>
        ) : null}
      </AnimatePresence>
      <button
        aria-label="Apply image edit"
        className="flex h-7 items-center rounded-full bg-emphasis px-3 text-label text-emphasis-foreground transition-[background-color,transform] duration-150 ease-out outline-none hover:bg-emphasis/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isDisabled || prompt.trim() === ""}
        onClick={() => void submit()}
        type="button"
      >
        Apply edit
      </button>
    </div>
  )
}

export { PromptComposerImageEditActions }
