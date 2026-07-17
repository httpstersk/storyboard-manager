"use client"

import { cva, type VariantProps } from "class-variance-authority"
import { m, useReducedMotion } from "motion/react"
import { DropdownMenu as DropdownMenuPrimitive } from "radix-ui"
import * as React from "react"
import { TRANSITION_POPOVER } from "@/lib/motion"

import { cn } from "@/lib/utils"

/**
 * A dropdown menu built on the Radix DropdownMenu primitive.
 *
 * ```tsx
 * <DropdownMenu>
 *   <DropdownMenu.Trigger asChild>
 *     <IconButton label="More actions"><Ellipsis /></IconButton>
 *   </DropdownMenu.Trigger>
 *   <DropdownMenu.Content>
 *     <DropdownMenu.Item variant="destructive" onSelect={onDelete}>
 *       Delete
 *     </DropdownMenu.Item>
 *   </DropdownMenu.Content>
 * </DropdownMenu>
 * ```
 */
const DropdownMenuRoot = DropdownMenuPrimitive.Root

/** Dropdown panel of a {@link DropdownMenu}. */
function DropdownMenuContent({
  children,
  className,
  sideOffset = 5,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  const shouldReduceMotion = Boolean(useReducedMotion())
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        asChild
        sideOffset={sideOffset}
        {...props}
      >
        <m.div
          animate={{ opacity: 1, scale: 1 }}
          className={cn(
            "z-50 min-w-36 origin-[var(--radix-popper-transform-origin)] rounded-xl border border-edge bg-surface-raised p-1 shadow-popover",
            className
          )}
          initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
          transition={shouldReduceMotion ? { duration: 0 } : TRANSITION_POPOVER}
        >
          {children}
        </m.div>
      </DropdownMenuPrimitive.Content>
    </DropdownMenuPrimitive.Portal>
  )
}

const dropdownMenuItemVariants = cva(
  "flex cursor-default items-center gap-2 rounded-lg px-2 py-1.5 text-label outline-none select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-2.75 [&_svg]:shrink-0",
  {
    defaultVariants: {
      variant: "default",
    },
    variants: {
      variant: {
        default:
          "text-ink data-[highlighted]:bg-surface-panel data-[highlighted]:text-ink-strong",
        destructive:
          "text-destructive data-[highlighted]:bg-destructive/10",
      },
    },
  }
)

/** Props for {@link DropdownMenuItem}. */
interface DropdownMenuItemProps
  extends React.ComponentProps<typeof DropdownMenuPrimitive.Item>,
    VariantProps<typeof dropdownMenuItemVariants> {}

/** A selectable action inside a {@link DropdownMenu}. */
function DropdownMenuItem({
  className,
  variant,
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(dropdownMenuItemVariants({ className, variant }))}
      {...props}
    />
  )
}

const DropdownMenu = Object.assign(DropdownMenuRoot, {
  Content: DropdownMenuContent,
  Item: DropdownMenuItem,
  Trigger: DropdownMenuPrimitive.Trigger,
})

export { DropdownMenu, type DropdownMenuItemProps }
