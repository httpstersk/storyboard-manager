"use client"

import { Popover as PopoverPrimitive } from "radix-ui"
import * as React from "react"

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
  className,
  sideOffset = 8,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        className={cn(
          "z-50 origin-[var(--radix-popper-transform-origin)] rounded-xl border border-edge bg-surface-raised p-3 shadow-popover",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-125 data-[state=closed]:ease-out",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-150 data-[state=open]:ease-out",
          className
        )}
        sideOffset={sideOffset}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

const Popover = Object.assign(PopoverRoot, {
  Content: PopoverContent,
  Trigger: PopoverPrimitive.Trigger,
})

export { Popover }
