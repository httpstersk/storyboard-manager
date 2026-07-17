"use client"

import {
  SFArrowUp,
  SFArrowUpDocument,
  SFPaintbrush,
  SFPerson2CropSquareStack,
  SFTextDocument,
} from "sf-symbols-lib/monochrome"
import * as React from "react"

import { PromptComposerAttachmentGroup } from "@/components/storyboard/prompt-composer-attachment-group"
import {
  MAX_CHARACTER_SHEET_LENGTH,
  MAX_IMAGE_REFERENCES,
  type StoryboardGenerationRequest,
} from "@/lib/generation"
import { cn } from "@/lib/utils"
import { validateImageFile } from "@/lib/validation"

interface PromptComposerContextValue {
  characterImageReferences: File[]
  characterSheetText: string
  error: string | null
  isCharacterSheetOpen: boolean
  isSubmitting: boolean
  prompt: string
  removeCharacterImageReference: (index: number) => void
  removeStyleImageReference: (index: number) => void
  setCharacterImageReferences: React.Dispatch<React.SetStateAction<File[]>>
  setCharacterSheetText: (value: string) => void
  setError: (error: string | null) => void
  setIsCharacterSheetOpen: (isOpen: boolean) => void
  setPrompt: (value: string) => void
  setStyleImageReferences: React.Dispatch<React.SetStateAction<File[]>>
  styleImageReferences: File[]
  submit: () => Promise<void>
}

const PromptComposerContext =
  React.createContext<PromptComposerContextValue | null>(null)

function usePromptComposer(): PromptComposerContextValue {
  const context = React.use(PromptComposerContext)

  if (context === null) {
    throw new Error(
      "PromptComposer compound components must be used within <PromptComposer.Root>."
    )
  }

  return context
}

interface PromptComposerRootProps extends Omit<
  React.ComponentProps<"form">,
  "onSubmit"
> {
  /** Disables generation and all attachment controls. */
  disabled?: boolean
  /** Reports whether the composer currently holds focus. */
  onActiveChange?: (isActive: boolean) => void
  /** Sends a validated generation request to the workspace. */
  onSubmit: (request: StoryboardGenerationRequest) => Promise<void>
}

/**
 * Bottom-anchored cinematic prompt composer.
 *
 * ```tsx
 * <PromptComposer.Root onSubmit={generateStoryboard}>
 *   <PromptComposer.Input />
 *   <PromptComposer.Attachments />
 *   <PromptComposer.Actions />
 * </PromptComposer.Root>
 * ```
 */
