"use client"

import { useAtomValue } from "jotai"
import { AnimatePresence, m } from "motion/react"
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
  MAX_IMAGE_REFERENCES_ERROR,
  type StoryboardGenerationRequest,
} from "@/lib/generation"
import { imageModelAtom } from "@/lib/image-model-settings"
import { EASE_OUT, TRANSITION_FADE_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { IMAGE_UPLOAD_RULES, validateImageFile } from "@/lib/validation"

/** Maximum bytes read from a character text file before character truncation. */
const MAX_CHARACTER_SHEET_FILE_BYTES = MAX_CHARACTER_SHEET_LENGTH * 4

interface PromptComposerContextValue {
  characterImageReferences: File[]
  characterSheetText: string
  error: string | null
  inputId: string
  isCharacterSheetOpen: boolean
  isDisabled: boolean
  isSubmitting: boolean
  mode: PromptComposerMode
  prompt: string
  removeCharacterImageReference: (index: number) => void
  removeStyleImageReference: (index: number) => void
  setCharacterImageReferences: (files: File[]) => void
  setCharacterSheetText: (value: string) => void
  setError: (error: string | null) => void
  setIsCharacterSheetOpen: (isOpen: boolean) => void
  setPrompt: (value: string) => void
  setStyleImageReferences: (files: File[]) => void
  styleImageReferences: File[]
  submit: () => void
}

/** Supported request modes for the reusable prompt composer. */
type PromptComposerMode = "image-edit" | "storyboard"

/** Cohesive form state for the composer, driven by {@link composerReducer}. */
interface ComposerState {
  characterImageReferences: File[]
  characterSheetText: string
  error: string | null
  isCharacterSheetOpen: boolean
  prompt: string
  styleImageReferences: File[]
}

type ComposerAction =
  | { characterImageReferences: File[]; type: "setCharacterImageReferences" }
  | { error: string | null; type: "setError" }
  | { isCharacterSheetOpen: boolean; type: "setCharacterSheetOpen" }
  | { prompt: string; type: "setPrompt" }
  | { styleImageReferences: File[]; type: "setStyleImageReferences" }
  | { text: string; type: "setCharacterSheetText" }
  | { type: "reset" }
  | { type: "resetPrompt" }

const INITIAL_COMPOSER_STATE: ComposerState = {
  characterImageReferences: [],
  characterSheetText: "",
  error: null,
  isCharacterSheetOpen: false,
  prompt: "",
  styleImageReferences: [],
}

function composerReducer(
  state: ComposerState,
  action: ComposerAction
): ComposerState {
  switch (action.type) {
    case "reset":
      return INITIAL_COMPOSER_STATE
    case "resetPrompt":
      return { ...state, prompt: "" }
    case "setCharacterImageReferences":
      return {
        ...state,
        characterImageReferences: action.characterImageReferences,
      }
    case "setCharacterSheetText":
      return { ...state, characterSheetText: action.text }
    case "setCharacterSheetOpen":
      return { ...state, isCharacterSheetOpen: action.isCharacterSheetOpen }
    case "setError":
      return { ...state, error: action.error }
    case "setPrompt":
      return { ...state, prompt: action.prompt }
    case "setStyleImageReferences":
      return { ...state, styleImageReferences: action.styleImageReferences }
  }
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
  /** Unique HTML id used to connect the primary input with its label. */
  inputId?: string
  /** Presents a concise image-editing input without storyboard attachments. */
  mode?: PromptComposerMode
  /** Reports whether the composer currently holds focus. */
  onActiveChange?: (isActive: boolean) => void
  /** Sends a validated scene image editing instruction to the dialog. */
  onImageEditSubmit?: (prompt: string) => Promise<void>
  /** Sends a validated generation request to the workspace. */
  onSubmit?: (request: StoryboardGenerationRequest) => Promise<void>
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
  inputId = "storyboard-prompt",
  mode = "storyboard",
  onActiveChange,
  onImageEditSubmit,
  onSubmit,
  ...props
}: PromptComposerRootProps) {
  const imageModel = useAtomValue(imageModelAtom)
  const [state, dispatch] = React.useReducer(
    composerReducer,
    INITIAL_COMPOSER_STATE
  )
  const [isSubmitting, startSubmitTransition] = React.useTransition()

  const removeCharacterImageReference = (index: number) => {
    dispatch({
      characterImageReferences: state.characterImageReferences.filter(
        (unusedFile, fileIndex) => fileIndex !== index
      ),
      type: "setCharacterImageReferences",
    })
  }

  const removeStyleImageReference = (index: number) => {
    dispatch({
      styleImageReferences: state.styleImageReferences.filter(
        (unusedFile, fileIndex) => fileIndex !== index
      ),
      type: "setStyleImageReferences",
    })
  }

  const submit = () => {
    const trimmedPrompt = state.prompt.trim()

    if (disabled || isSubmitting || trimmedPrompt === "") {
      return
    }

    startSubmitTransition(async () => {
      dispatch({ error: null, type: "setError" })

      try {
        if (mode === "image-edit") {
          if (onImageEditSubmit === undefined) {
            throw new Error("Image editing is unavailable.")
          }

          await onImageEditSubmit(trimmedPrompt)
          dispatch({ type: "resetPrompt" })

          return
        }

        if (onSubmit === undefined) {
          throw new Error("Storyboard generation is unavailable.")
        }

        const [characterImageRefs, styleImageRefs] = await Promise.all([
          Promise.all(
            state.characterImageReferences.map((file) =>
              readFileAsDataUrl(file)
            )
          ),
          Promise.all(
            state.styleImageReferences.map((file) => readFileAsDataUrl(file))
          ),
        ])
        const trimmedCharacterSheet = state.characterSheetText.trim()

        await onSubmit({
          characterImageRefs,
          characterSheets:
            trimmedCharacterSheet === "" ? [] : [trimmedCharacterSheet],
          imageModel,
          prompt: trimmedPrompt,
          styleImageRefs,
        })

        dispatch({ type: "reset" })
      } catch (submissionError) {
        dispatch({
          error:
            submissionError instanceof Error
              ? submissionError.message
              : "Storyboard generation failed.",
          type: "setError",
        })
      }
    })
  }

  const contextValue: PromptComposerContextValue = {
    characterImageReferences: state.characterImageReferences,
    characterSheetText: state.characterSheetText,
    error: state.error,
    inputId,
    isCharacterSheetOpen: state.isCharacterSheetOpen,
    isDisabled: disabled || isSubmitting,
    isSubmitting,
    mode,
    prompt: state.prompt,
    removeCharacterImageReference,
    removeStyleImageReference,
    setCharacterImageReferences: (characterImageReferences) =>
      dispatch({
        characterImageReferences,
        type: "setCharacterImageReferences",
      }),
    setCharacterSheetText: (text) =>
      dispatch({ text, type: "setCharacterSheetText" }),
    setError: (error) => dispatch({ error, type: "setError" }),
    setIsCharacterSheetOpen: (isCharacterSheetOpen) =>
      dispatch({ isCharacterSheetOpen, type: "setCharacterSheetOpen" }),
    setPrompt: (prompt) => dispatch({ prompt, type: "setPrompt" }),
    setStyleImageReferences: (styleImageReferences) =>
      dispatch({ styleImageReferences, type: "setStyleImageReferences" }),
    styleImageReferences: state.styleImageReferences,
    submit,
  }

  const isImageEdit = mode === "image-edit"

  return (
    <PromptComposerContext.Provider value={contextValue}>
      <form
        className={cn(
          "group/composer mx-auto w-full max-w-3xl shrink-0 border border-edge transition-[border-color,box-shadow] duration-200 ease-out focus-within:border-edge-strong focus-within:ring-1 focus-within:ring-ring/25 motion-reduce:transition-none",
          isImageEdit
            ? "flex flex-wrap items-center gap-1.5 rounded-full bg-surface-raised py-1 pl-1 shadow-sm focus-within:shadow-popover"
            : "max-h-[min(28rem,calc(100svh-8rem))] overflow-y-auto rounded-3xl bg-surface-raised shadow-sm focus-within:shadow-popover",
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
        <AnimatePresence initial={false}>
          {state.error !== null ? (
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
              {state.error}
            </m.p>
          ) : null}
        </AnimatePresence>
      </form>
    </PromptComposerContext.Provider>
  )
}

/** Primary storyline input and optional pasted character-sheet field. */
function PromptComposerInput() {
  const {
    characterSheetText,
    inputId,
    isCharacterSheetOpen,
    isDisabled,
    mode,
    prompt,
    setCharacterSheetText,
    setPrompt,
    submit,
  } = usePromptComposer()

  const isImageEdit = mode === "image-edit"

  return (
    <div className={isImageEdit ? "flex min-w-0 flex-1" : "grid"}>
      <label className="sr-only" htmlFor={inputId}>
        {isImageEdit
          ? "Describe the image changes"
          : "Movie logline or storyline"}
      </label>
      <textarea
        className={cn(
          "field-sizing-content w-full resize-none bg-transparent text-body text-ink-strong outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-60",
          isImageEdit
            ? "max-h-28 min-h-8 px-3 py-1.5"
            : "max-h-44 min-h-14 px-4 pt-4 pb-3"
        )}
        disabled={isDisabled}
        id={inputId}
        maxLength={12_000}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            void submit()
          }
        }}
        placeholder={
          isImageEdit
            ? "Describe how to change this scene…"
            : "Describe a film, sequence, or complete storyline…"
        }
        rows={1}
        value={prompt}
      />
      {isCharacterSheetOpen ? (
        <div className="mx-4 mb-3 rounded-xl border border-edge bg-surface-inset p-3">
          <label
            className="mb-2 flex items-center gap-1.5 text-caption font-medium text-ink"
            htmlFor="character-sheet"
          >
            <SFTextDocument aria-hidden className="size-3.5 text-ink-muted" />
            Character sheet
          </label>
          <textarea
            className="field-sizing-content max-h-28 min-h-16 w-full resize-y rounded-lg bg-surface-panel px-3 py-2 text-label text-ink ring-1 ring-edge transition-shadow outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ring"
            disabled={isDisabled}
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
    mode,
    removeCharacterImageReference,
    removeStyleImageReference,
    styleImageReferences,
  } = usePromptComposer()

  const hasAttachments =
    mode === "image-edit" ||
    (characterImageReferences.length === 0 && styleImageReferences.length === 0)

  return (
    <AnimatePresence initial={false}>
      {!hasAttachments ? (
        <m.div
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
          exit={{ opacity: 0, height: 0 }}
          initial={{ opacity: 0, height: 0 }}
          key="composer-attachments"
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          <div className="flex flex-col gap-3 border-y border-edge bg-surface-inset px-4 py-3">
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
        </m.div>
      ) : null}
    </AnimatePresence>
  )
}

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

  if (mode === "image-edit") {
    return <PromptComposerImageEditActions />
  }

  const addImageReferences = (
    files: File[],
    current: File[],
    setReferences: (files: File[]) => void
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

    setReferences([...current, ...acceptedFiles])
    setError(
      firstError ??
        (files.length > availableSlots ? MAX_IMAGE_REFERENCES_ERROR : null)
    )
  }

  return (
    <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 bg-surface-raised px-3 pt-2 pb-3">
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
          disabled={isDisabled}
          onClick={() => setIsCharacterSheetOpen(!isCharacterSheetOpen)}
          type="button"
        >
          <SFTextDocument aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Character notes</span>
        </button>
        <button
          aria-label="Upload character sheet text file"
          className="grid size-9 place-items-center rounded-lg text-ink-muted transition-[background-color,color,transform] outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          disabled={isDisabled}
          onClick={() => characterTextInputRef.current?.click()}
          type="button"
        >
          <SFArrowUpDocument aria-hidden className="size-3.5" />
        </button>
        <button
          aria-label="Attach character reference images"
          className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-caption font-medium text-ink-muted transition-[background-color,color,transform] outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isDisabled || !hasAvailableReferenceSlot}
          onClick={() => characterImageInputRef.current?.click()}
          type="button"
        >
          <SFPerson2CropSquareStack aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Characters</span>
        </button>
        <button
          aria-label="Attach visual style reference images"
          className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-caption font-medium text-ink-muted transition-[background-color,color,transform] outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
          disabled={isDisabled || !hasAvailableReferenceSlot}
          onClick={() => styleImageInputRef.current?.click()}
          type="button"
        >
          <SFPaintbrush aria-hidden className="size-3.5" />
          <span className="hidden sm:inline">Visual style</span>
        </button>
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
          accept=".md,.txt,text/markdown,text/plain"
          aria-label="Character sheet text file"
          className="sr-only"
          disabled={isDisabled}
          onChange={(event) => {
            const file = event.target.files?.[0]

            if (file) {
              void file
                .slice(0, MAX_CHARACTER_SHEET_FILE_BYTES)
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
          className="grid size-9 place-items-center rounded-full bg-emphasis text-emphasis-foreground transition-[filter,transform] outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.94] disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isDisabled || prompt.trim() === ""}
          type="submit"
        >
          <SFArrowUp aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  )
}

/** Submit action shown when the composer is embedded in the scene editor. */
function PromptComposerImageEditActions() {
  const { isDisabled, isSubmitting, prompt } = usePromptComposer()

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
        className="flex h-8 items-center gap-1.5 rounded-full bg-emphasis px-3 text-label font-medium text-emphasis-foreground transition-[filter,transform] outline-none hover:brightness-105 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={isDisabled || prompt.trim() === ""}
        type="submit"
      >
        <SFArrowUp aria-hidden className="size-3.5" />
        Apply edit
      </button>
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
