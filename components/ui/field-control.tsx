"use client"

import { Slot } from "radix-ui"
import * as React from "react"

import { useField } from "./field-context"

/**
 * Control slot of a {@link Field}. Forwards the field's id and label
 * reference to its immediate child.
 */
function FieldControl({
  ...props
}: React.ComponentProps<typeof Slot.Root>) {
  const { controlId, labelId } = useField()

  return <Slot.Root aria-labelledby={labelId} id={controlId} {...props} />
}

export { FieldControl }
