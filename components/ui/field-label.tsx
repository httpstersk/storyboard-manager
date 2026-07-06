"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { useField } from "./field-context"

/**
 * Label of a {@link Field}. Rendered as a span and associated with the
 * control via `aria-labelledby`, which stays valid for non-labelable
 * controls such as groups and toggle bars.
 */
function FieldLabel({
  className,
  ...props
}: React.ComponentProps<"span">) {
  const { labelId } = useField()

  return (
    <span
      className={cn("shrink-0 text-caption text-ink-muted select-none", className)}
      id={labelId}
      {...props}
    />
  )
}

export { FieldLabel }
