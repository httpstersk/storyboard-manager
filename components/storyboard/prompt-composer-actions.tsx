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
  MAX_STYLE_IMAGE_REFERENCES_ERROR,
} from "@/lib/generation"
import { IMAGE_UPLOAD_RULES, validateImageFile } from "@/lib/validation"
import {
  MAX_SEEDANCE_ATTACHED_IMAGES,
  MAX_SEEDANCE_ATTACHED_IMAGES_ERROR,
} from "@/lib/video-generation"

/** Props for {@link PromptComposerImageInputs}. */
interface PromptComposerImageInputsProps {
  /** Ref for the hidden character reference file input. */
  characterImageInputRef: React.RefObject<HTMLInputElement | null>
  /** Ref for the hidden environment reference file input. */
  environmentImageInputRef: React.RefObject<HTMLInputElement | null>
  /** Disables the inputs while generation is unavailable or in flight. */
  isDisabled: boolean
  /** Accepts character reference files chosen in the native picker. */
  onCharacterChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** Accepts environment reference files chosen in the native picker. */
  onEnvironmentChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** Accepts visual-style reference files chosen in the native picker. */
  onStyleChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  /** Ref for the hidden visual-style reference file input. */
  styleImageInputRef: React.RefObject<HTMLInputElement | null>
}

/** Props for {@link SubmitButton}. */
interface SubmitButtonProps {
  /** Disables the button while generation is unavailable or in flight. */
  disabled: boolean
  /** Starts a storyboard generation from the current draft. */
  onClick: () => void
}

/**
 * Hidden file inputs that stay mounted in compact mode so a native picker
 * can finish selecting after the action pills unmount.
 */
function PromptComposerImageInputs({
  characterImageInputRef,
  environmentImageInputRef,
  isDisabled,
  onCharacterChange,
  onEnvironmentChange,
  onStyleChange,
  styleImageInputRef,
}: PromptComposerImageInputsProps) {
  return (
    <>
      <input
        accept={IMAGE_UPLOAD_RULES.acceptedTypes.join(",")}
        aria-label="Character reference images"
        className="sr-only"
        disabled={isDisabled}
        multiple
        onChange={onCharacterChange}
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
        onChange={onEnvironmentChange}
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
        onChange={onStyleChange}
        ref={styleImageInputRef}
        tabIndex={-1}
        type="file"
      />
    </>
  )
}

/** Circular arrow button shared by the compact and expanded action rows. */
function SubmitButton({ disabled, onClick }: SubmitButtonProps) {
  return (
    <button
      aria-label="Generate storyboard"
      className="grid size-9 place-items-center rounded-full bg-emphasis text-emphasis-foreground transition-[background-color,transform] duration-150 ease-out outline-none hover:bg-emphasis/85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <SFArrowUp aria-hidden className="size-4" />
    </button>
  )
}

/** Attachment affordances and generation submit control. */
function PromptComposerActions() {
  const {
    analyzeStyleImages,
    beginFilePicker,
    characters,
    environments,
    isCompact,
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
  const identityReferenceCount =
    characters.imageReferences.length + environments.imageReferences.length
  const canAddIdentityReference =
    !isDisabled && identityReferenceCount < MAX_SEEDANCE_ATTACHED_IMAGES
  const canAddStyleReference =
    !isDisabled && styleImageReferences.length < MAX_IMAGE_REFERENCES

  if (mode === "image-edit") {
    return <PromptComposerImageEditActions />
  }

  const addImageReferences = (
    availableSlots: number,
    current: File[],
    files: File[],
    overflowError: string,
    setReferences: (files: File[]) => void
  ): File[] => {
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
      firstError ?? (files.length > availableSlots ? overflowError : null)
    )

    return acceptedFiles
  }

  const imageInputs = (
    <PromptComposerImageInputs
      characterImageInputRef={characterImageInputRef}
      environmentImageInputRef={environmentImageInputRef}
      isDisabled={isDisabled}
      onCharacterChange={(event) => {
        addImageReferences(
          MAX_SEEDANCE_ATTACHED_IMAGES - identityReferenceCount,
          characters.imageReferences,
          Array.from(event.target.files ?? []),
          MAX_SEEDANCE_ATTACHED_IMAGES_ERROR,
          characters.setImageReferences
        )
        event.target.value = ""
      }}
      onEnvironmentChange={(event) => {
        addImageReferences(
          MAX_SEEDANCE_ATTACHED_IMAGES - identityReferenceCount,
          environments.imageReferences,
          Array.from(event.target.files ?? []),
          MAX_SEEDANCE_ATTACHED_IMAGES_ERROR,
          environments.setImageReferences
        )
        event.target.value = ""
      }}
      onStyleChange={(event) => {
        const accepted = addImageReferences(
          MAX_IMAGE_REFERENCES - styleImageReferences.length,
          styleImageReferences,
          Array.from(event.target.files ?? []),
          MAX_STYLE_IMAGE_REFERENCES_ERROR,
          setStyleImageReferences
        )
        event.target.value = ""

        if (accepted.length > 0) {
          analyzeStyleImages([...styleImageReferences, ...accepted])
        }
      }}
      styleImageInputRef={styleImageInputRef}
    />
  )

  return (
    <>
      {isCompact ? (
        <div className="flex shrink-0 items-center">
          <SubmitButton
            disabled={isDisabled || prompt.trim() === ""}
            onClick={() => void submit()}
          />
        </div>
      ) : (
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
              canAdd={canAddIdentityReference}
              label="Characters"
              onAdd={() => beginFilePicker(characterImageInputRef.current)}
            />
            <ImageReferenceControl
              canAdd={canAddIdentityReference}
              label="Environments"
              onAdd={() => beginFilePicker(environmentImageInputRef.current)}
            />
            <ImageReferenceControl
              canAdd={canAddStyleReference}
              label="Styles"
              onAdd={() => beginFilePicker(styleImageInputRef.current)}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <SubmitButton
              disabled={isDisabled || prompt.trim() === ""}
              onClick={() => void submit()}
            />
          </div>
        </div>
      )}
      {imageInputs}
    </>
  )
}

export { PromptComposerActions }
