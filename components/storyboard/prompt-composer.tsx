"use client"

import { AnimatePresence, m } from "motion/react"
import { SFXmark } from "sf-symbols-lib/monochrome"

import { PromptComposerActions } from "@/components/storyboard/prompt-composer-actions"
import { PromptComposerAttachments } from "@/components/storyboard/prompt-composer-attachments"
import {
  PromptComposerContext,
  type PromptComposerRootProps,
} from "@/components/storyboard/prompt-composer-context"
import { PromptComposerInput } from "@/components/storyboard/prompt-composer-input"
import { PromptComposerTrigger } from "@/components/storyboard/prompt-composer-trigger"
import { usePromptComposerRoot } from "@/components/storyboard/use-prompt-composer-root"
import { IconButton } from "@/components/ui/icon-button"
import { createEmptyComposerDraft } from "@/lib/board-composer"
import { TRANSITION_FADE_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"

/**
 * Draft used when no per-board draft is supplied (image-edit mode).
 * Module-level so its identity stays stable across renders.
 */
const FALLBACK_DRAFT = createEmptyComposerDraft()

/**
 * Snap heights (dvh percent) of the storyboard sheet: a low peek tall enough
 * for the storyline field and action pills, and a tall sheet that surfaces
 * notes editors and attachments without leaving the peek height at all.
 */
const SHEET_SNAP_POINTS = "55,92"

/** Resting snap the sheet opens at, matching the shortest declared point. */
const SHEET_SNAP_DEFAULT = "55"

/**
 * Bottom-anchored cinematic prompt composer.
 *
 * Characters, environments, uploads, and visual style are controlled through
 * the `draft` / `onDraftChange` props so they stay scoped to the owning
 * board; only the prompt text, errors, and disclosure state live in
 * {@link usePromptComposerRoot}, which owns every non-rendering concern so
 * this component stays focused on JSX layout.
 *
 * Storyboard mode renders an always-visible trigger pill plus a
 * `@magic-spells/bottom-sheet`; image-edit mode renders `children` inline in
 * a compact pill with no sheet. Both modes render {@link PromptComposerActions}
 * themselves -- consumers only place `Input` and, in storyboard mode,
 * `Attachments`.
 *
 * ```tsx
 * <PromptComposer.Root draft={draft} onDraftChange={patchDraft} onSubmit={generateStoryboard}>
 *   <PromptComposer.Input />
 *   <PromptComposer.Attachments />
 * </PromptComposer.Root>
 * ```
 */
function PromptComposerRoot({
  children,
  className,
  disabled = false,
  draft = FALLBACK_DRAFT,
  inputId = "storyboard-prompt",
  mode = "storyboard",
  onDraftChange,
  onImageEditSubmit,
  onSubmit,
}: PromptComposerRootProps) {
  const isImageEdit = mode === "image-edit"
  const {
    attachPanelEvents,
    contextValue,
    openSheet,
    sheetRef,
    sheetTitleId,
    triggerButtonRef,
  } = usePromptComposerRoot({
    disabled,
    draft,
    inputId,
    mode,
    onDraftChange,
    onImageEditSubmit,
    onSubmit,
  })
  const { error, isDisabled, prompt, submit } = contextValue

  const errorMessage = (
    <AnimatePresence initial={false}>
      {error !== null ? (
        <m.p
          animate={{ opacity: 1, y: 0 }}
          className={cn(
            "text-caption text-destructive",
            isImageEdit ? "w-full basis-full px-3 pb-1.5" : "px-4 pb-3"
          )}
          exit={{ opacity: 0, y: -2 }}
          initial={{ opacity: 0, y: -2 }}
          key="composer-error"
          role="alert"
          transition={TRANSITION_FADE_FAST}
        >
          {error}
        </m.p>
      ) : null}
    </AnimatePresence>
  )

  return (
    <PromptComposerContext.Provider value={contextValue}>
      {isImageEdit ? (
        <div
          aria-label="Image edit prompt composer"
          className={cn(
            "group/composer mx-auto w-full max-w-3xl shrink-0 overflow-hidden rounded-full bg-surface-inset shadow-popover transition-shadow duration-200 ease-out focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none",
            className
          )}
          role="group"
        >
          <div className="flex flex-wrap items-center gap-1.5 py-1 pl-1">
            {children}
            <PromptComposerActions />
            {errorMessage}
          </div>
        </div>
      ) : (
        <>
          <PromptComposerTrigger
            className={className}
            disabled={isDisabled}
            onOpen={openSheet}
            onSubmit={() => void submit()}
            prompt={prompt}
            triggerRef={triggerButtonRef}
          />
          <dialog-panel ref={attachPanelEvents}>
            <dialog aria-labelledby={sheetTitleId}>
              <bottom-sheet
                ref={sheetRef}
                snap={SHEET_SNAP_DEFAULT}
                snap-points={SHEET_SNAP_POINTS}
              >
                <bottom-sheet-header className="flex items-center justify-between px-4 pt-4 pb-1">
                  <h2
                    className="text-label font-medium text-ink-muted"
                    id={sheetTitleId}
                  >
                    Compose
                  </h2>
                  <IconButton
                    data-action-hide-dialog
                    label="Close"
                    size="lg"
                    variant="ghost"
                  >
                    <SFXmark aria-hidden />
                  </IconButton>
                </bottom-sheet-header>
                <bottom-sheet-content className="overflow-y-auto">
                  {children}
                  {errorMessage}
                </bottom-sheet-content>
                <bottom-sheet-footer>
                  <PromptComposerActions />
                </bottom-sheet-footer>
              </bottom-sheet>
            </dialog>
          </dialog-panel>
        </>
      )}
    </PromptComposerContext.Provider>
  )
}

const PromptComposer = {
  Attachments: PromptComposerAttachments,
  Input: PromptComposerInput,
  Root: PromptComposerRoot,
}

export { PromptComposer }
