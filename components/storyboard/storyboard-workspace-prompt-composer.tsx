"use client"

import { PromptComposer } from "@/components/storyboard/prompt-composer"
import type { BoardComposerDraft } from "@/lib/board-composer"
import type { StoryboardGenerationRequest } from "@/lib/generation"

interface WorkspacePromptComposerProps {
  /** Composer draft of the currently selected board. */
  draft: BoardComposerDraft
  /** Reports whether the composer currently holds focus. */
  onActiveChange: (isActive: boolean) => void
  /** Applies a partial update to the selected board's composer draft. */
  onDraftChange: (patch: Partial<BoardComposerDraft>) => void
  /** Starts a background storyboard generation from the composer request. */
  onSubmit: (request: StoryboardGenerationRequest) => void
}

/** Persistent composer shell that skips unrelated workspace updates. */
function WorkspacePromptComposer({
  draft,
  onActiveChange,
  onDraftChange,
  onSubmit,
}: WorkspacePromptComposerProps) {
  return (
    <PromptComposer.Root
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
