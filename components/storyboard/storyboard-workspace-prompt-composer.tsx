"use client"

import { PromptComposer } from "@/components/storyboard/prompt-composer"
import type { BoardComposerDraft } from "@/lib/board-composer"
import type { StoryboardGenerationRequest } from "@/lib/generation"

interface WorkspacePromptComposerProps {
  /** Whether storyboard generation is currently unavailable. */
  disabled: boolean
  /** Composer draft of the currently selected board. */
  draft: BoardComposerDraft
  /** Reports whether the composer currently holds focus. */
  onActiveChange: (isActive: boolean) => void
  /** Applies a partial update to the selected board's composer draft. */
  onDraftChange: (patch: Partial<BoardComposerDraft>) => void
  /** Generates a storyboard from the current composer request. */
  onSubmit: (request: StoryboardGenerationRequest) => Promise<void>
}

/** Persistent composer shell that skips unrelated workspace updates. */
function WorkspacePromptComposer({
  disabled,
  draft,
  onActiveChange,
  onDraftChange,
  onSubmit,
}: WorkspacePromptComposerProps) {
  return (
    <PromptComposer.Root
      disabled={disabled}
      draft={draft}
      onActiveChange={onActiveChange}
      onDraftChange={onDraftChange}
      onSubmit={onSubmit}
    >
      <PromptComposer.Input />
      <PromptComposer.Attachments />
      <PromptComposer.Actions />
    </PromptComposer.Root>
  )
}

export { WorkspacePromptComposer, type WorkspacePromptComposerProps }
