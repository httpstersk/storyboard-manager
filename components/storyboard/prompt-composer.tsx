"use client"

import { useAtomValue, useSetAtom } from "jotai"
import { AnimatePresence, m } from "motion/react"
import * as React from "react"

import { PromptComposerActions } from "@/components/storyboard/prompt-composer-actions"
import { PromptComposerAttachments } from "@/components/storyboard/prompt-composer-attachments"
import {
  type ComposerNoteGroup,
  composerReducer,
  INITIAL_COMPOSER_STATE,
  PromptComposerContext,
  type PromptComposerContextValue,
  type PromptComposerRootProps,
  readFileAsDataUrl,
} from "@/components/storyboard/prompt-composer-context"
import { PromptComposerInput } from "@/components/storyboard/prompt-composer-input"
import { requestVisualStyleAnalysis } from "@/lib/analyze-visual-style-client"
import {
  type BoardComposerDraft,
  type ComposerNote,
  createEmptyComposerDraft,
  createEmptyComposerNote,
  getComposerMentionOptions,
  MAX_COMPOSER_SHEETS,
  nextComposerNoteId,
  serializeComposerNotes,
} from "@/lib/board-composer"
import { characterModeAtom } from "@/lib/character-mode-settings"
import { depthMapStyleAtom } from "@/lib/depth-map-style-settings"
import { allocateStoryboardReferenceSlots } from "@/lib/generation"
import { imageModelAtom } from "@/lib/image-model-settings"
import { imageResolutionAtom } from "@/lib/image-resolution-settings"
import { SPRING_LAYOUT, TRANSITION_FADE_FAST } from "@/lib/motion"
import { shotModeAtom } from "@/lib/shot-mode-settings"
import { cn } from "@/lib/utils"
import { allocateSeedanceReferenceSlots } from "@/lib/video-generation"
import {
  composerCharacterImageFilesAtom,
  composerEnvironmentImageFilesAtom,
  composerVisualStyleAtom,
  videoPromptSourceAtom,
} from "@/lib/video-section-atoms"

/**
 * Draft used when no per-board draft is supplied (image-edit mode).
 * Module-level so its identity stays stable across renders.
 */
const FALLBACK_DRAFT = createEmptyComposerDraft()

/**
 * Corner radius (px) of the expanded storyboard panel, matching Tailwind's
 * `rounded-3xl` (`--radius-3xl`). Set via inline style rather than a class
 * so Motion's layout animation can interpolate it smoothly.
 */
const COMPOSER_RADIUS_EXPANDED = 20

/**
 * Corner radius (px) large enough to render a full pill regardless of the
 * composer's box dimensions, used for the compact and image-edit chrome.
 */
const COMPOSER_RADIUS_PILL = 999

/** Wiring one composer note group to its slice of the per-board draft. */
interface NoteGroupConfig {
  /** Current uploads of the group, read from the draft. */
  imageReferences: File[]
  /** Whether the group's notes editor is expanded. */
  isOpen: boolean
  /** Current note rows of the group, read from the draft. */
  notes: ComposerNote[]
  /** Builds the draft patch that replaces the group's uploads. */
  patchImageReferences: (imageReferences: File[]) => Partial<BoardComposerDraft>
  /** Builds the draft patch that replaces the group's note rows. */
  patchNotes: (notes: ComposerNote[]) => Partial<BoardComposerDraft>
  /** Toggles the group's notes editor. */
  setIsOpen: (isOpen: boolean) => void
}

/**
 * Builds the callbacks for one note group so characters and environments
 * share a single implementation of add / update / remove.
 *
 * @param config - The group's draft slice and patch builders.
 * @param onDraftChange - Applies a partial update to the owning board.
 * @returns The context slice consumed by the composer's note UI.
 */
