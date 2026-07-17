"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { m, useReducedMotion } from "motion/react"
import { ToggleGroup } from "radix-ui"
import * as React from "react"
import { SPRING_SNAPPY } from "@/lib/motion"

import { cn } from "@/lib/utils"
const segmentedControlIndicatorVariants = cva("absolute inset-0 rounded-full", {
  defaultVariants: {
    variant: "emphasis",
  },
  variants: {
    variant: {
      emphasis: "bg-emphasis",
      raised: "bg-surface-raised shadow-sm",
    },
  },
})

const segmentedControlItemVariants = cva(
  "flex items-center gap-1.5 rounded-full px-2 py-0.5 text-caption outline-none transition-[color,background-color,transform] duration-150 ease-out active:scale-95 focus-visible:ring-2 focus-visible:ring-ring [&_svg]:size-3 [&_svg]:shrink-0",
  {
    defaultVariants: {
      variant: "emphasis",
    },
    variants: {
      // Selected styling keys off aria-checked rather than data-state:
      // wrapping an option in Tooltip.Trigger asChild overwrites the
      // toggle item's data-state with the tooltip's open state.
      variant: {
        emphasis:
          "text-ink-muted hover:text-ink aria-checked:text-emphasis-foreground",
        raised:
          "px-2.5 py-1 text-label text-ink-muted hover:text-ink aria-checked:text-ink-strong",
      },
    },
  }
)

type SegmentedControlVariant = VariantProps<
  typeof segmentedControlItemVariants
>["variant"]
interface SegmentedControlContextValue {
  layoutId: string
  reducedMotion: boolean
  value: string
  variant: SegmentedControlVariant
}

const SegmentedControlContext =
  React.createContext<SegmentedControlContextValue | null>(null)

function useSegmentedControlContext(): SegmentedControlContextValue {
  const context = React.use(SegmentedControlContext)

  if (context === null) {
    throw new Error(
      "SegmentedControl compound components must be used within <SegmentedControl>."
    )
  }

  return context
}

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
  const reducedMotion = Boolean(useReducedMotion())
  const id = React.useId()
  const contextValue: SegmentedControlContextValue = {
    layoutId: `segmented-control-thumb-${id}`,
    reducedMotion,
    value,
    variant,
  }
  return (
    <ToggleGroup.Root
      aria-label={label}
      className={cn(
        "relative flex items-center rounded-full bg-surface-inset p-0.5",
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
      <SegmentedControlContext.Provider value={contextValue}>
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
  children,
  className,
  value,
  ...props
}: SegmentedControlOptionProps) {
  const context = useSegmentedControlContext()
  const selected = context.value === value

  return (
    <ToggleGroup.Item
      className={cn(
        segmentedControlItemVariants({
          className,
          variant: context.variant,
        }),
        "relative"
      )}
      value={value}
      {...props}
    >
      {selected &&
        (context.reducedMotion ? (
          <span
            aria-hidden
            className={cn(
              segmentedControlIndicatorVariants({ variant: context.variant })
            )}
          />
        ) : (
          <m.span
            aria-hidden
            className={cn(
              segmentedControlIndicatorVariants({ variant: context.variant })
            )}
            layoutId={context.layoutId}
            transition={SPRING_SNAPPY}
          />
        ))}
      <span className="relative z-10 inline-flex items-center gap-1.5 whitespace-nowrap">
        {children}
      </span>
    </ToggleGroup.Item>
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
