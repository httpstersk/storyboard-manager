"use client"

import { SFMinus, SFPlus } from "sf-symbols-lib/monochrome"

import type { CharacterNote } from "@/components/storyboard/prompt-composer-context"
import { usePromptComposer } from "@/components/storyboard/prompt-composer-context"
import { Field } from "@/components/ui/field"
import { IconButton } from "@/components/ui/icon-button"
import { InlineInput } from "@/components/ui/inline-input"
import {
  MAX_CHARACTER_NAME_LENGTH,
  MAX_CHARACTER_NOTES_LENGTH,
  MAX_CHARACTER_SHEETS,
} from "@/lib/generation"
import { cn } from "@/lib/utils"

interface CharacterNoteRowProps {
  characterNote: CharacterNote
  canRemove: boolean
  isDisabled: boolean
  onChange: (characterNote: CharacterNote) => void
  onRemove: () => void
  rowNumber: number
}

/** One editable character and continuity-notes row. */
function CharacterNoteRow({
  characterNote,
  canRemove,
  isDisabled,
  onChange,
  onRemove,
  rowNumber,
}: CharacterNoteRowProps) {
  return (
    <div className="relative grid gap-1 px-3 py-1.5 sm:grid-cols-[minmax(8rem,0.65fr)_minmax(0,1.75fr)_1.75rem] sm:items-start sm:gap-2.5">
      <Field
        className={cn("min-h-8 justify-start sm:pr-0", canRemove && "pr-8")}
      >
        <Field.Label className="w-16 sm:sr-only">
          Character {rowNumber}
        </Field.Label>
        <Field.Control>
          <InlineInput
            className="w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled}
            maxLength={MAX_CHARACTER_NAME_LENGTH}
            onChange={(event) =>
              onChange({ ...characterNote, name: event.target.value })
            }
            placeholder="Add name"
            value={characterNote.name}
          />
        </Field.Control>
      </Field>
      <Field
        className={cn("min-h-8 justify-start sm:pr-0", canRemove && "pr-8")}
      >
        <Field.Label className="w-16 sm:sr-only">Notes</Field.Label>
        <Field.Control>
          <textarea
            className="field-sizing-content max-h-24 min-h-0 min-w-0 flex-1 resize-none border-b border-edge-strong bg-transparent pb-px text-left text-caption text-ink transition-colors outline-none placeholder:text-ink-faint focus-visible:border-ink-strong disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled}
            maxLength={MAX_CHARACTER_NOTES_LENGTH}
            onChange={(event) =>
              onChange({ ...characterNote, notes: event.target.value })
            }
            placeholder="Appearance, wardrobe, personality, continuity…"
            rows={1}
            value={characterNote.notes}
          />
        </Field.Control>
      </Field>
      <div className="absolute top-2 right-2 flex justify-end sm:static sm:pt-0.5">
        {canRemove ? (
          <IconButton
            disabled={isDisabled}
            label={`Remove character ${rowNumber}`}
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

/** Table-like editor for written character definitions. */
function CharacterNotesEditor() {
  const {
    addCharacterNote,
    characterNotes,
    isDisabled,
    removeCharacterNote,
    setCharacterNote,
  } = usePromptComposer()
  const canAdd = characterNotes.length < MAX_CHARACTER_SHEETS

  return (
    <div className="mx-4 mb-3 border-y border-edge">
      <div className="hidden grid-cols-[minmax(4rem,0.65fr)_minmax(0,1.75fr)_1.75rem] gap-3 border-b border-edge px-3 py-1.5 text-caption text-ink-muted sm:grid">
        <span>Character</span>
        <span>Notes</span>
        <span className="sr-only">Actions</span>
      </div>
      <div>
        {characterNotes.map((characterNote, index) => (
          <CharacterNoteRow
            canRemove={characterNotes.length > 1}
            characterNote={characterNote}
            isDisabled={isDisabled}
            key={characterNote.id}
            onChange={setCharacterNote}
            onRemove={() => removeCharacterNote(characterNote.id)}
            rowNumber={index + 1}
          />
        ))}
      </div>
      <div className="border-t border-edge px-2 py-1.5">
        <button
          className="flex h-7 items-center gap-1.5 rounded-full px-2 text-caption text-ink-muted transition-colors outline-none hover:bg-surface-inset hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
          disabled={isDisabled || !canAdd}
          onClick={addCharacterNote}
          type="button"
        >
          <SFPlus aria-hidden className="size-3" />
          {canAdd
            ? "Add character"
            : `${MAX_CHARACTER_SHEETS} characters maximum`}
        </button>
      </div>
    </div>
  )
}

/** Primary storyline input and optional structured character-notes editor. */
function PromptComposerInput() {
  const {
    inputId,
    isCharacterSheetOpen,
    isDisabled,
    mode,
    prompt,
    setPrompt,
    submit,
  } = usePromptComposer()

  const isImageEdit = mode === "image-edit"

  return (
    <div className={isImageEdit ? "flex min-w-0 flex-1" : "grid"}>
      <label className="sr-only" htmlFor={inputId}>
        {isImageEdit
          ? "Describe the image changes"
          : "Movie logline or storyline"}
      </label>
      <textarea
        className={cn(
          "field-sizing-content w-full resize-none bg-transparent text-body text-ink-strong outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-60",
          isImageEdit
            ? "max-h-28 min-h-8 px-3 py-1.5"
            : "max-h-44 min-h-14 px-4 pt-4 pb-3"
        )}
        disabled={isDisabled}
        id={inputId}
        maxLength={12_000}
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            void submit()
          }
        }}
        placeholder={
          isImageEdit
            ? "Describe how to change this scene…"
            : "Describe a film, sequence, or complete storyline…"
        }
        rows={1}
        value={prompt}
      />
      {isCharacterSheetOpen ? <CharacterNotesEditor /> : null}
    </div>
  )
}

export { PromptComposerInput }
