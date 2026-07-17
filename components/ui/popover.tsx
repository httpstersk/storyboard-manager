"use client"
import { m, useReducedMotion } from "motion/react"

import { Popover as PopoverPrimitive } from "radix-ui"
import * as React from "react"
import { TRANSITION_POPOVER } from "@/lib/motion"

import { cn } from "@/lib/utils"

/**
 * A popover built on the Radix Popover primitive.
 *
 * ```tsx
 * <Popover>
 *   <Popover.Trigger asChild>
 *     <IconButton label="Sound settings">
 *       <Volume2 aria-hidden />
 *     </IconButton>
 *   </Popover.Trigger>
 *   <Popover.Content>...</Popover.Content>
 * </Popover>
 * ```
 */
const PopoverRoot = PopoverPrimitive.Root

/** Floating panel of a {@link Popover}. */
function PopoverContent({
  align = "end",
  children,
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const shouldReduceMotion = Boolean(useReducedMotion())
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        asChild
        align={align}
        sideOffset={sideOffset}
        {...props}
      >
        <m.div
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "z-50 origin-[var(--radix-popper-transform-origin)] rounded-xl border border-edge bg-surface-raised p-3 shadow-popover",
            className
          )}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
          transition={shouldReduceMotion ? { duration: 0 } : TRANSITION_POPOVER}
        >
          {children}
        </m.div>
      </PopoverPrimitive.Content>
    </PopoverPrimitive.Portal>
  )
}

const Popover = Object.assign(PopoverRoot, {
  Content: PopoverContent,
  Trigger: PopoverPrimitive.Trigger,
})

export { Popover }