function PromptComposerRoot({
  children,
  className,
  disabled = false,
  onActiveChange,
  onSubmit,
  ...props
}: PromptComposerRootProps) {
  const [characterImageReferences, setCharacterImageReferences] =
    React.useState<File[]>([])
  const [characterSheetText, setCharacterSheetText] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [isCharacterSheetOpen, setIsCharacterSheetOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [prompt, setPrompt] = React.useState("")
  const [styleImageReferences, setStyleImageReferences] = React.useState<
    File[]
  >([])

  const removeCharacterImageReference = (index: number) => {
    setCharacterImageReferences((current) =>
      current.filter((unusedFile, fileIndex) => fileIndex !== index)
    )
  }

  const removeStyleImageReference = (index: number) => {
    setStyleImageReferences((current) =>
      current.filter((unusedFile, fileIndex) => fileIndex !== index)
    )
  }

  const submit = async () => {
    const trimmedPrompt = prompt.trim()

    if (disabled || isSubmitting || trimmedPrompt === "") {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const [characterImageRefs, styleImageRefs] = await Promise.all([
        Promise.all(
          characterImageReferences.map((file) => readFileAsDataUrl(file))
        ),
        Promise.all(
          styleImageReferences.map((file) => readFileAsDataUrl(file))
        ),
      ])
      const trimmedCharacterSheet = characterSheetText.trim()

      await onSubmit({
        characterImageRefs,
        characterSheets:
          trimmedCharacterSheet === "" ? [] : [trimmedCharacterSheet],
        prompt: trimmedPrompt,
        styleImageRefs,
      })

      setCharacterImageReferences([])
      setCharacterSheetText("")
      setIsCharacterSheetOpen(false)
      setPrompt("")
      setStyleImageReferences([])
    } catch (submissionError) {
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Storyboard generation failed."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const contextValue: PromptComposerContextValue = {
    characterImageReferences,
    characterSheetText,
    error,
    isCharacterSheetOpen,
    isSubmitting,
    prompt,
    removeCharacterImageReference,
    removeStyleImageReference,
    setCharacterImageReferences,
    setCharacterSheetText,
    setError,
    setIsCharacterSheetOpen,
    setPrompt,
    setStyleImageReferences,
    styleImageReferences,
    submit,
  }

  return (
    <PromptComposerContext.Provider value={contextValue}>
      <form
        className={cn(
          "group/composer mx-auto w-full max-w-3xl shrink-0 overflow-hidden rounded-2xl border border-edge bg-surface-panel shadow-modal transition-[border-color,box-shadow] duration-200 ease-out focus-within:border-edge-strong focus-within:ring-1 focus-within:ring-ring/30 motion-reduce:transition-none",
          className
        )}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            onActiveChange?.(false)
          }
        }}
        onFocusCapture={() => onActiveChange?.(true)}
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
        {...props}
      >
        {children}
        {error !== null ? (
          <p className="px-4 pb-3 text-caption text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </PromptComposerContext.Provider>
  )
}

/** Primary storyline input and optional pasted character-sheet field. */
function PromptComposerInput() {
  const {
    characterSheetText,
    isCharacterSheetOpen,
    isSubmitting,
    prompt,
    setCharacterSheetText,
    setPrompt,
    submit,
  } = usePromptComposer()

  return (
    <div className="grid">
      <label className="sr-only" htmlFor="storyboard-prompt">
        Movie logline or storyline
      </label>
      <textarea
        className="max-h-44 min-h-14 resize-none bg-transparent px-4 pt-4 pb-3 text-body text-ink-strong transition-[min-height] duration-200 ease-out outline-none placeholder:text-ink-faint focus:min-h-24 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting}
        id="storyboard-prompt"
        maxLength={12_000}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            void submit()
          }
        }}
        placeholder="Describe a film, sequence, or complete storyline…"
        rows={1}
        value={prompt}
      />
      {isCharacterSheetOpen ? (
        <div className="mx-3 mb-3 rounded-xl border border-edge bg-surface-inset p-3">
          <label
            className="mb-2 flex items-center gap-1.5 text-caption font-medium text-ink"
            htmlFor="character-sheet"
          >
            <SFTextDocument aria-hidden className="size-3.5 text-ink-muted" />
            Character sheet
          </label>
          <textarea
            className="max-h-28 min-h-16 w-full resize-y rounded-lg bg-surface-panel px-3 py-2 text-label text-ink ring-1 ring-edge transition-shadow outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ring"
            disabled={isSubmitting}
            id="character-sheet"
            maxLength={MAX_CHARACTER_SHEET_LENGTH}
            onChange={(event) => setCharacterSheetText(event.target.value)}
            placeholder="Paste names, appearance, wardrobe, and continuity notes…"
            value={characterSheetText}
          />
        </div>
      ) : null}
    </div>
  )
}

/** Character and visual-style references shown in distinct labelled groups. */
function PromptComposerAttachments() {
  const {
    characterImageReferences,
    removeCharacterImageReference,
    removeStyleImageReference,
    styleImageReferences,
  } = usePromptComposer()

  if (
    characterImageReferences.length === 0 &&
    styleImageReferences.length === 0
  ) {
    return null
  }

  return (
    <div className="space-y-2 overflow-x-auto border-y border-edge bg-surface-inset px-3 py-2.5">
      <PromptComposerAttachmentGroup
        files={characterImageReferences}
        icon={
          <SFPerson2CropSquareStack aria-hidden className="size-3.5 shrink-0" />
        }
        label="Characters"
        onRemove={removeCharacterImageReference}
      />
      <PromptComposerAttachmentGroup
        files={styleImageReferences}
        icon={<SFPaintbrush aria-hidden className="size-3.5 shrink-0" />}
        label="Visual style"
        onRemove={removeStyleImageReference}
      />
    </div>
  )
}

