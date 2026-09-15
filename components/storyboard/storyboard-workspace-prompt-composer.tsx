"use client"

import { PromptComposer } from "@/components/storyboard/prompt-composer"
import type { BoardComposerDraft } from "@/lib/board-composer"
import type { StoryboardGenerationRequest } from "@/lib/generation"

interface WorkspacePromptComposerProps {
  /** Composer draft of the currently selected board. */
  draft: BoardComposerDraft
  /** Applies a partial update to the selected board's composer draft. */
  onDraftChange: (patch: Partial<BoardComposerDraft>) => void
  /** Starts a background storyboard generation from the composer request. */
  onSubmit: (request: StoryboardGenerationRequest) => void
}

/** Persistent composer shell that skips unrelated workspace updates. */
function WorkspacePromptComposer({
  draft,
  onDraftChange,
  onSubmit,
}: WorkspacePromptComposerProps) {
  return (
    <PromptComposer.Root
      draft={draft}
      onDraftChange={onDraftChange}
      onSubmit={onSubmit}
    >
      <PromptComposer.Input />
      <PromptComposer.Attachments />
    </PromptComposer.Root>
  )
}

export { WorkspacePromptComposer, type WorkspacePromptComposerProps }
