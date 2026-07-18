"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { AnimatePresence, m } from "motion/react"
import * as React from "react"

import { PromptComposerActions } from "@/components/storyboard/prompt-composer-actions"
import { PromptComposerAttachments } from "@/components/storyboard/prompt-composer-attachments"
import {
  composerReducer,
  INITIAL_COMPOSER_STATE,
  PromptComposerContext,
  type PromptComposerContextValue,
  type PromptComposerRootProps,
  readFileAsDataUrl,
} from "@/components/storyboard/prompt-composer-context"
import { PromptComposerInput } from "@/components/storyboard/prompt-composer-input"
import {
  createEmptyComposerDraft,
  MAX_CHARACTER_SHEETS,
  nextCharacterNoteId,
  serializeCharacterNote,
} from "@/lib/board-composer"
import { imageModelAtom } from "@/lib/image-model-settings"
import { imageResolutionAtom } from "@/lib/image-resolution-settings"
import { TRANSITION_FADE_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { MAX_SEEDANCE_CHARACTER_IMAGES } from "@/lib/video-generation"
import {
  composerCharacterImageFilesAtom,
  composerVisualStyleAtom,
  videoPromptSourceAtom,
} from "@/lib/video-section-atoms"

/**
 * Draft used when no per-board draft is supplied (image-edit mode).
 * Module-level so its identity stays stable across renders.
 */
const FALLBACK_DRAFT = createEmptyComposerDraft()

/**
 * Bottom-anchored cinematic prompt composer.
 *
 * Characters, uploads, and visual style are controlled through the
 * `draft` / `onDraftChange` props so they stay scoped to the owning
 * board; only the prompt text, errors, and disclosure state live here.
 *
 * ```tsx
 * <PromptComposer.Root draft={draft} onDraftChange={patchDraft} onSubmit={generateStoryboard}>
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
  draft = FALLBACK_DRAFT,
  inputId = "storyboard-prompt",
  mode = "storyboard",
  onActiveChange,
  onDraftChange,
  onImageEditSubmit,
  onSubmit,
  ...props
}: PromptComposerRootProps) {
  const imageModel = useAtomValue(imageModelAtom)
  const imageResolution = useAtomValue(imageResolutionAtom)
  const setCharacterImageFiles = useSetAtom(composerCharacterImageFilesAtom)
  const setComposerVisualStyle = useSetAtom(composerVisualStyleAtom)
  const setVideoPromptSource = useSetAtom(videoPromptSourceAtom)
  const [state, dispatch] = React.useReducer(
    composerReducer,
    INITIAL_COMPOSER_STATE
  )
  const [isSubmitting, startSubmitTransition] = React.useTransition()

  // Sync character/style data into video + edit atoms. Keyed off the
  // per-board draft, so switching boards re-syncs to the new selection.
  // NOTE: The companion sync for `scenes` lives in VideoSectionRoot.
  // Each component owns its own slice; neither should overwrite the other.
  React.useEffect(() => {
    if (mode === "image-edit") {
      return
    }

    setCharacterImageFiles(draft.characterImageReferences)
    setComposerVisualStyle(draft.visualStyle)
    setVideoPromptSource((previous) => ({
      ...previous,
      characterImageCount: Math.min(
        draft.characterImageReferences.length,
        MAX_SEEDANCE_CHARACTER_IMAGES
      ),
      characterNotes: draft.characterNotes.map(({ name, notes }) => ({
        name,
        notes,
      })),
      visualStyle: draft.visualStyle.trim(),
    }))
  }, [
    draft.characterImageReferences,
    draft.characterNotes,
    draft.visualStyle,
    mode,
    setCharacterImageFiles,
    setComposerVisualStyle,
    setVideoPromptSource,
  ])

  const addCharacterNote = () => {
    if (draft.characterNotes.length >= MAX_CHARACTER_SHEETS) {
      return
    }

    onDraftChange?.({
      characterNotes: [
        ...draft.characterNotes,
        { id: nextCharacterNoteId(draft.characterNotes), name: "", notes: "" },
      ],
    })
  }

  const removeCharacterImageReference = (index: number) => {
    onDraftChange?.({
      characterImageReferences: draft.characterImageReferences.filter(
        (unusedFile, fileIndex) => fileIndex !== index
      ),
    })
  }

  const removeStyleImageReference = (index: number) => {
    onDraftChange?.({
      styleImageReferences: draft.styleImageReferences.filter(
        (unusedFile, fileIndex) => fileIndex !== index
      ),
    })
  }

  const submit = () => {
    const trimmedPrompt = state.prompt.trim()

    if (disabled || isSubmitting || trimmedPrompt === "") {
      return
    }

    startSubmitTransition(async () => {
      dispatch({ error: null, type: "setError" })

      if (mode === "image-edit") {
        if (onImageEditSubmit === undefined) {
          dispatch({
            error: "Image editing is unavailable.",
            type: "setError",
          })
          return
        }

        try {
          await onImageEditSubmit(trimmedPrompt)
          dispatch({ type: "resetPrompt" })
        } catch (submissionError) {
          dispatch({
            error:
              submissionError instanceof Error
                ? submissionError.message
                : "Storyboard generation failed.",
            type: "setError",
          })
        }

        return
      }

      if (onSubmit === undefined) {
        dispatch({
          error: "Storyboard generation is unavailable.",
          type: "setError",
        })
        return
      }

      try {
        const [characterImageRefs, styleImageRefs] = await Promise.all([
          Promise.all(
            draft.characterImageReferences.map((file) =>
              readFileAsDataUrl(file)
            )
          ),
          Promise.all(
            draft.styleImageReferences.map((file) => readFileAsDataUrl(file))
          ),
        ])
        const characterSheets = draft.characterNotes
          .map(serializeCharacterNote)
          .filter(Boolean)

        await onSubmit({
          characterImageRefs,
          characterSheets,
          imageModel,
          prompt: trimmedPrompt,
          resolution: imageResolution,
          styleImageRefs,
          visualStyle: draft.visualStyle.trim(),
        })

        dispatch({ type: "resetPrompt" })
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
    addCharacterNote,
    characterImageReferences: draft.characterImageReferences,
    characterNotes: draft.characterNotes,
    error: state.error,
    inputId,
    isCharacterSheetOpen: state.isCharacterSheetOpen,
    isDisabled: disabled || isSubmitting,
    isSubmitting,
    mode,
    prompt: state.prompt,
    removeCharacterImageReference,
    removeCharacterNote: (id) =>
      onDraftChange?.({
        characterNotes: draft.characterNotes.filter(
          (characterNote) => characterNote.id !== id
        ),
      }),
    removeStyleImageReference,
    setCharacterImageReferences: (characterImageReferences) =>
      onDraftChange?.({ characterImageReferences }),
    setCharacterNote: (characterNote) =>
      onDraftChange?.({
        characterNotes: draft.characterNotes.map((existingNote) =>
          existingNote.id === characterNote.id ? characterNote : existingNote
        ),
      }),
    setError: (error) => dispatch({ error, type: "setError" }),
    setIsCharacterSheetOpen: (isCharacterSheetOpen) =>
      dispatch({ isCharacterSheetOpen, type: "setCharacterSheetOpen" }),
    setPrompt: (prompt) => dispatch({ prompt, type: "setPrompt" }),
    setStyleImageReferences: (styleImageReferences) =>
      onDraftChange?.({ styleImageReferences }),
    setVisualStyle: (visualStyle) => onDraftChange?.({ visualStyle }),
    styleImageReferences: draft.styleImageReferences,
    submit,
    visualStyle: draft.visualStyle,
  }

  const isImageEdit = mode === "image-edit"

  return (
    <PromptComposerContext.Provider value={contextValue}>
      <div
        aria-label={
          isImageEdit
            ? "Image edit prompt composer"
            : "Storyboard prompt composer"
        }
        className={cn(
          "group/composer mx-auto w-full max-w-3xl shrink-0 transition-[box-shadow] duration-200 ease-out focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none",
          isImageEdit
            ? "flex flex-wrap items-center gap-1.5 rounded-full bg-surface-inset py-1 pl-1 shadow-popover"
            : "max-h-[min(28rem,calc(100svh-8rem))] overflow-y-auto rounded-3xl bg-surface-panel shadow-modal",
          className
        )}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            onActiveChange?.(false)
          }
        }}
        onFocusCapture={() => onActiveChange?.(true)}
        role="group"
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
      </div>
    </PromptComposerContext.Provider>
  )
}

const PromptComposer = {
  Actions: PromptComposerActions,
  Attachments: PromptComposerAttachments,
  Input: PromptComposerInput,
  Root: PromptComposerRoot,
}

export { PromptComposer }
