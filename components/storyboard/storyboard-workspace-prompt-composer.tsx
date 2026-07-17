"use client"

import { PromptComposer } from "@/components/storyboard/prompt-composer"
import type { StoryboardGenerationRequest } from "@/lib/generation"

interface WorkspacePromptComposerProps {
  /** Whether storyboard generation is currently unavailable. */
  disabled: boolean
  /** Reports whether the composer currently holds focus. */
  onActiveChange: (isActive: boolean) => void
  /** Generates a storyboard from the current composer request. */
  onSubmit: (request: StoryboardGenerationRequest) => Promise<void>
}

/** Persistent composer shell that skips unrelated workspace updates. */
function WorkspacePromptComposer({
  disabled,
  onActiveChange,
  onSubmit,
}: WorkspacePromptComposerProps) {
  return (
    <PromptComposer.Root
      disabled={disabled}
      onActiveChange={onActiveChange}
      onSubmit={onSubmit}
    >
      <PromptComposer.Input />
      <PromptComposer.Attachments />
      <PromptComposer.Actions />
    </PromptComposer.Root>
  )
}

export { WorkspacePromptComposer, type WorkspacePromptComposerProps }
