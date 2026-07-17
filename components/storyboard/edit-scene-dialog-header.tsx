"use client"

import {
  SFArrowLeft,
  SFArrowRight,
  SFXmark,
} from "sf-symbols-lib/monochrome"

import { Dialog } from "@/components/ui/dialog"
import { IconButton } from "@/components/ui/icon-button"
import { formatSeconds, type Scene } from "@/lib/storyboard"

interface EditSceneDialogHeaderProps {
  /** Whether navigation to the next scene is available. */
  canNavigateNext: boolean
  /** Whether navigation to the previous scene is available. */
  canNavigatePrevious: boolean
  /** Whether an image edit request is currently in flight. */
  isEditingImage: boolean
  /** Called to navigate to the next scene while keeping dialog open. */
  onNavigateNext: () => void
  /** Called to navigate to the previous scene while keeping dialog open. */
  onNavigatePrevious: () => void
  /** Scene being edited. */
  scene: Scene
  /** Two-digit display number of the scene, for example "01". */
  sceneNumber: string
}

/** Title row and scene navigation controls for the edit dialog. */
function EditSceneDialogHeader({
  canNavigateNext,
  canNavigatePrevious,
  isEditingImage,
  onNavigateNext,
  onNavigatePrevious,
  scene,
  sceneNumber,
}: EditSceneDialogHeaderProps) {
  return (
    <Dialog.Header>
      <div className="flex items-baseline gap-2.5">
        <Dialog.Title>Edit scene {sceneNumber}</Dialog.Title>
        <Dialog.Description>
          {formatSeconds(scene.timeSeconds)}
        </Dialog.Description>
      </div>
      <div className="flex items-center gap-1.5">
        <IconButton
          disabled={isEditingImage || !canNavigatePrevious}
          label="Previous scene"
          onClick={onNavigatePrevious}
        >
          <SFArrowLeft aria-hidden />
        </IconButton>
        <IconButton
          disabled={isEditingImage || !canNavigateNext}
          label="Next scene"
          onClick={onNavigateNext}
        >
          <SFArrowRight aria-hidden />
        </IconButton>
        <Dialog.Close asChild>
          <IconButton label="Close">
            <SFXmark aria-hidden />
          </IconButton>
        </Dialog.Close>
      </div>
    </Dialog.Header>
  )
}

export { EditSceneDialogHeader, type EditSceneDialogHeaderProps }
