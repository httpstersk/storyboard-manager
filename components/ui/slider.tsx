"use client"

import { Slider as SliderPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

/** Props for {@link Slider}. */
interface SliderProps
  extends React.ComponentProps<typeof SliderPrimitive.Root> {
  /** Accessible name of the slider thumb. */
  label: string
}

/**
 * A slim horizontal slider built on the Radix Slider primitive.
 */
function Slider({ className, label, ...props }: SliderProps) {
  return (
    <SliderPrimitive.Root
      className={cn(
        "relative flex w-18 touch-none items-center select-none",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track className="relative h-[3px] grow rounded-full bg-edge-strong">
        <SliderPrimitive.Range className="absolute h-full rounded-full bg-emphasis" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        aria-label={label}
        className="block size-2.75 rounded-full bg-surface-raised shadow-knob outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </SliderPrimitive.Root>
  )
}

export { Slider, type SliderProps }
