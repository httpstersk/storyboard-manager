import { cva, type VariantProps } from "class-variance-authority"
import * as React from "react"

import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full outline-none transition-[color,background-color,transform] duration-150 ease-out active:scale-95 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-surface-panel disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    defaultVariants: {
      size: "md",
      variant: "subtle",
    },
    variants: {
      size: {
        label: "h-7 gap-1.5 px-3 text-label font-medium [&_svg]:size-3.5",
        md: "size-7 [&_svg]:size-3.5",
        sm: "size-6 [&_svg]:size-3",
      },
      variant: {
        emphasis:
          "bg-emphasis text-emphasis-foreground hover:bg-emphasis/85",
        ghost: "text-ink-muted hover:bg-surface-inset hover:text-ink-strong",
        subtle:
          "bg-surface-inset text-ink-muted hover:text-ink-strong",
      },
    },
  }
)

/** Props for {@link IconButton}. */
interface IconButtonProps
  extends React.ComponentProps<"button">,
    VariantProps<typeof iconButtonVariants> {
  /** Accessible name announced to screen readers. */
  label: string
}

/**
 * A circular icon button, or a labeled pill when `size="label"`.
 */
function IconButton({
  className,
  label,
  size,
  type = "button",
  variant,
  ...props
}: IconButtonProps) {
  return (
    <button
      aria-label={label}
      className={cn(iconButtonVariants({ className, size, variant }))}
      type={type}
      {...props}
    />
  )
}

export { IconButton, iconButtonVariants, type IconButtonProps }