/** Attachment affordances and generation submit control. */
function PromptComposerActions() {
  const {
    characterImageReferences,
    isCharacterSheetOpen,
    isSubmitting,
    prompt,
    setCharacterImageReferences,
    setCharacterSheetText,
    setError,
    setIsCharacterSheetOpen,
    setStyleImageReferences,
    styleImageReferences,
  } = usePromptComposer()
  const characterImageInputRef = React.useRef<HTMLInputElement>(null)
  const characterTextInputRef = React.useRef<HTMLInputElement>(null)
  const styleImageInputRef = React.useRef<HTMLInputElement>(null)
  const referenceCount =
    characterImageReferences.length + styleImageReferences.length
  const hasAvailableReferenceSlot = referenceCount < MAX_IMAGE_REFERENCES

  const addImageReferences = (
    files: File[],
    setReferences: React.Dispatch<React.SetStateAction<File[]>>
  ) => {
    const availableSlots = MAX_IMAGE_REFERENCES - referenceCount
    const validationResults = files.map((file) => ({
      file,
      validation: validateImageFile(file),
    }))
    const firstError = validationResults.find(
      ({ validation }) => !validation.ok
    )?.validation.error
    const acceptedFiles = validationResults
      .filter(({ validation }) => validation.ok)
      .map(({ file }) => file)
      .slice(0, availableSlots)

    setReferences((current) => [...current, ...acceptedFiles])
    setError(
      firstError ??
        (files.length > availableSlots
          ? `Attach up to ${MAX_IMAGE_REFERENCES} reference images in total.`
          : null)
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div
        aria-label="Prompt attachments"
        className="flex min-w-0 items-center gap-1"
        role="group"
      >
        <button
          aria-expanded={isCharacterSheetOpen}
          aria-label="Toggle written character sheet"
          className={cn(
            "flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-caption font-medium text-ink-muted transition-[background-color,color,transform] outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
            isCharacterSheetOpen && "bg-surface-inset text-ink-strong"
          )}
          disabled={isSubmitting}
          onClick={() => setIsCharacterSheetOpen(!isCharacterSheetOpen)}
          type="button"
        >
          <SFTextDocument aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Character notes</span>
        </button>
        <button
          aria-label="Upload character sheet text file"
          className="grid size-9 place-items-center rounded-lg text-ink-muted transition-[background-color,color,transform] outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          disabled={isSubmitting}
          onClick={() => characterTextInputRef.current?.click()}
          type="button"
        >
          <SFArrowUpDocument aria-hidden className="size-3.5" />
        </button>
        <button
          aria-label="Attach character reference images"
          className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-caption font-medium text-ink-muted transition-[background-color,color,transform] outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isSubmitting || !hasAvailableReferenceSlot}
          onClick={() => characterImageInputRef.current?.click()}
          type="button"
        >
          <SFPerson2CropSquareStack aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Characters</span>
        </button>
        <button
          aria-label="Attach visual style reference images"
          className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-caption font-medium text-ink-muted transition-[background-color,color,transform] outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isSubmitting || !hasAvailableReferenceSlot}
          onClick={() => styleImageInputRef.current?.click()}
          type="button"
        >
          <SFPaintbrush aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Visual style</span>
        </button>
        <input
          accept="image/jpeg,image/png"
          aria-label="Character reference images"
          className="sr-only"
          multiple
          onChange={(event) => {
            addImageReferences(
              Array.from(event.target.files ?? []),
              setCharacterImageReferences
            )
            event.target.value = ""
          }}
          ref={characterImageInputRef}
          type="file"
        />
        <input
          accept=".md,.txt,text/markdown,text/plain"
          aria-label="Character sheet text file"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]

            if (file) {
              void file
                .text()
                .then((text) => {
                  setCharacterSheetText(
                    text.slice(0, MAX_CHARACTER_SHEET_LENGTH)
                  )
                  setError(null)
                  setIsCharacterSheetOpen(true)
                })
                .catch(() => setError(`Could not read ${file.name}.`))
            }

            event.target.value = ""
          }}
          ref={characterTextInputRef}
          type="file"
        />
        <input
          accept="image/jpeg,image/png"
          aria-label="Visual style reference images"
          className="sr-only"
          multiple
          onChange={(event) => {
            addImageReferences(
              Array.from(event.target.files ?? []),
              setStyleImageReferences
            )
            event.target.value = ""
          }}
          ref={styleImageInputRef}
          type="file"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isSubmitting ? (
          <span
            aria-live="polite"
            className="hidden text-caption text-ink-muted sm:inline"
            role="status"
          >
            Directing scenes…
          </span>
        ) : null}
        <button
          aria-label="Generate storyboard"
          className="grid size-9 place-items-center rounded-full bg-emphasis text-emphasis-foreground transition-[filter,transform] outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isSubmitting || prompt.trim() === ""}
          type="submit"
        >
          <SFArrowUp aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}

const PromptComposer = {
  Actions: PromptComposerActions,
  Attachments: PromptComposerAttachments,
  Input: PromptComposerInput,
  Root: PromptComposerRoot,
}

export { PromptComposer }
