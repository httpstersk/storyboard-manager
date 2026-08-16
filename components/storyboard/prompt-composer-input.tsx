"use client"

import * as React from "react"

import { usePromptComposer } from "@/components/storyboard/prompt-composer-context"
import { MentionList } from "@/components/storyboard/prompt-composer-mention-list"
import {
  filterMentionOptions,
  getMentionToken,
  insertMention,
  type MentionToken,
} from "@/components/storyboard/prompt-composer-mention"
import {
  NotesEditor,
  type NotesEditorLabels,
} from "@/components/storyboard/prompt-composer-notes-editor"
import { Field } from "@/components/ui/field"
import { InlineInput } from "@/components/ui/inline-input"
import { MAX_VISUAL_STYLE_LENGTH } from "@/lib/board-composer"
import { cn } from "@/lib/utils"

/** In-progress `@mention` session driven by caret position in the storyline. */
interface MentionSession extends MentionToken {
  highlightedIndex: number
}

/** Copy for the written character sheet. */
const CHARACTER_NOTES_LABELS: NotesEditorLabels = {
  entity: "Character",
  handlePlaceholder: "@Name",
  notesPlaceholder: "Appearance, wardrobe, personality, continuity…",
}

/** Copy for the written environment sheet. */
const ENVIRONMENT_NOTES_LABELS: NotesEditorLabels = {
  entity: "Environment",
  handlePlaceholder: "@Place",
  notesPlaceholder: "Architecture, set dressing, geography, time of day…",
}

/** Maximum length of the storyline or logline textarea. */
const MAX_STORYLINE_LENGTH = 12_000

/** Optional textual visual-style description shown as a collapsible section. */
function VisualStyleField() {
  const { isAnalyzingVisualStyle, isDisabled, setVisualStyle, visualStyle } =
    usePromptComposer()

  return (
    <div className="mx-4 mb-3">
      <Field className="min-h-8 justify-start px-3 py-1.5">
        <Field.Label className="w-16 shrink-0 sm:w-24">Visual Note</Field.Label>
        <Field.Control>
          <InlineInput
            className="w-full text-left disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isDisabled || isAnalyzingVisualStyle}
            maxLength={MAX_VISUAL_STYLE_LENGTH}
            onChange={(event) => setVisualStyle(event.target.value)}
            placeholder={
              isAnalyzingVisualStyle
                ? "Analyzing style images…"
                : "Watercolor storybook, muted pastels, soft paper texture…"
            }
            value={visualStyle}
          />
        </Field.Control>
      </Field>
    </div>
  )
}

/** Primary storyline input and the collapsible written-notes editors. */
function PromptComposerInput() {
  const {
    characters,
    environments,
    inputId,
    isDisabled,
    isVisualStyleOpen,
    mentionOptions,
    mode,
    prompt,
    setPrompt,
    submit,
  } = usePromptComposer()
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const [mentionSession, setMentionSession] =
    React.useState<MentionSession | null>(null)

  const isImageEdit = mode === "image-edit"
  const mentionListId = `${inputId}-mentions`
  const filteredMentionOptions = mentionSession
    ? filterMentionOptions(mentionOptions, mentionSession.query)
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

    const token = getMentionToken(textarea.value, textarea.selectionStart)

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

    const { caretIndex, value } = insertMention(handle, mentionSession, prompt)

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
        maxLength={MAX_STORYLINE_LENGTH}
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
        <MentionList id={mentionListId}>
          {mentionOptions.length === 0 ? (
            <MentionList.Empty>
              Add a character or environment in their notes
            </MentionList.Empty>
          ) : filteredMentionOptions.length === 0 ? (
            <MentionList.Empty>No matching handles</MentionList.Empty>
          ) : (
            filteredMentionOptions.map((handle, index) => (
              <MentionList.Option
                id={`${mentionListId}-option-${index}`}
                isActive={index === highlightedIndex}
                key={handle}
                onSelect={() => applyMention(handle)}
              >
                {handle}
              </MentionList.Option>
            ))
          )}
        </MentionList>
      ) : null}
      {characters.isOpen ? (
        <NotesEditor
          addNote={characters.addNote}
          isDisabled={isDisabled}
          labels={CHARACTER_NOTES_LABELS}
          notes={characters.notes}
          removeNote={characters.removeNote}
          setNote={characters.setNote}
        />
      ) : null}
      {environments.isOpen ? (
        <NotesEditor
          addNote={environments.addNote}
          isDisabled={isDisabled}
          labels={ENVIRONMENT_NOTES_LABELS}
          notes={environments.notes}
          removeNote={environments.removeNote}
          setNote={environments.setNote}
        />
      ) : null}
      {!isImageEdit && isVisualStyleOpen ? <VisualStyleField /> : null}
    </div>
  )
}

export { PromptComposerInput }
