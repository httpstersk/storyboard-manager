"use client"

import { useAtomValue, useSetAtom } from "jotai"
import * as React from "react"

import { createFilePickerSession } from "@/components/storyboard/prompt-composer-file-picker"
import {
  composerReducer,
  INITIAL_COMPOSER_STATE,
  type PromptComposerContextValue,
  type PromptComposerMode,
  readFileAsDataUrl,
} from "@/components/storyboard/prompt-composer-context"
import { buildNoteGroup } from "@/components/storyboard/prompt-composer-note-group"
import { requestVisualStyleAnalysis } from "@/lib/analyze-visual-style-client"
import {
  type BoardComposerDraft,
  type ComposerNote,
  getComposerMentionOptions,
  serializeComposerNotes,
} from "@/lib/board-composer"
import { characterModeAtom } from "@/lib/character-mode-settings"
import { depthMapStyleAtom } from "@/lib/depth-map-style-settings"
import {
  allocateStoryboardReferenceSlots,
  type StoryboardGenerationRequest,
} from "@/lib/generation"
import { imageModelAtom } from "@/lib/image-model-settings"
import { imageResolutionAtom } from "@/lib/image-resolution-settings"
import { shotModeAtom } from "@/lib/shot-mode-settings"
import { allocateSeedanceReferenceSlots } from "@/lib/video-generation"
import {
  composerCharacterImageFilesAtom,
  composerEnvironmentImageFilesAtom,
  composerVisualStyleAtom,
  videoPromptSourceAtom,
} from "@/lib/video-section-atoms"
import type {
  BottomSheetElement,
  DialogPanelElement,
} from "@/types/magic-spells"

/** Strips composer-only note ids before syncing into the video prompt atom. */
function toSeedanceNotes(
  notes: ComposerNote[]
): Array<{ name: string; notes: string }> {
  return notes.map(({ name, notes: noteText }) => ({
    name,
    notes: noteText,
  }))
}

/** Options consumed by {@link usePromptComposerRoot}. */
export interface UsePromptComposerRootOptions {
  /** Disables generation and all attachment controls. */
  disabled: boolean
  /** Per-board characters, environments, uploads, and visual style. */
  draft: BoardComposerDraft
  /** Unique HTML id used to connect the primary input with its label. */
  inputId: string
  /** Presents a concise image-editing input without storyboard attachments. */
  mode: PromptComposerMode
  /** Applies a partial update to the owning board's composer draft. */
  onDraftChange?: (patch: Partial<BoardComposerDraft>) => void
  /** Sends a validated scene image editing instruction to the dialog. */
  onImageEditSubmit?: (prompt: string) => Promise<void>
  /**
   * Starts a storyboard generation in the workspace. Fire-and-forget:
   * the generation continues in the background after this returns.
   */
  onSubmit?: (request: StoryboardGenerationRequest) => void
}

/** Imperative handles and derived context value backing `PromptComposerRoot`. */
export interface UsePromptComposerRootResult {
  /**
   * Ref-callback that wires `shown`/`beforeHide` listeners onto the mounted
   * `<dialog-panel>` node, cleaning them up when it unmounts.
   */
  attachPanelEvents: (node: DialogPanelElement | null) => (() => void) | void
  /** Value provided through {@link PromptComposerContext}. */
  contextValue: PromptComposerContextValue
  /** Opens the bottom sheet, returning focus to the trigger once it closes. */
  openSheet: () => void
  /** Imperative handle of the storyboard mode's `<bottom-sheet>`. */
  sheetRef: React.RefObject<BottomSheetElement | null>
  /** Id connecting the sheet header's heading to the `<dialog>`'s a11y name. */
  sheetTitleId: string
  /** Open affordance ref, handed to `bottomSheet.show()` for focus return. */
  triggerButtonRef: React.RefObject<HTMLButtonElement | null>
}

/**
 * Owns all non-rendering state of the prompt composer: the ephemeral form
 * reducer, client-side custom-element registration, draft/atom syncing,
 * submission, and the context value consumed by the compound components.
 * `PromptComposerRoot` stays focused on JSX layout.
 */
export function usePromptComposerRoot({
  disabled,
  draft,
  inputId,
  mode,
  onDraftChange,
  onImageEditSubmit,
  onSubmit,
}: UsePromptComposerRootOptions): UsePromptComposerRootResult {
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
  const filePickerSessionRef = React.useRef(createFilePickerSession())
  const sheetRef = React.useRef<BottomSheetElement>(null)
  const triggerButtonRef = React.useRef<HTMLButtonElement>(null)

  const isImageEdit = mode === "image-edit"
  const isDisabled = disabled || isSubmitting
  const sheetTitleId = `${inputId}-sheet-title`

  // The bottom-sheet library defines browser-only custom elements (they
  // read `customElements`/`HTMLElement` at module scope), so importing it
  // eagerly would crash server rendering. Deferring to a client effect keeps
  // it out of the SSR bundle entirely; the elements render as inert markup
  // until this resolves, then the browser upgrades them in place.
  React.useEffect(() => {
    if (isImageEdit) {
      return
    }

    Promise.all([
      import("@magic-spells/dialog-panel"),
      import("@magic-spells/bottom-sheet"),
    ]).catch(() => {
      dispatch({
        error: "The prompt sheet could not be loaded. Reload and try again.",
        type: "setError",
      })
    })
  }, [isImageEdit])

  // dialog-panel's lifecycle events are dispatched on the panel itself and
  // bubble upward, so they never reach the bottom-sheet element nested
  // inside it -- the listener has to live on the panel. A ref-callback
  // cleanup keeps the wiring colocated with the node's own lifecycle
  // instead of a separate effect chasing a ref.
  const attachPanelEvents = React.useCallback(
    (node: DialogPanelElement | null) => {
      if (node === null) {
        return
      }

      function handleShown() {
        document.getElementById(inputId)?.focus()
      }

      function handleBeforeHide(event: Event) {
        // A native file picker steals focus without closing the sheet, but
        // dialog-panel treats the moment as an ordinary outside interaction
        // and would otherwise close from under the picker.
        if (filePickerSessionRef.current.isOpen()) {
          event.preventDefault()
        }
      }

      node.addEventListener("shown", handleShown)
      node.addEventListener("beforeHide", handleBeforeHide)

      return () => {
        node.removeEventListener("shown", handleShown)
        node.removeEventListener("beforeHide", handleBeforeHide)
      }
    },
    [inputId]
  )

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

  function openSheet() {
    sheetRef.current?.show(triggerButtonRef.current ?? undefined)
  }

  const contextValue: PromptComposerContextValue = {
    analyzeStyleImages,
    beginFilePicker: (input) => {
      filePickerSessionRef.current.begin(input)
    },
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
    isDisabled,
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

  return {
    attachPanelEvents,
    contextValue,
    openSheet,
    sheetRef,
    sheetTitleId,
    triggerButtonRef,
  }
}
