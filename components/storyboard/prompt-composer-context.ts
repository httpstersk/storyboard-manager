import * as React from "react"

import {
  MAX_CHARACTER_SHEETS,
  type StoryboardGenerationRequest,
} from "@/lib/generation"

/** Supported request modes for the reusable prompt composer. */
export type PromptComposerMode = "image-edit" | "storyboard"

/** One written character definition managed by the prompt composer. */
export interface CharacterNote {
  id: number
  name: string
  notes: string
}

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
  styleImageReferences: File[]
  submit: () => void
}

/** Cohesive form state for the composer, driven by {@link composerReducer}. */
export interface ComposerState {
  characterImageReferences: File[]
  characterNotes: CharacterNote[]
  error: string | null
  isCharacterSheetOpen: boolean
  nextCharacterNoteId: number
  prompt: string
  styleImageReferences: File[]
}

export type ComposerAction =
  | { type: "addCharacterNote" }
  | { characterImageReferences: File[]; type: "setCharacterImageReferences" }
  | { id: number; type: "removeCharacterNote" }
  | { error: string | null; type: "setError" }
  | { characterNote: CharacterNote; type: "setCharacterNote" }
  | { isCharacterSheetOpen: boolean; type: "setCharacterSheetOpen" }
  | { prompt: string; type: "setPrompt" }
  | { styleImageReferences: File[]; type: "setStyleImageReferences" }
  | { type: "reset" }
  | { type: "resetPrompt" }

export const INITIAL_COMPOSER_STATE: ComposerState = {
  characterImageReferences: [],
  characterNotes: [{ id: 0, name: "", notes: "" }],
  error: null,
  isCharacterSheetOpen: false,
  nextCharacterNoteId: 1,
  prompt: "",
  styleImageReferences: [],
}

/** Reducer backing the prompt composer form state. */
export function composerReducer(
  state: ComposerState,
  action: ComposerAction
): ComposerState {
  switch (action.type) {
    case "addCharacterNote":
      if (state.characterNotes.length >= MAX_CHARACTER_SHEETS) {
        return state
      }

      return {
        ...state,
        characterNotes: [
          ...state.characterNotes,
          {
            id: state.nextCharacterNoteId,
            name: "",
            notes: "",
          },
        ],
        nextCharacterNoteId: state.nextCharacterNoteId + 1,
      }
    case "removeCharacterNote":
      return {
        ...state,
        characterNotes: state.characterNotes.filter(
          (characterNote) => characterNote.id !== action.id
        ),
      }
    case "reset":
      return INITIAL_COMPOSER_STATE
    case "resetPrompt":
      return { ...state, prompt: "" }
    case "setCharacterImageReferences":
      return {
        ...state,
        characterImageReferences: action.characterImageReferences,
      }
    case "setCharacterNote":
      return {
        ...state,
        characterNotes: state.characterNotes.map((characterNote) =>
          characterNote.id === action.characterNote.id
            ? action.characterNote
            : characterNote
        ),
      }
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

/** Converts a structured character row into the existing API sheet format. */
export function serializeCharacterNote(characterNote: CharacterNote): string {
  const name = characterNote.name.trim()
  const notes = characterNote.notes.trim()

  return [name, notes].filter(Boolean).join("\n")
}

export interface PromptComposerRootProps extends Omit<
  React.ComponentProps<"div">,
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
