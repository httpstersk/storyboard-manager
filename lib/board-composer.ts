/**
 * Per-board prompt composer draft: written characters, continuity notes,
 * uploaded reference images, and visual style scoped to one storyboard.
 *
 * This module owns the character/style domain types, constants, and
 * helpers so the composer UI, workspace reducer, validation, and
 * persistence layers share one source of truth.
 */

/** Maximum text length of a character name in the character notes editor. */
export const MAX_CHARACTER_NAME_LENGTH = 120

/** Maximum number of character sheets accepted by one generation request. */
export const MAX_CHARACTER_SHEETS = 4

/** Maximum text length of one character sheet. */
export const MAX_CHARACTER_SHEET_LENGTH = 20_000

/**
 * Maximum notes length after reserving room for a character name and separator.
 */
export const MAX_CHARACTER_NOTES_LENGTH =
  MAX_CHARACTER_SHEET_LENGTH - MAX_CHARACTER_NAME_LENGTH - 1

/**
 * Maximum length of the optional textual visual-style description.
 * Kept short so style guidance stays focused alongside reference images.
 */
export const MAX_VISUAL_STYLE_LENGTH = 2_000

/** One written character definition managed by the prompt composer. */
export interface CharacterNote {
  /** Stable identifier of the note within its board. */
  id: number
  /** Character `@handle`, or empty when unset. */
  name: string
  /** Free-form continuity notes for the character. */
  notes: string
}

/** Composer attachments and style scoped to a single board. */
export interface BoardComposerDraft {
  /** Uploaded character reference images. */
  characterImageReferences: File[]
  /** Written character definitions, always at least one (possibly empty) row. */
  characterNotes: CharacterNote[]
  /** Uploaded visual-style reference images. */
  styleImageReferences: File[]
  /** Optional textual visual-style description. */
  visualStyle: string
}

/** Creates the draft a fresh board starts with: one empty character row. */
export function createEmptyComposerDraft(): BoardComposerDraft {
  return {
    characterImageReferences: [],
    characterNotes: [{ id: 0, name: "", notes: "" }],
    styleImageReferences: [],
    visualStyle: "",
  }
}

/** Unique `@handles` from character notes eligible for storyline mentions. */
export function getCharacterMentionOptions(
  characterNotes: CharacterNote[]
): string[] {
  const handles: string[] = []
  const seen = new Set<string>()

  for (const characterNote of characterNotes) {
    const handle = normalizeCharacterName(characterNote.name)

    if (handle === "" || seen.has(handle)) {
      continue
    }

    seen.add(handle)
    handles.push(handle)
  }

  return handles
}

/** Whether a character row has a name or notes entered. */
export function isCharacterNoteFilled(characterNote: CharacterNote): boolean {
  return (
    normalizeCharacterName(characterNote.name) !== "" ||
    characterNote.notes.trim() !== ""
  )
}

/** Next free character-note id within a board's draft. */
export function nextCharacterNoteId(characterNotes: CharacterNote[]): number {
  return (
    characterNotes.reduce(
      (highest, characterNote) => Math.max(highest, characterNote.id),
      -1
    ) + 1
  )
}

/**
 * Ensures a character name is a single `@handle`, or empty when unset.
 * Bare `@` and whitespace-only values collapse to an empty string.
 */
export function normalizeCharacterName(value: string): string {
  const body = value.trim().replace(/^@+/, "")

  if (body === "") {
    return ""
  }

  return `@${body}`
}

/** Converts a structured character row into the existing API sheet format. */
export function serializeCharacterNote(characterNote: CharacterNote): string {
  const name = normalizeCharacterName(characterNote.name)
  const notes = characterNote.notes.trim()

  return [name, notes].filter(Boolean).join("\n")
}
