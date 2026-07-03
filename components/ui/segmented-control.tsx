"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { ToggleGroup } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

const segmentedControlItemVariants = cva(
  "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3 [&_svg]:shrink-0",
  {
    defaultVariants: {
      variant: "emphasis",
    },
    variants: {
      variant: {
        emphasis:
          "text-ink-muted hover:text-ink data-[state=on]:bg-emphasis data-[state=on]:text-emphasis-foreground",
        raised:
          "px-2.5 py-1 text-label text-ink-muted hover:text-ink data-[state=on]:bg-surface-raised data-[state=on]:text-ink-strong data-[state=on]:shadow-sm",
      },
    },
  }
)

type SegmentedControlVariant = VariantProps<
  typeof segmentedControlItemVariants
>["variant"]

const SegmentedControlContext =
  React.createContext<SegmentedControlVariant>("emphasis")

/** Props for the {@link SegmentedControl} root. */
interface SegmentedControlProps {
  children: React.ReactNode
  className?: string
  /** Accessible name of the control. */
  label: string
  /** Called with the newly selected value. */
  onValueChange: (value: string) => void
  /** Currently selected value. */
  value: string
  /** Visual style of the selected segment. */
  variant?: SegmentedControlVariant
}

/**
 * A single-select pill segmented control.
 *
 * ```tsx
 * <SegmentedControl label="Shot" onValueChange={setShot} value={shot}>
 *   <SegmentedControl.Option value="WS">WS</SegmentedControl.Option>
 * </SegmentedControl>
 * ```
 */
function SegmentedControlRoot({
  children,
  className,
  label,
  onValueChange,
  value,
  variant = "emphasis",
}: SegmentedControlProps) {
  return (
    <ToggleGroup.Root
      aria-label={label}
      className={cn(
        "flex items-center rounded-full bg-surface-inset p-0.5",
        className
      )}
      onValueChange={(next) => {
        if (next) {
          onValueChange(next)
        }
      }}
      type="single"
      value={value}
    >
      <SegmentedControlContext.Provider value={variant}>
        {children}
      </SegmentedControlContext.Provider>
    </ToggleGroup.Root>
  )
}

/** Props for {@link SegmentedControlOption}. */
interface SegmentedControlOptionProps
  extends React.ComponentProps<typeof ToggleGroup.Item> {
  /** Value selected when this option is activated. */
  value: string
}

/** A selectable option inside a {@link SegmentedControl}. */
function SegmentedControlOption({
  className,
  value,
  ...props
}: SegmentedControlOptionProps) {
  const variant = React.useContext(SegmentedControlContext)

  return (
    <ToggleGroup.Item
      className={cn(segmentedControlItemVariants({ className, variant }))}
      value={value}
      {...props}
    />
  )
}

const SegmentedControl = Object.assign(SegmentedControlRoot, {
  Option: SegmentedControlOption,
})

export {
  SegmentedControl,
  type SegmentedControlOptionProps,
  type SegmentedControlProps,
}
