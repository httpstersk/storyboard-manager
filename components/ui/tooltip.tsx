"use client"

import { Tooltip as TooltipPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A hover/focus tooltip built on the Radix Tooltip primitive.
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
function TooltipRoot({
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return (
    <TooltipPrimitive.Provider delayDuration={250}>
      <TooltipPrimitive.Root {...props} />
    </TooltipPrimitive.Provider>
  )
}

/** Content bubble of a {@link Tooltip}. */
function TooltipContent({
  children,
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        className={cn(
          "z-50 rounded-full bg-emphasis px-2.5 py-1 text-caption text-emphasis-foreground",
          className
        )}
        sideOffset={sideOffset}
        {...props}
      >
        {children}
        <TooltipPrimitive.Arrow className="fill-emphasis" height={4} width={8} />
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  )
}

const Tooltip = Object.assign(TooltipRoot, {
  Content: TooltipContent,
  Trigger: TooltipPrimitive.Trigger,
})

export { Tooltip }
