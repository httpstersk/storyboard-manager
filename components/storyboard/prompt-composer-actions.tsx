"use client"

import { SFArrowUp } from "sf-symbols-lib/monochrome"
import * as React from "react"

import { usePromptComposer } from "@/components/storyboard/prompt-composer-context"
import { DisclosureControl } from "@/components/storyboard/prompt-composer-disclosure-control"
import { PromptComposerImageEditActions } from "@/components/storyboard/prompt-composer-image-edit-actions"
import { ImageReferenceControl } from "@/components/storyboard/prompt-composer-image-reference-control"
import { NotesControl } from "@/components/storyboard/prompt-composer-notes-control"
import { isComposerNoteFilled } from "@/lib/board-composer"
import {
  MAX_IMAGE_REFERENCES,
  MAX_IMAGE_REFERENCES_ERROR,
} from "@/lib/generation"
import { IMAGE_UPLOAD_RULES, validateImageFile } from "@/lib/validation"

/** Attachment affordances and generation submit control. */
function PromptComposerActions() {
  const {
    analyzeStyleImages,
    characters,
    environments,
    isDisabled,
    isVisualStyleOpen,
    mode,
    prompt,
    setError,
    setIsVisualStyleOpen,
    setStyleImageReferences,
    styleImageReferences,
    submit,
  } = usePromptComposer()
  const characterImageInputRef = React.useRef<HTMLInputElement>(null)
  const environmentImageInputRef = React.useRef<HTMLInputElement>(null)
  const styleImageInputRef = React.useRef<HTMLInputElement>(null)
  // Characters, environments, and styles share one model input-image budget.
  const referenceCount =
    characters.imageReferences.length +
    environments.imageReferences.length +
    styleImageReferences.length
  const hasAvailableReferenceSlot = referenceCount < MAX_IMAGE_REFERENCES
  const canAddReference = !isDisabled && hasAvailableReferenceSlot

  if (mode === "image-edit") {
    return <PromptComposerImageEditActions />
  }

  const addImageReferences = (
    files: File[],
    current: File[],
    setReferences: (files: File[]) => void
  ): File[] => {
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

    return acceptedFiles
  }

  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 bg-surface-panel px-3 pt-2 pb-3">
      <div
        aria-label="Prompt attachments"
        className="flex min-w-0 flex-wrap items-center gap-1"
        role="group"
      >
        <NotesControl
          count={characters.notes.filter(isComposerNoteFilled).length}
          isDisabled={isDisabled}
          isOpen={characters.isOpen}
          label="Character Notes"
          noun="character"
          onToggle={() => characters.setIsOpen(!characters.isOpen)}
        />
        <NotesControl
          count={environments.notes.filter(isComposerNoteFilled).length}
          isDisabled={isDisabled}
          isOpen={environments.isOpen}
          label="Environment Notes"
          noun="environment"
          onToggle={() => environments.setIsOpen(!environments.isOpen)}
        />
        <DisclosureControl
          isDisabled={isDisabled}
          isOpen={isVisualStyleOpen}
          label="Visual Note"
          onToggle={() => setIsVisualStyleOpen(!isVisualStyleOpen)}
        />
        <ImageReferenceControl
          canAdd={canAddReference}
          label="Characters"
          onAdd={() => characterImageInputRef.current?.click()}
        />
        <ImageReferenceControl
          canAdd={canAddReference}
          label="Environments"
          onAdd={() => environmentImageInputRef.current?.click()}
        />
        <ImageReferenceControl
          canAdd={canAddReference}
          label="Styles"
          onAdd={() => styleImageInputRef.current?.click()}
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
              characters.imageReferences,
              characters.setImageReferences
            )
            event.target.value = ""
          }}
          ref={characterImageInputRef}
          tabIndex={-1}
          type="file"
        />
        <input
          accept={IMAGE_UPLOAD_RULES.acceptedTypes.join(",")}
          aria-label="Environment reference images"
          className="sr-only"
          disabled={isDisabled}
          multiple
          onChange={(event) => {
            addImageReferences(
              Array.from(event.target.files ?? []),
              environments.imageReferences,
              environments.setImageReferences
            )
            event.target.value = ""
          }}
          ref={environmentImageInputRef}
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
            const accepted = addImageReferences(
              Array.from(event.target.files ?? []),
              styleImageReferences,
              setStyleImageReferences
            )
            event.target.value = ""

            if (accepted.length > 0) {
              analyzeStyleImages([...styleImageReferences, ...accepted])
            }
          }}
          ref={styleImageInputRef}
          tabIndex={-1}
          type="file"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
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
