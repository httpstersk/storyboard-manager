"use client"

import * as React from "react"
import { SFMinus, SFPlus } from "sf-symbols-lib/monochrome"

import { CharacterMentionList } from "@/components/storyboard/prompt-composer-character-mention-list"
import {
  filterCharacterMentionOptions,
  getCharacterMentionToken,
  insertCharacterMention,
  type CharacterMentionToken,
} from "@/components/storyboard/prompt-composer-character-mention"
import type { CharacterNote } from "@/components/storyboard/prompt-composer-context"
import {
  getCharacterMentionOptions,
  normalizeCharacterName,
  usePromptComposer,
} from "@/components/storyboard/prompt-composer-context"
import { Field } from "@/components/ui/field"
import { IconButton } from "@/components/ui/icon-button"
import { InlineInput } from "@/components/ui/inline-input"
import {
  MAX_CHARACTER_NAME_LENGTH,
  MAX_CHARACTER_NOTES_LENGTH,
  MAX_CHARACTER_SHEETS,
} from "@/lib/generation"
import { cn } from "@/lib/utils"

/** In-progress `@mention` session driven by caret position in the storyline. */
interface CharacterMentionSession extends CharacterMentionToken {
  highlightedIndex: number
}

interface CharacterNoteRowProps {
  canRemove: boolean
  characterNote: CharacterNote
  isDisabled: boolean
  onChange: (characterNote: CharacterNote) => void
  onRemove: () => void
  rowNumber: number
}

