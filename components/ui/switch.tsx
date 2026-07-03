"use client"

import { Switch as SwitchPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A pill-shaped on/off switch built on the Radix Switch primitive.
 */
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        "flex h-4.5 w-8 shrink-0 items-center rounded-full bg-surface-inset p-0.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-emphasis",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="block size-3.5 rounded-full bg-surface-raised shadow-knob transition-transform data-[state=checked]:translate-x-3.5 data-[state=checked]:bg-emphasis-foreground" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
