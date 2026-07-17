"use client"

import * as React from "react"

import { usePromptComposer } from "@/components/storyboard/prompt-composer-context"
import { MAX_CHARACTER_SHEET_LENGTH } from "@/lib/generation"
import { cn } from "@/lib/utils"

/** Primary storyline input and optional pasted character-sheet field. */
function PromptComposerInput() {
  const {
    characterSheetText,
    inputId,
    isCharacterSheetOpen,
    isDisabled,
    mode,
    prompt,
    setCharacterSheetText,
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
      {isCharacterSheetOpen ? (
        <div className="mx-4 mb-3 rounded-xl bg-surface-inset p-3">
          <label
            className="mb-2 flex items-center text-caption text-ink"
            htmlFor="character-sheet"
          >
            Character sheet
          </label>
          <textarea
            className="field-sizing-content max-h-28 min-h-16 w-full resize-y rounded-lg bg-surface-raised px-3 py-2 text-label text-ink ring-1 ring-edge transition-shadow outline-none placeholder:text-ink-faint focus:ring-2 focus:ring-ring"
            disabled={isDisabled}
            id="character-sheet"
            maxLength={MAX_CHARACTER_SHEET_LENGTH}
            onChange={(event) => setCharacterSheetText(event.target.value)}
            placeholder="Paste names, appearance, wardrobe, and continuity notes…"
            value={characterSheetText}
          />
        </div>
      ) : null}
    </div>
  )
}

export { PromptComposerInput }