/** One editable character and continuity-notes row. */
function CharacterNoteRow({
  canRemove,
  characterNote,
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
              onChange({
                ...characterNote,
                name: normalizeCharacterName(event.target.value),
              })
            }
            placeholder="@Name"
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
    <div className="mx-4 mb-3">
      <div className="hidden grid-cols-[minmax(4rem,0.65fr)_minmax(0,1.75fr)_1.75rem] gap-3 px-3 py-1.5 text-caption text-ink-muted sm:grid">
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
      <div className="px-2 py-1.5">
        <button
          className="flex h-7 items-center gap-1.5 rounded-full bg-surface-inset px-2 text-caption text-ink-muted transition-colors outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-40"
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
    characterNotes,
    inputId,
    isCharacterSheetOpen,
    isDisabled,
    mode,
    prompt,
    setPrompt,
    submit,
  } = usePromptComposer()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [mentionSession, setMentionSession] =
    React.useState<CharacterMentionSession | null>(null)

  const isImageEdit = mode === "image-edit"
  const mentionListId = `${inputId}-character-mentions`
  const mentionOptions = getCharacterMentionOptions(characterNotes)
  const filteredMentionOptions = mentionSession
    ? filterCharacterMentionOptions(mentionOptions, mentionSession.query)
    : []
  const highlightedIndex = mentionSession
    ? Math.min(
        mentionSession.highlightedIndex,
        Math.max(filteredMentionOptions.length - 1, 0)
      )
    : 0
  const activeOptionId =
    mentionSession && filteredMentionOptions.length > 0
      ? `${mentionListId}-option-${highlightedIndex}`
      : undefined

  function syncMentionSession(textarea: HTMLTextAreaElement) {
    if (isImageEdit) {
      setMentionSession(null)
      return
    }

    const token = getCharacterMentionToken(
      textarea.value,
      textarea.selectionStart
    )

    if (token === null) {
      setMentionSession(null)
      return
    }

    setMentionSession((current) => ({
      ...token,
      highlightedIndex: current?.highlightedIndex ?? 0,
    }))
  }

  function applyMention(handle: string) {
    if (mentionSession === null) {
      return
    }

    const { caretIndex, value } = insertCharacterMention(
      handle,
      mentionSession,
      prompt
    )

    setPrompt(value)
    setMentionSession(null)

    const textarea = textareaRef.current
    if (textarea === null) {
      return
    }

    textarea.focus()
    // Caret must be set after React commits the controlled value update.
    requestAnimationFrame(() => {
      textarea.setSelectionRange(caretIndex, caretIndex)
    })
  }

  return (
    <div className={isImageEdit ? "flex min-w-0 flex-1" : "relative grid"}>
      <label className="sr-only" htmlFor={inputId}>
        {isImageEdit
          ? "Describe the image changes"
          : "Movie logline or storyline"}
      </label>
      <textarea
        aria-activedescendant={isImageEdit ? undefined : activeOptionId}
        aria-autocomplete={isImageEdit ? undefined : "list"}
        aria-controls={
          !isImageEdit && mentionSession !== null ? mentionListId : undefined
        }
        aria-expanded={isImageEdit ? undefined : mentionSession !== null}
        aria-haspopup={isImageEdit ? undefined : "listbox"}
        className={cn(
          "field-sizing-content w-full resize-none bg-transparent text-body text-ink-strong outline-none placeholder:text-ink-faint disabled:cursor-not-allowed disabled:opacity-60",
          isImageEdit
            ? "max-h-28 min-h-8 px-3 py-1.5"
            : "max-h-44 min-h-14 px-4 pt-4 pb-3"
        )}
        disabled={isDisabled}
        id={inputId}
        maxLength={12_000}
        onChange={(event) => {
          setPrompt(event.target.value)
          syncMentionSession(event.target)
        }}
        onClick={(event) => syncMentionSession(event.currentTarget)}
        onKeyDown={(event) => {
          if (mentionSession !== null) {
            if (event.key === "ArrowDown") {
              event.preventDefault()
              if (filteredMentionOptions.length === 0) {
                return
              }
              setMentionSession({
                ...mentionSession,
                highlightedIndex:
                  (highlightedIndex + 1) % filteredMentionOptions.length,
              })
              return
            }

            if (event.key === "ArrowUp") {
              event.preventDefault()
              if (filteredMentionOptions.length === 0) {
                return
              }
              setMentionSession({
                ...mentionSession,
                highlightedIndex:
                  (highlightedIndex - 1 + filteredMentionOptions.length) %
                  filteredMentionOptions.length,
              })
              return
            }

            if (event.key === "Escape") {
              event.preventDefault()
              setMentionSession(null)
              return
            }

            if (event.key === "Enter" || event.key === "Tab") {
              event.preventDefault()
              const handle = filteredMentionOptions[highlightedIndex]
              if (handle !== undefined) {
                applyMention(handle)
              }
              return
            }
          }

          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault()
            void submit()
          }
        }}
        onKeyUp={(event) => syncMentionSession(event.currentTarget)}
        onSelect={(event) => syncMentionSession(event.currentTarget)}
        placeholder={
          isImageEdit
            ? "Describe how to change this scene…"
            : "Describe a film, sequence, or complete storyline…"
        }
        ref={textareaRef}
        role={isImageEdit ? undefined : "combobox"}
        rows={1}
        value={prompt}
      />
      {mentionSession !== null ? (
        <CharacterMentionList id={mentionListId}>
          {mentionOptions.length === 0 ? (
            <CharacterMentionList.Empty>
              Add a character in Character notes
            </CharacterMentionList.Empty>
          ) : filteredMentionOptions.length === 0 ? (
            <CharacterMentionList.Empty>
              No matching characters
            </CharacterMentionList.Empty>
          ) : (
            filteredMentionOptions.map((handle, index) => (
              <CharacterMentionList.Option
                id={`${mentionListId}-option-${index}`}
                isActive={index === highlightedIndex}
                key={handle}
                onSelect={() => applyMention(handle)}
              >
                {handle}
              </CharacterMentionList.Option>
            ))
          )}
        </CharacterMentionList>
      ) : null}
      {isCharacterSheetOpen ? <CharacterNotesEditor /> : null}
    </div>
  )
}

export { PromptComposerInput }
