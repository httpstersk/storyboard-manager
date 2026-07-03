import * as React from "react"

import { cn } from "@/lib/utils"
import { MAX_NOTE_LENGTH } from "@/lib/validation"

/**
 * A borderless, underlined text input used for inline note editing.
 */
function InlineInput({
  className,
  maxLength = MAX_NOTE_LENGTH,
  type = "text",
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "min-w-0 flex-1 border-b border-edge-strong bg-transparent pb-px text-right text-caption text-ink transition-colors outline-none placeholder:text-ink-faint focus-visible:border-ink-strong",
        className
      )}
      maxLength={maxLength}
      type={type}
      {...props}
    />
  )
}

export { InlineInput }
