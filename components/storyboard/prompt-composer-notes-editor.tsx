"use client"

import { SFMinus, SFPlus } from "sf-symbols-lib/monochrome"

import { Field } from "@/components/ui/field"
import { IconButton } from "@/components/ui/icon-button"
import { InlineInput } from "@/components/ui/inline-input"
import {
  type ComposerNote,
  MAX_COMPOSER_NOTES_LENGTH,
  MAX_COMPOSER_SHEETS,
  MAX_HANDLE_LENGTH,
  normalizeHandle,
} from "@/lib/board-composer"
import { cn } from "@/lib/utils"

/** Copy that distinguishes one note group's editor from another. */
interface NotesEditorLabels {
  /** Column header and per-row accessible label, e.g. `"Character"`. */
  entity: string
  /** Placeholder for the handle input, e.g. `"@Name"`. */
  handlePlaceholder: string
  /** Placeholder for the free-text notes input. */
  notesPlaceholder: string
}

interface NotesEditorProps {
  /** Appends an empty row. */
  addNote: () => void
  /** Disables every control while generation is in flight. */
  isDisabled: boolean
  /** Copy identifying the group being edited. */
  labels: NotesEditorLabels
  /** Rows to render, always at least one. */
  notes: ComposerNote[]
  removeNote: (id: number) => void
  setNote: (note: ComposerNote) => void
}

interface NotesEditorRowProps {
  /** Whether the row can be deleted (never the last remaining row). */
  canRemove: boolean
  isDisabled: boolean
  labels: NotesEditorLabels
  note: ComposerNote
  onChange: (note: ComposerNote) => void
  onRemove: () => void
  /** 1-based position, used for accessible row labels. */
  rowNumber: number
}

/** One editable `@handle` and continuity-notes row. */
function NotesEditorRow({
  canRemove,
  isDisabled,
  labels,
  note,
  onChange,
  onRemove,
  rowNumber,
}: NotesEditorRowProps) {
  return (
    <div className="relative grid gap-1 px-3 py-1.5 sm:grid-cols-[minmax(8rem,0.65fr)_minmax(0,1.75fr)_1.75rem] sm:items-center sm:gap-2.5">
      <Field
        className={cn("min-h-8 justify-start sm:pr-0", canRemove && "pr-8")}
      >
        <Field.Label className="w-16 sm:sr-only">
          {labels.entity} {rowNumber}
        </Field.Label>
        <Field.Control>
          <InlineInput
            className="w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled}
            maxLength={MAX_HANDLE_LENGTH}
            onChange={(event) =>
              onChange({ ...note, name: normalizeHandle(event.target.value) })
            }
            placeholder={labels.handlePlaceholder}
            value={note.name}
          />
        </Field.Control>
      </Field>
      <Field
        className={cn("min-h-8 justify-start sm:pr-0", canRemove && "pr-8")}
      >
        <Field.Label className="w-16 sm:sr-only">Notes</Field.Label>
        <Field.Control>
          <InlineInput
            className="w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled}
            maxLength={MAX_COMPOSER_NOTES_LENGTH}
            onChange={(event) =>
              onChange({ ...note, notes: event.target.value })
            }
            placeholder={labels.notesPlaceholder}
            value={note.notes}
          />
        </Field.Control>
      </Field>
      <div className="absolute top-2 right-2 flex justify-end sm:static sm:pt-0.5">
        {canRemove ? (
          <IconButton
            disabled={isDisabled}
            label={`Remove ${labels.entity.toLowerCase()} ${rowNumber}`}
            onClick={onRemove}
            size="sm"
            variant="subtle"
          >
            <SFMinus aria-hidden />
          </IconButton>
        ) : null}
      </div>
    </div>
  )
}

/**
 * Table-like editor for one group of written composer definitions. Shared by
 * the character and environment sheets, which differ only in copy.
 *
 * ```tsx
 * <NotesEditor
 *   addNote={characters.addNote}
 *   isDisabled={isDisabled}
 *   labels={CHARACTER_NOTES_LABELS}
 *   notes={characters.notes}
 *   removeNote={characters.removeNote}
 *   setNote={characters.setNote}
 * />
 * ```
 */
function NotesEditor({
  addNote,
  isDisabled,
  labels,
  notes,
  removeNote,
  setNote,
}: NotesEditorProps) {
  const canAdd = notes.length < MAX_COMPOSER_SHEETS
  const entity = labels.entity.toLowerCase()

  return (
    <div className="mx-4 mb-3">
      <div className="hidden grid-cols-[minmax(4rem,0.65fr)_minmax(0,1.75fr)_1.75rem] gap-3 px-3 py-1.5 text-caption text-ink-muted sm:grid">
        <span>{labels.entity}</span>
        <span>Notes</span>
        <span className="sr-only">Actions</span>
      </div>
      <div>
        {notes.map((note, index) => (
          <NotesEditorRow
            canRemove={notes.length > 1}
            isDisabled={isDisabled}
            key={note.id}
            labels={labels}
            note={note}
            onChange={setNote}
            onRemove={() => removeNote(note.id)}
            rowNumber={index + 1}
          />
        ))}
      </div>
      <div className="px-2 py-1.5">
        <button
          className="flex h-7 items-center gap-1.5 rounded-full bg-surface-inset px-2 text-caption text-ink-muted transition-colors outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isDisabled || !canAdd}
          onClick={addNote}
          type="button"
        >
          <SFPlus aria-hidden className="size-3" />
          {canAdd
            ? `Add ${entity}`
            : `${MAX_COMPOSER_SHEETS} ${entity}s maximum`}
        </button>
      </div>
    </div>
  )
}

export { NotesEditor, type NotesEditorLabels, type NotesEditorProps }
