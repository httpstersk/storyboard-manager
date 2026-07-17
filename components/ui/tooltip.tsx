"use client"
import { m, useReducedMotion } from "motion/react"

import { Tooltip as TooltipPrimitive } from "radix-ui"
import * as React from "react"
import { TRANSITION_POPOVER } from "@/lib/motion"

import { cn } from "@/lib/utils"

/**
 * A hover/focus tooltip built on the Radix Tooltip primitive.
 *
 * Must be rendered under a single app-level {@link TooltipProvider} (see
 * `components/theme-provider.tsx`). A shared provider lets adjacent
 * tooltips skip the open delay when the pointer moves directly from one
 * trigger to the next -- with a provider per instance, every tooltip
 * would wait out the full delay independently.
 *
 * ```tsx
 * <Tooltip>
 *   <Tooltip.Trigger asChild>
 *     <button>MCU</button>
 *   </Tooltip.Trigger>
 *   <Tooltip.Content>Medium close-up</Tooltip.Content>
 * </Tooltip>
 * ```
 */
const TooltipRoot = TooltipPrimitive.Root

/**
 * App-level provider for every {@link Tooltip}. Render once near the root.
 * `skipDelayDuration` lets a tooltip open instantly if the pointer arrives
 * within 200ms of another tooltip closing, so scanning across a row of
 * controls (for example the shot-size options) only pays the initial
 * delay once.
 */
function TooltipProvider(
  props: React.ComponentProps<typeof TooltipPrimitive.Provider>
) {
  return (
    <TooltipPrimitive.Provider
      delayDuration={250}
      skipDelayDuration={200}
      {...props}
    />
  )
}

/** Content bubble of a {@link Tooltip}. */
function TooltipContent({
  children,
  className,
  sideOffset = 7,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  const shouldReduceMotion = Boolean(useReducedMotion())
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        asChild
        sideOffset={sideOffset}
        {...props}
      >
        <m.div
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "z-50 origin-[var(--radix-popper-transform-origin)] rounded-full bg-emphasis px-2.5 py-1 text-caption text-emphasis-foreground",
            className
          )}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.97 }}
          transition={shouldReduceMotion ? { duration: 0 } : TRANSITION_POPOVER}
        >
          {children}
          <TooltipPrimitive.Arrow className="fill-emphasis" height={5} width={10} />
        </m.div>
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

const Tooltip = Object.assign(TooltipRoot, {
  Content: TooltipContent,
  Trigger: TooltipPrimitive.Trigger,
})

export { Tooltip, TooltipProvider }
