import type { ComposerNoteGroup } from "@/components/storyboard/prompt-composer-context"
import {
  type BoardComposerDraft,
  type ComposerNote,
  createEmptyComposerNote,
  MAX_COMPOSER_SHEETS,
  nextComposerNoteId,
} from "@/lib/board-composer"

/** Wiring one composer note group to its slice of the per-board draft. */
export interface NoteGroupConfig {
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
export function buildNoteGroup(
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
