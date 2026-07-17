"use client"

import { AnimatePresence, m } from "motion/react"
import { SFArrowUp } from "sf-symbols-lib/monochrome"
import * as React from "react"

import { usePromptComposer } from "@/components/storyboard/prompt-composer-context"
import { PromptComposerImageEditActions } from "@/components/storyboard/prompt-composer-image-edit-actions"
import { ImageReferenceControl } from "@/components/storyboard/prompt-composer-image-reference-control"
import {
  MAX_IMAGE_REFERENCES,
  MAX_IMAGE_REFERENCES_ERROR,
} from "@/lib/generation"
import { TRANSITION_FADE_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { IMAGE_UPLOAD_RULES, validateImageFile } from "@/lib/validation"

/** Attachment affordances and generation submit control. */
function PromptComposerActions() {
  const {
    characterImageReferences,
    isCharacterSheetOpen,
    isDisabled,
    isSubmitting,
    mode,
    prompt,
    setCharacterImageReferences,
    setError,
    setIsCharacterSheetOpen,
    setStyleImageReferences,
    styleImageReferences,
    submit,
  } = usePromptComposer()
  const characterImageInputRef = React.useRef<HTMLInputElement>(null)
  const styleImageInputRef = React.useRef<HTMLInputElement>(null)
  const referenceCount =
    characterImageReferences.length + styleImageReferences.length
  const hasAvailableReferenceSlot = referenceCount < MAX_IMAGE_REFERENCES

  if (mode === "image-edit") {
    return <PromptComposerImageEditActions />
  }

  const addImageReferences = (
    files: File[],
    current: File[],
    setReferences: (files: File[]) => void
  ) => {
    const availableSlots = MAX_IMAGE_REFERENCES - referenceCount
    const acceptedFiles: File[] = []
    let firstError: string | undefined

    for (const file of files) {
      const validation = validateImageFile(file)

      if (!validation.ok) {
        if (firstError === undefined) {
          firstError = validation.error
        }
        continue
      }

      if (acceptedFiles.length < availableSlots) {
        acceptedFiles.push(file)
      }
    }

    setReferences([...current, ...acceptedFiles])
    setError(
      firstError ??
        (files.length > availableSlots ? MAX_IMAGE_REFERENCES_ERROR : null)
    )
  }

  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 bg-surface-panel px-3 pt-2 pb-3">
      <div
        aria-label="Prompt attachments"
        className="flex min-w-0 flex-wrap items-center gap-1"
        role="group"
      >
        <button
          aria-expanded={isCharacterSheetOpen}
          aria-label="Toggle written character sheet"
          className={cn(
            "flex h-7 items-center rounded-full bg-surface-inset px-3 text-caption text-ink transition-[color,background-color,transform] duration-150 ease-out outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel active:scale-[0.97]",
            isCharacterSheetOpen && "text-ink-strong"
          )}
          disabled={isDisabled}
          onClick={() => setIsCharacterSheetOpen(!isCharacterSheetOpen)}
          type="button"
        >
          Character notes
        </button>
        <ImageReferenceControl
          canAdd={!isDisabled && hasAvailableReferenceSlot}
          canRemove={!isDisabled && characterImageReferences.length > 0}
          label="Characters"
          onAdd={() => characterImageInputRef.current?.click()}
          onRemoveLast={() =>
            setCharacterImageReferences(characterImageReferences.slice(0, -1))
          }
        />
        <ImageReferenceControl
          canAdd={!isDisabled && hasAvailableReferenceSlot}
          canRemove={!isDisabled && styleImageReferences.length > 0}
          label="Visual style"
          onAdd={() => styleImageInputRef.current?.click()}
          onRemoveLast={() =>
            setStyleImageReferences(styleImageReferences.slice(0, -1))
          }
        />
        <input
          accept={IMAGE_UPLOAD_RULES.acceptedTypes.join(",")}
          aria-label="Character reference images"
          className="sr-only"
          disabled={isDisabled}
          multiple
          onChange={(event) => {
            addImageReferences(
              Array.from(event.target.files ?? []),
              characterImageReferences,
              setCharacterImageReferences
            )
            event.target.value = ""
          }}
          ref={characterImageInputRef}
          tabIndex={-1}
          type="file"
        />
        <input
          accept={IMAGE_UPLOAD_RULES.acceptedTypes.join(",")}
          aria-label="Visual style reference images"
          className="sr-only"
          disabled={isDisabled}
          multiple
          onChange={(event) => {
            addImageReferences(
              Array.from(event.target.files ?? []),
              styleImageReferences,
              setStyleImageReferences
            )
            event.target.value = ""
          }}
          ref={styleImageInputRef}
          tabIndex={-1}
          type="file"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <AnimatePresence initial={false}>
          {isSubmitting ? (
            <m.span
              animate={{ opacity: 1, y: 0 }}
              aria-live="polite"
              className="hidden text-caption text-ink-muted sm:inline"
              exit={{ opacity: 0, y: -2 }}
              initial={{ opacity: 0, y: -2 }}
              key="composer-submitting"
              role="status"
              transition={TRANSITION_FADE_FAST}
            >
              Directing scenes…
            </m.span>
          ) : null}
        </AnimatePresence>
        <button
          aria-label="Generate storyboard"
          className="grid size-9 place-items-center rounded-full bg-emphasis text-emphasis-foreground transition-[background-color,transform] duration-150 ease-out outline-none hover:bg-emphasis/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isDisabled || prompt.trim() === ""}
          onClick={() => void submit()}
          type="button"
        >
          <SFArrowUp aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  )
}

export { PromptComposerActions }