function buildNoteGroup(
  config: NoteGroupConfig,
  onDraftChange?: (patch: Partial<BoardComposerDraft>) => void
): ComposerNoteGroup {
  const { imageReferences, isOpen, notes, patchNotes, setIsOpen } = config

  return {
    addNote: () => {
      if (notes.length >= MAX_COMPOSER_SHEETS) {
        return
      }

      onDraftChange?.(
        patchNotes([
          ...notes,
          createEmptyComposerNote(nextComposerNoteId(notes)),
        ])
      )
    },
    imageReferences,
    isOpen,
    notes,
    removeImageReference: (index) =>
      onDraftChange?.(
        config.patchImageReferences(
          imageReferences.filter((unusedFile, fileIndex) => fileIndex !== index)
        )
      ),
    removeNote: (id) =>
      onDraftChange?.(patchNotes(notes.filter((note) => note.id !== id))),
    setImageReferences: (files) =>
      onDraftChange?.(config.patchImageReferences(files)),
    setIsOpen,
    setNote: (nextNote) =>
      onDraftChange?.(
        patchNotes(
          notes.map((note) => (note.id === nextNote.id ? nextNote : note))
        )
      ),
  }
}

/** Strips composer-only note ids before syncing into the video prompt atom. */
function toSeedanceNotes(
  notes: ComposerNote[]
): Array<{ name: string; notes: string }> {
  return notes.map(({ name, notes: noteText }) => ({
    name,
    notes: noteText,
  }))
}

