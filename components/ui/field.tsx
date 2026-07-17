"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { FieldContext } from "./field-context"
import { FieldControl } from "./field-control"
import { FieldLabel } from "./field-label"

/**
 * A labelled form row that wires its label to its control.
 *
 * ```tsx
 * <Field>
 *   <Field.Label>Camera</Field.Label>
 *   <Field.Control>
 *     <PillSelect ... />
 *   </Field.Control>
 * </Field>
 * ```
 */
function FieldRoot({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  const id = React.useId()
  const contextValue = { controlId: `${id}-control`, labelId: `${id}-label` }

  return (
    <div
      className={cn("flex items-center justify-between gap-2.5", className)}
      {...props}
    >
      <FieldContext.Provider value={contextValue}>
        {children}
      </FieldContext.Provider>
    </div>
  )
}

const Field = Object.assign(FieldRoot, {
  Control: FieldControl,
  Label: FieldLabel,
})

export { Field }
