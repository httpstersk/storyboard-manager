/**
 * Per-board prompt composer draft: written characters, environments,
 * manually authored scenes, uploaded reference images, and visual style
 * scoped to one storyboard.
 *
 * Characters, environments, and manual scenes share one shape — an
 * `@handle` plus free-form text — so this module owns a single
 * {@link ComposerNote} type with kind-agnostic helpers. Manual scenes only
 * use the `notes` field; they have no `@handle` of their own, so `name`
 * always stays empty for that group. The composer UI, workspace reducer,
 * validation, and persistence layers all read from here.
 */

/** Maximum text length of an `@handle` in a composer notes editor. */
export const MAX_HANDLE_LENGTH = 120

/**
 * Maximum number of note rows of one kind (characters or environments)
 * accepted by a single generation request. Seedance 2.5 stays stable around
 * 8 named subjects and remains usable up to about 12.
 */
export const MAX_COMPOSER_SHEETS = 12

/** Maximum text length of one serialized composer sheet. */
export const MAX_COMPOSER_SHEET_LENGTH = 20_000

/**
 * Maximum notes length after reserving room for an `@handle` and separator.
 */
export const MAX_COMPOSER_NOTES_LENGTH =
  MAX_COMPOSER_SHEET_LENGTH - MAX_HANDLE_LENGTH - 1

/**
 * Maximum length of the optional textual visual-style description.
 * Kept short so style guidance stays focused alongside reference images.
 */
export const MAX_VISUAL_STYLE_LENGTH = 2_000

/**
 * One written definition managed by the prompt composer. Used for both
 * characters (people) and environments (locations, buildings, places).
 */
export interface ComposerNote {
  /** Stable identifier of the note within its board. */
  id: number
  /** `@handle` of the subject, or empty when unset. */
  name: string
  /** Free-form continuity notes for the subject. */
  notes: string
}

/** Composer attachments and style scoped to a single board. */
export interface BoardComposerDraft {
  /** Uploaded character reference images. */
  characterImageReferences: File[]
  /** Written character definitions, always at least one (possibly empty) row. */
  characterNotes: ComposerNote[]
  /** Uploaded environment reference images. */
  environmentImageReferences: File[]
  /**
   * Written environment definitions (locations, buildings, places), always
   * at least one (possibly empty) row.
   */
  environmentNotes: ComposerNote[]
  /**
   * Manually authored scene beats, always at least one (possibly empty)
   * row. Only the row's `notes` field is used — a scene has no `@handle`.
   * When any row is filled, generation uses these beats verbatim instead
   * of planning its own scene breakdown.
   */
  sceneNotes: ComposerNote[]
  /** Uploaded visual-style reference images. */
  styleImageReferences: File[]
  /** Optional textual visual-style description. */
  visualStyle: string
}

/**
 * Creates the draft a fresh board starts with: one empty character row and
 * one empty environment row.
 */
export function createEmptyComposerDraft(): BoardComposerDraft {
  return {
    characterImageReferences: [],
    characterNotes: [createEmptyComposerNote()],
    environmentImageReferences: [],
    environmentNotes: [createEmptyComposerNote()],
    styleImageReferences: [],
    visualStyle: "",
  }
}

/** Creates a blank note row, used to seed and extend a notes editor. */
export function createEmptyComposerNote(id = 0): ComposerNote {
  return { id, name: "", notes: "" }
}

/**
 * Unique `@handles` from serialized composer sheets, in first-seen order.
 * Only a first line that is already an `@handle` counts; notes-only sheets
 * are ignored so prose is never treated as a name.
 */
export function extractHandlesFromSheets(sheets: string[]): string[] {
  const handles: string[] = []
  const seen = new Set<string>()

  for (const sheet of sheets) {
    const firstLine = sheet.split("\n")[0]?.trim() ?? ""

    if (!firstLine.startsWith("@")) {
      continue
    }

    const handle = normalizeHandle(firstLine)

    if (handle === "" || seen.has(handle.toLowerCase())) {
      continue
    }

    seen.add(handle.toLowerCase())
    handles.push(handle)
  }

  return handles
}

/**
 * Unique `@handles` across every composer note group, in the order the
 * groups are supplied. Drives the storyline `@mention` autocomplete, so
 * characters and environments share one merged list.
 */
export function getComposerMentionOptions(
  draft: BoardComposerDraft
): string[] {
  return getMentionOptions([...draft.characterNotes, ...draft.environmentNotes])
}

/** Unique `@handles` from a note group eligible for storyline mentions. */
export function getMentionOptions(notes: ComposerNote[]): string[] {
  const handles: string[] = []
  const seen = new Set<string>()

  for (const note of notes) {
    const handle = normalizeHandle(note.name)

    if (handle === "" || seen.has(handle)) {
      continue
    }

    seen.add(handle)
    handles.push(handle)
  }

  return handles
}

/** Whether a note row has a handle or notes entered. */
export function isComposerNoteFilled(note: ComposerNote): boolean {
  return normalizeHandle(note.name) !== "" || note.notes.trim() !== ""
}

/** Next free note id within a note group. */
export function nextComposerNoteId(notes: ComposerNote[]): number {
  return notes.reduce((highest, note) => Math.max(highest, note.id), -1) + 1
}

/**
 * Ensures a name is a single `@handle`, or empty when unset.
 * Bare `@` and whitespace-only values collapse to an empty string.
 */
export function normalizeHandle(value: string): string {
  const body = value.trim().replace(/^@+/, "")

  if (body === "") {
    return ""
  }

  return `@${body}`
}

/** Converts a structured note row into the API sheet format. */
export function serializeComposerNote(note: ComposerNote): string {
  const name = normalizeHandle(note.name)
  const notes = note.notes.trim()

  return [name, notes].filter(Boolean).join("\n")
}

/** Serializes a note group into the non-empty sheets sent to the API. */
export function serializeComposerNotes(notes: ComposerNote[]): string[] {
  return notes.map(serializeComposerNote).filter(Boolean)
}
