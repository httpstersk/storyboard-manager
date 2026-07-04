import type { Metadata } from "next"

import { StoryboardWorkspace } from "@/components/storyboard/storyboard-workspace"

export const metadata: Metadata = {
  description: "A tool to organize, preview, and export storyboards.",
  title: "Storyboard Studio",
}

/**
 * Storyboard Studio home: opens the most recently edited board.
 */
export default function Page() {
  return <StoryboardWorkspace />
}
