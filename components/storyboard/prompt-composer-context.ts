import * as React from "react"

import type {
  BoardComposerDraft,
  CharacterNote,
} from "@/lib/board-composer"
import type { StoryboardGenerationRequest } from "@/lib/generation"

/** Supported request modes for the reusable prompt composer. */
export type PromptComposerMode = "image-edit" | "storyboard"

export interface PromptComposerContextValue {
  addCharacterNote: () => void
  characterImageReferences: File[]
  characterNotes: CharacterNote[]
  error: string | null
  inputId: string
  isCharacterSheetOpen: boolean
  isDisabled: boolean
  isSubmitting: boolean
  mode: PromptComposerMode
  prompt: string
  removeCharacterImageReference: (index: number) => void
  removeCharacterNote: (id: number) => void
  removeStyleImageReference: (index: number) => void
  setCharacterImageReferences: (files: File[]) => void
  setCharacterNote: (characterNote: CharacterNote) => void
  setError: (error: string | null) => void
  setIsCharacterSheetOpen: (isOpen: boolean) => void
  setPrompt: (value: string) => void
  setStyleImageReferences: (files: File[]) => void
  setVisualStyle: (value: string) => void
  styleImageReferences: File[]
  submit: () => void
  visualStyle: string
}

/**
 * Ephemeral, session-only composer state driven by {@link composerReducer}.
 * Characters, uploads, and visual style live in the per-board
 * {@link BoardComposerDraft} owned by the workspace instead.
 */
export interface ComposerState {
  error: string | null
  isCharacterSheetOpen: boolean
  prompt: string
}

export type ComposerAction =
  | { error: string | null; type: "setError" }
  | { isCharacterSheetOpen: boolean; type: "setCharacterSheetOpen" }
  | { prompt: string; type: "setPrompt" }
  | { type: "resetPrompt" }

export const INITIAL_COMPOSER_STATE: ComposerState = {
  error: null,
  isCharacterSheetOpen: false,
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
    case "setCharacterSheetOpen":
      return { ...state, isCharacterSheetOpen: action.isCharacterSheetOpen }
    case "setError":
      return { ...state, error: action.error }
    case "setPrompt":
      return { ...state, prompt: action.prompt }
  }
}

export interface PromptComposerRootProps extends Omit<
  React.ComponentProps<"div">,
  "onSubmit"
> {
  /** Disables generation and all attachment controls. */
  disabled?: boolean
  /**
   * Per-board characters, uploads, and visual style rendered by the
   * composer. Omitted in image-edit mode, which never shows attachments.
   */
  draft?: BoardComposerDraft
  /** Unique HTML id used to connect the primary input with its label. */
  inputId?: string
  /** Presents a concise image-editing input without storyboard attachments. */
  mode?: PromptComposerMode
  /** Reports whether the composer currently holds focus. */
  onActiveChange?: (isActive: boolean) => void
  /** Applies a partial update to the owning board's composer draft. */
  onDraftChange?: (patch: Partial<BoardComposerDraft>) => void
  /** Sends a validated scene image editing instruction to the dialog. */
  onImageEditSubmit?: (prompt: string) => Promise<void>
  /** Sends a validated generation request to the workspace. */
  onSubmit?: (request: StoryboardGenerationRequest) => Promise<void>
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
