import { StoryboardWorkspace } from "@/components/storyboard/storyboard-workspace"
import { PHONE_BOOTH_SCENES, RECENT_BOARDS } from "@/lib/storyboard"

/**
 * Storyboard manager home: opens the most recently edited board.
 */
export default function Page() {
  return (
    <StoryboardWorkspace
      boards={RECENT_BOARDS}
      initialScenes={PHONE_BOOTH_SCENES}
    />
  )
}
