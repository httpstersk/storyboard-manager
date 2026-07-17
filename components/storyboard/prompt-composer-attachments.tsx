"use client"

import { AnimatePresence, m } from "motion/react"

import { PromptComposerAttachmentGroup } from "@/components/storyboard/prompt-composer-attachment-group"
import { usePromptComposer } from "@/components/storyboard/prompt-composer-context"
import { EASE_OUT } from "@/lib/motion"

/** Character and visual-style references shown in distinct labelled groups. */
function PromptComposerAttachments() {
  const {
    characterImageReferences,
    mode,
    removeCharacterImageReference,
    removeStyleImageReference,
    styleImageReferences,
  } = usePromptComposer()

  const hasAttachments =
    mode === "image-edit" ||
    (characterImageReferences.length === 0 && styleImageReferences.length === 0)

  return (
    <AnimatePresence initial={false}>
      {!hasAttachments ? (
        <m.div
          animate={{ opacity: 1, scaleY: 1 }}
          className="overflow-hidden"
          exit={{ opacity: 0, scaleY: 0 }}
          initial={{ opacity: 0, scaleY: 0 }}
          key="composer-attachments"
          style={{ transformOrigin: "top" }}
          transition={{ duration: 0.2, ease: EASE_OUT }}
        >
          <div className="flex flex-col gap-3 bg-surface-inset px-4 py-3">
            <PromptComposerAttachmentGroup
              files={characterImageReferences}
              label="Characters"
              onRemove={removeCharacterImageReference}
            />
            <PromptComposerAttachmentGroup
              files={styleImageReferences}
              label="Visual style"
              onRemove={removeStyleImageReference}
            />
          </div>
        </m.div>
      ) : null}
    </AnimatePresence>
  )
}

export { PromptComposerAttachments }
