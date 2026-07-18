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
  serializeCharacterNote,
} from "@/components/storyboard/prompt-composer-context"
import { PromptComposerInput } from "@/components/storyboard/prompt-composer-input"
import { imageModelAtom } from "@/lib/image-model-settings"
import { imageResolutionAtom } from "@/lib/image-resolution-settings"
import { TRANSITION_FADE_FAST } from "@/lib/motion"
import { cn } from "@/lib/utils"
import { MAX_SEEDANCE_CHARACTER_IMAGES } from "@/lib/video-generation"
import {
  composerCharacterImageFilesAtom,
  videoPromptSourceAtom,
} from "@/lib/video-section-atoms"

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
  const imageResolution = useAtomValue(imageResolutionAtom)
  const setCharacterImageFiles = useSetAtom(composerCharacterImageFilesAtom)
  const setVideoPromptSource = useSetAtom(videoPromptSourceAtom)
  const [state, dispatch] = React.useReducer(
    composerReducer,
    INITIAL_COMPOSER_STATE
  )
  const [isSubmitting, startSubmitTransition] = React.useTransition()

  // Sync character data into the video prompt source atom.
  // NOTE: The companion sync for `scenes` lives in VideoSectionRoot.
  // Each component owns its own slice; neither should overwrite the other.
  React.useEffect(() => {
    setCharacterImageFiles(state.characterImageReferences)
    setVideoPromptSource((previous) => ({
      ...previous,
      characterImageCount: Math.min(
        state.characterImageReferences.length,
        MAX_SEEDANCE_CHARACTER_IMAGES
      ),
      characterNotes: state.characterNotes.map(({ name, notes }) => ({
        name,
        notes,
      })),
    }))
  }, [
    setCharacterImageFiles,
    setVideoPromptSource,
    state.characterImageReferences,
    state.characterNotes,
  ])

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
            state.characterImageReferences.map((file) =>
              readFileAsDataUrl(file)
            )
          ),
          Promise.all(
            state.styleImageReferences.map((file) => readFileAsDataUrl(file))
          ),
        ])
        const characterSheets = state.characterNotes
          .map(serializeCharacterNote)
          .filter(Boolean)

        await onSubmit({
          characterImageRefs,
          characterSheets,
          imageModel,
          prompt: trimmedPrompt,
          resolution: imageResolution,
          styleImageRefs,
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
    addCharacterNote: () => dispatch({ type: "addCharacterNote" }),
    characterImageReferences: state.characterImageReferences,
    characterNotes: state.characterNotes,
    error: state.error,
    inputId,
    isCharacterSheetOpen: state.isCharacterSheetOpen,
    isDisabled: disabled || isSubmitting,
    isSubmitting,
    mode,
    prompt: state.prompt,
    removeCharacterImageReference,
    removeCharacterNote: (id) => dispatch({ id, type: "removeCharacterNote" }),
    removeStyleImageReference,
    setCharacterImageReferences: (characterImageReferences) =>
      dispatch({
        characterImageReferences,
        type: "setCharacterImageReferences",
      }),
    setCharacterNote: (characterNote) =>
      dispatch({ characterNote, type: "setCharacterNote" }),
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
