"use client"

import * as React from "react"

import { PromptComposer } from "@/components/storyboard/prompt-composer"
import type { BoardComposerDraft } from "@/lib/board-composer"
import type { StoryboardGenerationRequest } from "@/lib/generation"

interface WorkspacePromptComposerProps {
  /** Composer draft of the currently selected board. */
  draft: BoardComposerDraft
  /** Whether the composer currently holds focus in the workspace. */
  isActive: boolean
  /** Reports whether the composer currently holds focus. */
  onActiveChange: (isActive: boolean) => void
  /** Applies a partial update to the selected board's composer draft. */
  onDraftChange: (patch: Partial<BoardComposerDraft>) => void
  /** Starts a background storyboard generation from the composer request. */
  onSubmit: (request: StoryboardGenerationRequest) => void
  /** Shell element ref used to blur focus when the workspace backdrop dismisses. */
  ref?: React.Ref<HTMLDivElement>
}

/** Persistent composer shell that skips unrelated workspace updates. */
function WorkspacePromptComposer({
  draft,
  isActive,
  onActiveChange,
  onDraftChange,
  onSubmit,
  ref,
}: WorkspacePromptComposerProps) {
  return (
    <PromptComposer.Root
      draft={draft}
      isActive={isActive}
      onActiveChange={onActiveChange}
      onDraftChange={onDraftChange}
      onSubmit={onSubmit}
      ref={ref}
    >
      <PromptComposer.Input />
      <PromptComposer.Attachments />
      <PromptComposer.Actions />
    </PromptComposer.Root>
  )
}

export { WorkspacePromptComposer, type WorkspacePromptComposerProps }
