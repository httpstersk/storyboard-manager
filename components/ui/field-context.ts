"use client"

import * as React from "react"

export interface FieldContextValue {
  controlId: string
  labelId: string
}

export const FieldContext = React.createContext<FieldContextValue | null>(null)

export function useField(): FieldContextValue {
  const context = React.use(FieldContext)

  if (context === null) {
    throw new Error("Field compound components must be used within <Field>.")
  }

  return context
}
