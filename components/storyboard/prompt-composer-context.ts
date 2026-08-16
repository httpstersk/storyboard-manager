import * as React from "react"

import type { BoardComposerDraft, ComposerNote } from "@/lib/board-composer"
import type { StoryboardGenerationRequest } from "@/lib/generation"

/** Supported request modes for the reusable prompt composer. */
export type PromptComposerMode = "image-edit" | "storyboard"

/**
 * One note group of the composer — characters or environments. Both kinds
 * share the same shape, so the composer exposes them as parallel slices
 * instead of duplicating every member on the context value.
 */
export interface ComposerNoteGroup {
  /** Appends an empty note row, up to `MAX_COMPOSER_SHEETS`. */
  addNote: () => void
  /** Uploaded reference images for this group. */
  imageReferences: File[]
  /** Whether the group's written notes editor is expanded. */
  isOpen: boolean
  /** Written definitions, always at least one (possibly empty) row. */
  notes: ComposerNote[]
  removeImageReference: (index: number) => void
  removeNote: (id: number) => void
  setImageReferences: (files: File[]) => void
  setIsOpen: (isOpen: boolean) => void
  setNote: (note: ComposerNote) => void
}

export interface PromptComposerContextValue {
  /**
   * Analyses uploaded style reference images and fills the visual-style
   * field with the result, but only while that field is empty.
   */
  analyzeStyleImages: (files: File[]) => void
  /** Written characters and their reference uploads. */
  characters: ComposerNoteGroup
  /** Written environments (locations, buildings) and their uploads. */
  environments: ComposerNoteGroup
  error: string | null
  inputId: string
  /** True while style images are being analysed into the visual-style field. */
  isAnalyzingVisualStyle: boolean
  /** True when the storyboard composer is inactive and rendered as a dense pill. */
  isCompact: boolean
  isDisabled: boolean
  isSubmitting: boolean
  isVisualStyleOpen: boolean
  /** Merged `@handles` from every note group, for storyline autocomplete. */
  mentionOptions: string[]
  mode: PromptComposerMode
  prompt: string
  removeStyleImageReference: (index: number) => void
  setError: (error: string | null) => void
  setIsVisualStyleOpen: (isOpen: boolean) => void
  setPrompt: (value: string) => void
  setStyleImageReferences: (files: File[]) => void
  setVisualStyle: (value: string) => void
  styleImageReferences: File[]
  submit: () => void
  visualStyle: string
}

/**
 * Ephemeral, session-only composer state driven by {@link composerReducer}.
 * Characters, environments, uploads, and visual style live in the per-board
 * {@link BoardComposerDraft} owned by the workspace instead.
 */
export interface ComposerState {
  error: string | null
  isAnalyzingVisualStyle: boolean
  isCharacterSheetOpen: boolean
  isEnvironmentSheetOpen: boolean
  isVisualStyleOpen: boolean
  prompt: string
}

export type ComposerAction =
  | { isAnalyzingVisualStyle: boolean; type: "setAnalyzingVisualStyle" }
  | { error: string | null; type: "setError" }
  | { isCharacterSheetOpen: boolean; type: "setCharacterSheetOpen" }
  | { isEnvironmentSheetOpen: boolean; type: "setEnvironmentSheetOpen" }
  | { isVisualStyleOpen: boolean; type: "setVisualStyleOpen" }
  | { prompt: string; type: "setPrompt" }
  | { type: "resetPrompt" }

export const INITIAL_COMPOSER_STATE: ComposerState = {
  error: null,
  isAnalyzingVisualStyle: false,
  isCharacterSheetOpen: false,
  isEnvironmentSheetOpen: false,
  isVisualStyleOpen: false,
  prompt: "",
}

/** Reducer backing the ephemeral prompt composer form state. */
export function composerReducer(
  state: ComposerState,
  action: ComposerAction
): ComposerState {
  switch (action.type) {
    case "resetPrompt":
      return { ...state, prompt: "" }
    case "setAnalyzingVisualStyle":
      return {
        ...state,
        isAnalyzingVisualStyle: action.isAnalyzingVisualStyle,
      }
    case "setCharacterSheetOpen":
      return { ...state, isCharacterSheetOpen: action.isCharacterSheetOpen }
    case "setEnvironmentSheetOpen":
      return {
        ...state,
        isEnvironmentSheetOpen: action.isEnvironmentSheetOpen,
      }
    case "setError":
      return { ...state, error: action.error }
    case "setPrompt":
      return { ...state, prompt: action.prompt }
    case "setVisualStyleOpen":
      return { ...state, isVisualStyleOpen: action.isVisualStyleOpen }
  }
}

export interface PromptComposerRootProps extends Omit<
  React.ComponentProps<"div">,
  "onSubmit"
> {
  /** Disables generation and all attachment controls. */
  disabled?: boolean
  /**
   * Per-board characters, environments, uploads, and visual style rendered
   * by the composer. Omitted in image-edit mode, which never shows
   * attachments.
   */
  draft?: BoardComposerDraft
  /** Unique HTML id used to connect the primary input with its label. */
  inputId?: string
  /**
   * Whether the composer currently holds focus. Storyboard mode uses the
   * inverse to enter compact (pill) chrome when the user is in main content.
   */
  isActive?: boolean
  /** Presents a concise image-editing input without storyboard attachments. */
  mode?: PromptComposerMode
  /** Reports whether the composer currently holds focus. */
  onActiveChange?: (isActive: boolean) => void
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

export const PromptComposerContext =
  React.createContext<PromptComposerContextValue | null>(null)

/** Reads prompt composer state from the nearest {@link PromptComposerContext}. */
export function usePromptComposer(): PromptComposerContextValue {
  const context = React.use(PromptComposerContext)

  if (context === null) {
    throw new Error(
      "PromptComposer compound components must be used within <PromptComposer.Root>."
    )
  }

  return context
}

/** Reads a local file and resolves to a data URL string. */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
    reader.onload = () => resolve(String(reader.result))
    reader.readAsDataURL(file)
  })
}
