"use client"
import { m, useReducedMotion } from "motion/react"

import { SFCheckmark, SFChevronDown } from "sf-symbols-lib/monochrome"
import { Select } from "radix-ui"
import * as React from "react"
import { TRANSITION_POPOVER } from "@/lib/motion"

import { cn } from "@/lib/utils"

/** Props for the {@link PillSelect} root. */
interface PillSelectProps {
  children: React.ReactNode
  /** Called with the newly selected value. */
  onValueChange: (value: string) => void
  /** Currently selected value. */
  value: string
}

/**
 * A compact pill-shaped select.
 *
 * ```tsx
 * <PillSelect onValueChange={setCamera} value={camera}>
 *   <PillSelect.Trigger label="Camera" />
 *   <PillSelect.Content>
 *     <PillSelect.Option value="Alexa 35">Alexa 35</PillSelect.Option>
 *   </PillSelect.Content>
 * </PillSelect>
 * ```
 */
function PillSelect({ children, onValueChange, value }: PillSelectProps) {
  return (
    <Select.Root onValueChange={onValueChange} value={value}>
      {children}
    </Select.Root>
  )
}

/** Props for {@link PillSelectTrigger}. */
interface PillSelectTriggerProps
  extends React.ComponentProps<typeof Select.Trigger> {
  /** Accessible name of the select. */
  label: string
}

/** Trigger button of a {@link PillSelect}. */
function PillSelectTrigger({
  className,
  label,
  ...props
}: PillSelectTriggerProps) {
  return (
    <Select.Trigger
      aria-label={label}
      className={cn(
        "flex items-center gap-1.5 rounded-full bg-surface-inset py-1 pr-2 pl-2.5 text-caption text-ink transition-colors outline-none hover:text-ink-strong focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-emphasis data-[state=open]:text-emphasis-foreground",
        className
      )}
      {...props}
    >
      <Select.Value />
      <Select.Icon>
        <SFChevronDown aria-hidden className="size-2.5 opacity-70" />
      </Select.Icon>
    </Select.Trigger>
  )
}

/** Dropdown panel of a {@link PillSelect}. */
function PillSelectContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Select.Content>) {
  const shouldReduceMotion = Boolean(useReducedMotion())
  return (
    <Select.Portal>
      <Select.Content
        asChild
        position="popper"
        sideOffset={5}
        {...props}
      >
        <m.div
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "z-50 min-w-28 origin-[var(--radix-popper-transform-origin)] rounded-xl border border-edge bg-surface-raised p-1 shadow-popover",
            className
          )}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
          transition={shouldReduceMotion ? { duration: 0 } : TRANSITION_POPOVER}
        >
          <Select.Viewport className="flex flex-col gap-px">
            {children}
          </Select.Viewport>
        </m.div>
      </Select.Content>
    </Select.Portal>
  )
}

/** Props for {@link PillSelectOption}. */
interface PillSelectOptionProps
  extends React.ComponentProps<typeof Select.Item> {
  /** Value selected when this option is chosen. */
  value: string
}

/** A selectable option inside a {@link PillSelect}. */
function PillSelectOption({
  children,
  className,
  value,
  ...props
}: PillSelectOptionProps) {
  return (
    <Select.Item
      className={cn(
        "flex cursor-default items-center justify-between gap-2 rounded-lg px-2 py-1 text-caption text-ink outline-none select-none data-[highlighted]:bg-surface-panel data-[state=checked]:font-medium data-[state=checked]:text-ink-strong",
        className
      )}
      value={value}
      {...props}
    >
      <Select.ItemText>{children}</Select.ItemText>
      <Select.ItemIndicator>
        <SFCheckmark aria-hidden className="size-2.5" />
      </Select.ItemIndicator>
    </Select.Item>
  )
}

PillSelect.Content = PillSelectContent
PillSelect.Option = PillSelectOption
PillSelect.Trigger = PillSelectTrigger

export {
  PillSelect,
  type PillSelectOptionProps,
  type PillSelectProps,
  type PillSelectTriggerProps,
}
