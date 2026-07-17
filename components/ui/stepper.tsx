"use client"

import { SFMinus, SFPlus } from "sf-symbols-lib/monochrome"
import * as React from "react"

import { cn } from "@/lib/utils"

interface StepperContextValue {
  decrement: () => void
  increment: () => void
  label: string
  max: number
  min: number
  value: number
}

const StepperContext = React.createContext<StepperContextValue | null>(null)

function useStepper(): StepperContextValue {
  const context = React.use(StepperContext)

  if (context === null) {
    throw new Error("Stepper compound components must be used within <Stepper>.")
  }

  return context
}

/** Props for the {@link Stepper} root. */
interface StepperProps extends Omit<React.ComponentProps<"div">, "onChange"> {
  /** Accessible name of the stepper group. */
  label: string
  /** Largest allowed value. */
  max: number
  /** Smallest allowed value. */
  min: number
  /** Called with the clamped value after each step. */
  onValueChange: (value: number) => void
  /** Amount added or removed per step. */
  step?: number
  /** Current value. */
  value: number
}

/**
 * A pill-shaped numeric stepper.
 *
 * Compose with {@link StepperDecrement}, {@link StepperValue}, and
 * {@link StepperIncrement}:
 *
 * ```tsx
 * <Stepper label="Rows" max={4} min={1} onValueChange={setRows} value={rows}>
 *   <Stepper.Decrement />
 *   <Stepper.Value />
 *   <Stepper.Increment />
 * </Stepper>
 * ```
 */
function Stepper({
  children,
  className,
  label,
  max,
  min,
  onValueChange,
  step = 1,
  value,
  ...props
}: StepperProps) {
  const contextValue: StepperContextValue = {
    decrement: () => onValueChange(Math.max(min, value - step)),
    increment: () => onValueChange(Math.min(max, value + step)),
    label,
    max,
    min,
    value,
  }

  return (
    <div
      aria-label={label}
      className={cn(
        "flex items-center gap-2 rounded-full bg-surface-inset p-0.5",
        className
      )}
      role="group"
      {...props}
    >
      <StepperContext.Provider value={contextValue}>
        {children}
      </StepperContext.Provider>
    </div>
  )
}

const stepperButtonClassName =
  "flex size-5 shrink-0 items-center justify-center rounded-full bg-surface-raised text-ink-muted outline-none transition-[color,transform] duration-150 ease-out hover:text-ink-strong active:scale-90 focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 [&_svg]:size-2.75 select-none"

/** Decrement button of a {@link Stepper}. */
function StepperDecrement({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { decrement, label, min, value } = useStepper()

  return (
    <button
      aria-label={`Decrease ${label}`}
      className={cn(stepperButtonClassName, className)}
      disabled={value <= min}
      onClick={decrement}
      type="button"
      {...props}
    >
      <SFMinus aria-hidden />
    </button>
  )
}

/** Increment button of a {@link Stepper}. */
function StepperIncrement({
  className,
  ...props
}: React.ComponentProps<"button">) {
  const { increment, label, max, value } = useStepper()

  return (
    <button
      aria-label={`Increase ${label}`}
      className={cn(stepperButtonClassName, className)}
      disabled={value >= max}
      onClick={increment}
      type="button"
      {...props}
    >
      <SFPlus aria-hidden />
    </button>
  )
}

/** Props for {@link StepperValue}. */
interface StepperValueProps extends React.ComponentProps<"span"> {
  /** Optional formatter for the displayed value, for example `04 s`. */
  format?: (value: number) => string
}

/** Current value display of a {@link Stepper}. */
function StepperValue({ className, format, ...props }: StepperValueProps) {
  const { value } = useStepper()

  return (
    <span
      aria-live="polite"
      className={cn(
        "min-w-6 text-center text-caption font-medium text-ink select-none",
        className
      )}
      {...props}
    >
      {format ? format(value) : value}
    </span>
  )
}

Stepper.Decrement = StepperDecrement
Stepper.Increment = StepperIncrement
Stepper.Value = StepperValue

export { Stepper, type StepperProps, type StepperValueProps }
