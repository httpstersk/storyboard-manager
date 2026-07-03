"use client"

import { Tooltip as TooltipPrimitive } from "radix-ui"
import * as React from "react"

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
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn(
          "z-50 origin-[var(--radix-popper-transform-origin)] rounded-full bg-emphasis px-2.5 py-1 text-caption text-emphasis-foreground",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-100 data-[state=closed]:ease-out",
          "data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-[state=delayed-open]:duration-125 data-[state=delayed-open]:ease-out",
          "data-[state=instant-open]:animate-in data-[state=instant-open]:fade-in-0 data-[state=instant-open]:zoom-in-95 data-[state=instant-open]:duration-125 data-[state=instant-open]:ease-out",
          className
        )}
        sideOffset={sideOffset}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-emphasis" height={5} width={10} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

const Tooltip = Object.assign(TooltipRoot, {
  Content: TooltipContent,
  Trigger: TooltipPrimitive.Trigger,
})

export { Tooltip, TooltipProvider }