/**
 * Bottom-anchored cinematic prompt composer.
 *
 * Characters, environments, uploads, and visual style are controlled through
 * the `draft` / `onDraftChange` props so they stay scoped to the owning
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
  isActive = true,
  mode = "storyboard",
  onActiveChange,
  onDraftChange,
  onImageEditSubmit,
  onSubmit,
  ...props
}: PromptComposerRootProps) {
  const characterMode = useAtomValue(characterModeAtom)
  const depthMapStyle = useAtomValue(depthMapStyleAtom)
  const imageModel = useAtomValue(imageModelAtom)
  const imageResolution = useAtomValue(imageResolutionAtom)
  const shotMode = useAtomValue(shotModeAtom)
  const setCharacterImageFiles = useSetAtom(composerCharacterImageFilesAtom)
  const setComposerVisualStyle = useSetAtom(composerVisualStyleAtom)
  const setEnvironmentImageFiles = useSetAtom(composerEnvironmentImageFilesAtom)
  const setVideoPromptSource = useSetAtom(videoPromptSourceAtom)
  const [state, dispatch] = React.useReducer(
    composerReducer,
    INITIAL_COMPOSER_STATE
  )
  const [isSubmitting, startSubmitTransition] = React.useTransition()
  // Identifies the most recent style-image analysis request so a slower,
  // superseded upload's response can never overwrite a newer one's result.
  const analysisRequestIdRef = React.useRef(0)

  // Sync character/environment/style data into video + edit atoms. Keyed off
  // the per-board draft, so switching boards re-syncs to the new selection.
  // NOTE: The companion sync for `scenes` lives in VideoSectionRoot.
  // Each component owns its own slice; neither should overwrite the other.
  React.useEffect(() => {
    if (mode === "image-edit") {
      return
    }

    const slots = allocateSeedanceReferenceSlots(
      draft.characterImageReferences.length,
      draft.environmentImageReferences.length
    )

    setCharacterImageFiles(draft.characterImageReferences)
    setComposerVisualStyle(draft.visualStyle)
    setEnvironmentImageFiles(draft.environmentImageReferences)
    setVideoPromptSource((previous) => ({
      ...previous,
      characterImageCount: slots.characterCount,
      characterNotes: toSeedanceNotes(draft.characterNotes),
      environmentImageCount: slots.environmentCount,
      environmentNotes: toSeedanceNotes(draft.environmentNotes),
      visualStyle: draft.visualStyle.trim(),
    }))
  }, [
    draft.characterImageReferences,
    draft.characterNotes,
    draft.environmentImageReferences,
    draft.environmentNotes,
    draft.visualStyle,
    mode,
    setCharacterImageFiles,
    setComposerVisualStyle,
    setEnvironmentImageFiles,
    setVideoPromptSource,
  ])

  const removeStyleImageReference = (index: number) => {
    onDraftChange?.({
      styleImageReferences: draft.styleImageReferences.filter(
        (unusedFile, fileIndex) => fileIndex !== index
      ),
    })
  }

  const analyzeStyleImages = (files: File[]) => {
    if (mode === "image-edit" || files.length === 0) {
      return
    }

    const requestId = ++analysisRequestIdRef.current

    dispatch({ isVisualStyleOpen: true, type: "setVisualStyleOpen" })
    dispatch({ isAnalyzingVisualStyle: true, type: "setAnalyzingVisualStyle" })

    void (async () => {
      try {
        const styleImageRefs = await Promise.all(
          files.map((file) => readFileAsDataUrl(file))
        )
        const { visualStyle } = await requestVisualStyleAnalysis({
          styleImageRefs,
        })

        // A newer upload may have started its own analysis since this one
        // began; only the latest request may replace the field.
        if (analysisRequestIdRef.current === requestId) {
          onDraftChange?.({ visualStyle })
        }
      } catch (analysisError) {
        if (analysisRequestIdRef.current === requestId) {
          dispatch({
            error:
              analysisError instanceof Error
                ? analysisError.message
                : "The style images could not be analysed.",
            type: "setError",
          })
        }
      } finally {
        if (analysisRequestIdRef.current === requestId) {
          dispatch({
            isAnalyzingVisualStyle: false,
            type: "setAnalyzingVisualStyle",
          })
        }
      }
    })()
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
        const [characterImageRefs, environmentImageRefs, styleImageRefs] =
          await Promise.all([
            Promise.all(
              draft.characterImageReferences.map((file) =>
                readFileAsDataUrl(file)
              )
            ),
            Promise.all(
              draft.environmentImageReferences.map((file) =>
                readFileAsDataUrl(file)
              )
            ),
            depthMapStyle
              ? Promise.resolve([])
              : Promise.all(
                  draft.styleImageReferences.map((file) =>
                    readFileAsDataUrl(file)
                  )
                ),
          ])

        const slots = allocateStoryboardReferenceSlots(
          characterImageRefs.length,
          environmentImageRefs.length,
          styleImageRefs.length
        )

        // Fire-and-forget: the workspace tracks the generation per board,
        // so the composer frees up for the next prompt immediately.
        onSubmit({
          characterImageRefs: characterImageRefs.slice(0, slots.characterCount),
          characterMode,
          characterSheets: serializeComposerNotes(draft.characterNotes),
          depthMapStyle,
          environmentImageRefs: environmentImageRefs.slice(
            0,
            slots.environmentCount
          ),
          environmentSheets: serializeComposerNotes(draft.environmentNotes),
          imageModel,
          prompt: trimmedPrompt,
          resolution: imageResolution,
          shotMode,
          styleImageRefs: styleImageRefs.slice(0, slots.styleCount),
          visualStyle: depthMapStyle ? "" : draft.visualStyle.trim(),
        })

        dispatch({ type: "resetPrompt" })
      } catch (submissionError) {
        dispatch({
          error:
            submissionError instanceof Error
              ? submissionError.message
              : "The attached images could not be read.",
          type: "setError",
        })
      }
    })
  }

  const isImageEdit = mode === "image-edit"
  const isCompact = !isImageEdit && !isActive
  const contentRef = React.useRef<HTMLDivElement>(null)
  const [measuredHeight, setMeasuredHeight] = React.useState<number>()

  // Mirrors the content's real, laid-out height onto the shell so it can
  // animate a genuine `height` value instead of a transform-based scale --
  // scaling would visibly stretch the composer's text, since only height
  // (not width) changes between compact and expanded. Runs for every
  // content resize (compact/expanded toggle, notes opening, the textarea
  // auto-growing) rather than just the toggle, so the shell never falls out
  // of sync with its content.
  React.useLayoutEffect(() => {
    if (isImageEdit || contentRef.current === null) {
      return
    }

    const element = contentRef.current
    setMeasuredHeight(element.getBoundingClientRect().height)

    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        setMeasuredHeight(entry.target.getBoundingClientRect().height)
      }
    })
    observer.observe(element)

    return () => observer.disconnect()
  }, [isImageEdit])

  const contextValue: PromptComposerContextValue = {
    analyzeStyleImages,
    characters: buildNoteGroup(
      {
        imageReferences: draft.characterImageReferences,
        isOpen: state.isCharacterSheetOpen,
        notes: draft.characterNotes,
        patchImageReferences: (characterImageReferences) => ({
          characterImageReferences,
        }),
        patchNotes: (characterNotes) => ({ characterNotes }),
        setIsOpen: (isCharacterSheetOpen) =>
          dispatch({ isCharacterSheetOpen, type: "setCharacterSheetOpen" }),
      },
      onDraftChange
    ),
    environments: buildNoteGroup(
      {
        imageReferences: draft.environmentImageReferences,
        isOpen: state.isEnvironmentSheetOpen,
        notes: draft.environmentNotes,
        patchImageReferences: (environmentImageReferences) => ({
          environmentImageReferences,
        }),
        patchNotes: (environmentNotes) => ({ environmentNotes }),
        setIsOpen: (isEnvironmentSheetOpen) =>
          dispatch({ isEnvironmentSheetOpen, type: "setEnvironmentSheetOpen" }),
      },
      onDraftChange
    ),
    error: state.error,
    inputId,
    isAnalyzingVisualStyle: state.isAnalyzingVisualStyle,
    isCompact,
    isDisabled: disabled || isSubmitting,
    isSubmitting,
    isVisualStyleOpen: state.isVisualStyleOpen,
    mentionOptions: getComposerMentionOptions(draft),
    mode,
    prompt: state.prompt,
    removeStyleImageReference,
    setError: (error) => dispatch({ error, type: "setError" }),
    setIsVisualStyleOpen: (isVisualStyleOpen) =>
      dispatch({ isVisualStyleOpen, type: "setVisualStyleOpen" }),
    setPrompt: (prompt) => dispatch({ prompt, type: "setPrompt" }),
    setStyleImageReferences: (styleImageReferences) =>
      onDraftChange?.({ styleImageReferences }),
    setVisualStyle: (visualStyle) => onDraftChange?.({ visualStyle }),
    styleImageReferences: draft.styleImageReferences,
    submit,
    visualStyle: draft.visualStyle,
  }

  return (
    <PromptComposerContext.Provider value={contextValue}>
      <m.div
        animate={{
          borderRadius:
            isImageEdit || isCompact
              ? COMPOSER_RADIUS_PILL
              : COMPOSER_RADIUS_EXPANDED,
          height: isImageEdit ? "auto" : (measuredHeight ?? "auto"),
        }}
        aria-label={
          isImageEdit
            ? "Image edit prompt composer"
            : "Storyboard prompt composer"
        }
        className={cn(
          "group/composer mx-auto w-full max-w-3xl shrink-0 overflow-hidden transition-[box-shadow] duration-200 ease-out focus-within:ring-2 focus-within:ring-ring motion-reduce:transition-none",
          isImageEdit
            ? "bg-surface-inset shadow-popover"
            : isCompact
              ? "bg-surface-panel shadow-popover"
              : "bg-surface-panel shadow-modal",
          className
        )}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) {
            onActiveChange?.(false)
          }
        }}
        onFocusCapture={() => onActiveChange?.(true)}
        role="group"
        transition={SPRING_LAYOUT}
        {...props}
      >
        <div
          className={
            isImageEdit
              ? "flex flex-wrap items-center gap-1.5 py-1 pl-1"
              : isCompact
                ? "flex items-center gap-2 py-1.5 pr-1.5 pl-4"
                : "scrollbar-none max-h-[min(28rem,calc(100svh-8rem))] overflow-y-auto"
          }
          ref={contentRef}
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
      </m.div>
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
