"use client"

import { Dialog } from "@/components/ui/dialog"

interface EditSceneDialogFooterProps {
  /** Whether an image edit request is currently in flight. */
  isEditingImage: boolean
  /** Persists the current scene edits. */
  onSave: () => void
  /** Two-digit display number of the scene, for example "01". */
  sceneNumber: string
}

/** Save and cancel actions for the edit scene dialog. */
function EditSceneDialogFooter({
  isEditingImage,
  onSave,
  sceneNumber,
}: EditSceneDialogFooterProps) {
  return (
    <Dialog.Footer>
      <p className="text-caption text-ink-muted">
        Changes apply to scene {sceneNumber} only
      </p>
      <div className="flex items-center gap-2">
        <Dialog.Close asChild>
          <button
            className="flex h-7.5 items-center rounded-full bg-surface-inset px-4 text-label text-ink transition-[color,transform] duration-150 ease-out outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            disabled={isEditingImage}
            type="button"
          >
            Cancel
          </button>
        </Dialog.Close>
        <button
          className="flex h-7.5 items-center rounded-full bg-emphasis px-4 text-label font-medium text-emphasis-foreground transition-[background-color,transform] duration-150 ease-out outline-none hover:bg-emphasis/85 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          disabled={isEditingImage}
          onClick={onSave}
          type="button"
        >
          Save scene
        </button>
      </div>
    </Dialog.Footer>
  )
}

export { EditSceneDialogFooter, type EditSceneDialogFooterProps }
