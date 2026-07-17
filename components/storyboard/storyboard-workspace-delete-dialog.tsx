"use client"

import { Dialog } from "@/components/ui/dialog"
import type { Board } from "@/lib/storyboard"

interface DeleteBoardConfirmDialogProps {
  /** Board pending deletion, or null when the dialog is closed. */
  board: Board | null
  /** Called when the user confirms the delete. */
  onConfirm: () => void
  /** Called when the dialog requests to open or close. */
  onOpenChange: (open: boolean) => void
}

/** Confirmation dialog shown before a storyboard is permanently deleted. */
function DeleteBoardConfirmDialog({
  board,
  onConfirm,
  onOpenChange,
}: DeleteBoardConfirmDialogProps) {
  return (
    <Dialog onOpenChange={onOpenChange} open={board !== null}>
      <Dialog.Content className="max-w-sm">
        <Dialog.Header>
          <Dialog.Title>Delete storyboard</Dialog.Title>
        </Dialog.Header>
        <p className="px-5 py-4 text-body text-pretty text-ink-muted">
          Delete &ldquo;{board?.title}&rdquo;? This can&rsquo;t be undone.
        </p>
        <Dialog.Footer>
          <Dialog.Close asChild>
            <button
              className="flex h-7.5 items-center rounded-full bg-surface-inset px-4 text-label text-ink transition-[color,transform] duration-150 ease-out outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
              type="button"
            >
              Cancel
            </button>
          </Dialog.Close>
          <button
            className="flex h-7.5 items-center rounded-full bg-destructive px-4 text-label font-medium text-white transition-[background-color,transform] duration-150 ease-out outline-none hover:bg-destructive/85 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            onClick={onConfirm}
            type="button"
          >
            Delete
          </button>
        </Dialog.Footer>
      </Dialog.Content>
    </Dialog>
  )
}

export { DeleteBoardConfirmDialog, type DeleteBoardConfirmDialogProps }
