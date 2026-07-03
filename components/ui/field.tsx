"use client"

import { Slot } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

interface FieldContextValue {
  controlId: string
  labelId: string
}

const FieldContext = React.createContext<FieldContextValue | null>(null)

function useField(): FieldContextValue {
  const context = React.useContext(FieldContext)

  if (context === null) {
    throw new Error("Field compound components must be used within <Field>.")
  }

  return context
}

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
  const contextValue = React.useMemo<FieldContextValue>(
    () => ({ controlId: `${id}-control`, labelId: `${id}-label` }),
    [id]
  )

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
      className={cn("shrink-0 text-caption text-ink-muted", className)}
      id={labelId}
      {...props}
    />
  )
}

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

const Field = Object.assign(FieldRoot, {
  Control: FieldControl,
  Label: FieldLabel,
})

export { Field }
