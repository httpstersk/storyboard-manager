"use client"

import { AnimatePresence, m } from "motion/react"
import * as React from "react"
import { SFPencil } from "sf-symbols-lib/monochrome"

import { PromptComposer } from "@/components/storyboard/prompt-composer"
import { IconButton } from "@/components/ui/icon-button"
import { SPRING_LAYOUT, TRANSITION_FADE_STANDARD } from "@/lib/motion"
import { cn } from "@/lib/utils"

/** Props for {@link EditSceneImagePromptRoot}. */
interface EditSceneImagePromptRootProps {
  /** Disables expand and submit while an edit request is in flight. */
  disabled?: boolean
  /** Unique HTML id for the expanded edit prompt field. */
  inputId: string
  /** Sends a validated scene image editing instruction. */
  onImageEditSubmit: (prompt: string) => Promise<void>
}

/**
 * Centered scene-image edit control: a black Edit pill that expands into the
 * compact image-edit composer.
 */
function EditSceneImagePromptRoot({
  disabled = false,
  inputId,
  onImageEditSubmit,
}: EditSceneImagePromptRootProps) {
  const [isExpanded, setIsExpanded] = React.useState(false)
  const shellRef = React.useRef<HTMLDivElement>(null)

  function collapse() {
    if (disabled) {
      return
    }

    setIsExpanded(false)
  }

  function expand() {
    setIsExpanded(true)
    // Focus after AnimatePresence commits the textarea on the next frames.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        shellRef.current
          ?.querySelector<HTMLTextAreaElement>("textarea")
          ?.focus()
      })
    })
  }

  async function handleImageEditSubmit(prompt: string) {
    await onImageEditSubmit(prompt)
    setIsExpanded(false)
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center px-4">
      <m.div
        aria-expanded={isExpanded}
        className={cn(
          "pointer-events-auto overflow-hidden rounded-full",
          isExpanded
            ? "w-[min(100%,24rem)] bg-surface-inset shadow-popover"
            : "w-auto bg-transparent"
        )}
        layout
        onBlurCapture={(event) => {
          if (
            !disabled &&
            !event.currentTarget.contains(event.relatedTarget as Node | null)
          ) {
            setIsExpanded(false)
          }
        }}
        onKeyDown={(event) => {
          if (event.key !== "Escape" || !isExpanded) {
            return
          }

          event.preventDefault()
          event.stopPropagation()
          collapse()
        }}
        ref={shellRef}
        transition={SPRING_LAYOUT}
      >
        <AnimatePresence initial={false} mode="popLayout">
          {isExpanded ? (
            <m.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="composer"
              transition={TRANSITION_FADE_STANDARD}
            >
              <PromptComposer.Root
                className="max-w-none bg-transparent shadow-none"
                disabled={disabled}
                inputId={inputId}
                mode="image-edit"
                onImageEditSubmit={handleImageEditSubmit}
              >
                <PromptComposer.Input />
                <PromptComposer.Actions />
              </PromptComposer.Root>
            </m.div>
          ) : (
            <m.div
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              initial={{ opacity: 0 }}
              key="pencil"
              layout="position"
              transition={TRANSITION_FADE_STANDARD}
            >
              <IconButton
                aria-expanded={false}
                disabled={disabled}
                label="Edit"
                onClick={expand}
                size="label"
                variant="emphasis"
              >
                <SFPencil aria-hidden />
                Edit
              </IconButton>
            </m.div>
          )}
        </AnimatePresence>
      </m.div>
    </div>
  )
}

const EditSceneImagePrompt = {
  Root: EditSceneImagePromptRoot,
}

export {
  EditSceneImagePrompt,
  type EditSceneImagePromptRootProps,
}
