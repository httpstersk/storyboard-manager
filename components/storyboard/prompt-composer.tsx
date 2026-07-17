"use client"

import {
  SFArrowUpCircleFill,
  SFPaperclip,
  SFPhoto,
  SFTextDocument,
  SFXmark,
} from "sf-symbols-lib/monochrome"
import * as React from "react"

import {
  MAX_CHARACTER_SHEET_LENGTH,
  MAX_IMAGE_REFERENCES,
  type StoryboardGenerationRequest,
} from "@/lib/generation"
import { cn } from "@/lib/utils"
import { validateImageFile } from "@/lib/validation"

interface PromptComposerContextValue {
  characterSheetText: string
  error: string | null
  imageReferences: File[]
  isCharacterSheetOpen: boolean
  isSubmitting: boolean
  prompt: string
  removeImageReference: (index: number) => void
  setCharacterSheetText: (value: string) => void
  setError: (error: string | null) => void
  setImageReferences: React.Dispatch<React.SetStateAction<File[]>>
  setIsCharacterSheetOpen: (isOpen: boolean) => void
  setPrompt: (value: string) => void
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
  const [characterSheetText, setCharacterSheetText] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [imageReferences, setImageReferences] = React.useState<File[]>([])
  const [isCharacterSheetOpen, setIsCharacterSheetOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [prompt, setPrompt] = React.useState("")

  const removeImageReference = (index: number) => {
    setImageReferences((current) =>
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
      const imageRefs = await Promise.all(
        imageReferences.map((file) => readFileAsDataUrl(file))
      )
      const trimmedCharacterSheet = characterSheetText.trim()

      await onSubmit({
        characterSheets:
          trimmedCharacterSheet === "" ? [] : [trimmedCharacterSheet],
        imageRefs,
        prompt: trimmedPrompt,
      })

      setCharacterSheetText("")
      setImageReferences([])
      setIsCharacterSheetOpen(false)
      setPrompt("")
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
    characterSheetText,
    error,
    imageReferences,
    isCharacterSheetOpen,
    isSubmitting,
    prompt,
    removeImageReference,
    setCharacterSheetText,
    setError,
    setImageReferences,
    setIsCharacterSheetOpen,
    setPrompt,
    submit,
  }

  return (
    <PromptComposerContext.Provider value={contextValue}>
      <form
        className={cn(
          "group/composer mx-auto w-full max-w-3xl shrink-0 overflow-hidden rounded-2xl border border-edge bg-surface-panel shadow-popover transition-[border-color,box-shadow] duration-200 ease-out focus-within:border-edge-strong focus-within:ring-1 focus-within:ring-ring/30 motion-reduce:transition-none",
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
        className="max-h-40 min-h-12 resize-none bg-transparent px-4 pt-3.5 pb-2 text-body text-ink-strong transition-[min-height] duration-200 ease-out outline-none placeholder:text-ink-faint focus:min-h-20 disabled:cursor-not-allowed disabled:opacity-60"
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
        <div className="mx-3 mb-2 border-t border-edge pt-2">
          <label
            className="mb-1.5 block text-caption font-medium text-ink-muted"
            htmlFor="character-sheet"
          >
            Character sheet
          </label>
          <textarea
            className="max-h-28 min-h-16 w-full resize-y bg-surface-inset px-3 py-2 text-label text-ink ring-1 ring-edge transition-shadow outline-none focus:ring-2 focus:ring-ring"
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

/** Selected visual references shown above the action row. */
function PromptComposerAttachments() {
  const { imageReferences, removeImageReference } = usePromptComposer()

  if (imageReferences.length === 0) {
    return null
  }

  return (
    <ul
      aria-label="Visual references"
      className="flex gap-2 overflow-x-auto px-3 pb-2"
    >
      {imageReferences.map((file, index) => (
        <li
          className="flex max-w-44 shrink-0 items-center gap-2 rounded-lg bg-surface-inset px-2.5 py-1.5 text-caption text-ink"
          key={`${file.name}-${file.lastModified}`}
        >
          <SFPhoto aria-hidden className="size-3.5 shrink-0 text-ink-muted" />
          <span className="truncate">{file.name}</span>
          <button
            aria-label={`Remove ${file.name}`}
            className="grid size-5 shrink-0 place-items-center rounded-md text-ink-muted transition-colors outline-none hover:bg-surface-raised hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => removeImageReference(index)}
            type="button"
          >
            <SFXmark aria-hidden className="size-2.5" />
          </button>
        </li>
      ))}
    </ul>
  )
}

/** Attachment affordances and generation submit control. */
function PromptComposerActions() {
  const {
    imageReferences,
    isCharacterSheetOpen,
    isSubmitting,
    prompt,
    setCharacterSheetText,
    setError,
    setImageReferences,
    setIsCharacterSheetOpen,
  } = usePromptComposer()
  const characterFileInputRef = React.useRef<HTMLInputElement>(null)
  const imageInputRef = React.useRef<HTMLInputElement>(null)

  const addImageReferences = (files: File[]) => {
    const availableSlots = MAX_IMAGE_REFERENCES - imageReferences.length
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

    setImageReferences((current) => [...current, ...acceptedFiles])
    setError(
      firstError ??
        (files.length > availableSlots
          ? `Attach up to ${MAX_IMAGE_REFERENCES} visual references.`
          : null)
    )
  }

  return (
    <div className="flex items-center justify-between gap-3 px-3 pb-3">
      <div className="flex min-w-0 items-center gap-1">
        <button
          aria-expanded={isCharacterSheetOpen}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-caption text-ink-muted transition-[background-color,color,transform] outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]",
            isCharacterSheetOpen && "bg-surface-inset text-ink-strong"
          )}
          disabled={isSubmitting}
          onClick={() => setIsCharacterSheetOpen(!isCharacterSheetOpen)}
          type="button"
        >
          <SFTextDocument aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Characters</span>
        </button>
        <button
          aria-label="Attach a character sheet file"
          className="grid size-8 place-items-center rounded-lg text-ink-muted transition-[background-color,color,transform] outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          disabled={isSubmitting}
          onClick={() => characterFileInputRef.current?.click()}
          type="button"
        >
          <SFPaperclip aria-hidden className="size-3.5" />
        </button>
        <button
          className="flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-caption text-ink-muted transition-[background-color,color,transform] outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={
            isSubmitting || imageReferences.length >= MAX_IMAGE_REFERENCES
          }
          onClick={() => imageInputRef.current?.click()}
          type="button"
        >
          <SFPhoto aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Visuals</span>
        </button>
        <input
          accept=".md,.txt,text/markdown,text/plain"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0]

            if (file) {
              void file.text().then((text) => {
                setCharacterSheetText(text.slice(0, MAX_CHARACTER_SHEET_LENGTH))
                setIsCharacterSheetOpen(true)
              })
            }

            event.target.value = ""
          }}
          ref={characterFileInputRef}
          type="file"
        />
        <input
          accept="image/jpeg,image/png"
          className="sr-only"
          multiple
          onChange={(event) => {
            addImageReferences(Array.from(event.target.files ?? []))
            event.target.value = ""
          }}
          ref={imageInputRef}
          type="file"
        />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {isSubmitting ? (
          <span
            aria-live="polite"
            className="text-caption text-ink-muted"
            role="status"
          >
            Directing scenes…
          </span>
        ) : null}
        <button
          aria-label="Generate storyboard"
          className="grid size-8 place-items-center rounded-lg bg-emphasis text-emphasis-foreground transition-[filter,transform] outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isSubmitting || prompt.trim() === ""}
          type="submit"
        >
          <SFArrowUpCircleFill aria-hidden className="size-5" />
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
