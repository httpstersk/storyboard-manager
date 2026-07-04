"use client"

import { MotionConfig } from "motion/react"
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes"
import * as React from "react"

import { TooltipProvider } from "@/components/ui/tooltip"
import { useInteractionSounds } from "@/hooks/use-interaction-sounds"

function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  useInteractionSounds()

  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      {...props}
    >
      <ThemeHotkey />
      {/* Every motion.* element in the tree automatically respects the
          user's OS-level reduced-motion preference with no per-component
          opt-in required. */}
      <MotionConfig reducedMotion="user">
        {/* Rendered once so every <Tooltip> in the app shares delay
            state -- see the skipDelayDuration note in ui/tooltip.tsx. */}
        <TooltipProvider>{children}</TooltipProvider>
      </MotionConfig>
    </NextThemesProvider>
  )
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.isContentEditable ||
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT"
  )
}

function ThemeHotkey() {
  const { resolvedTheme, setTheme } = useTheme()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) {
        return
      }

      if (event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() !== "d") {
        return
      }

      if (isTypingTarget(event.target)) {
        return
      }

      setTheme(resolvedTheme === "dark" ? "light" : "dark")
    }

    window.addEventListener("keydown", onKeyDown)

    return () => {
      window.removeEventListener("keydown", onKeyDown)
    }
  }, [resolvedTheme, setTheme])

  return null
}

export { ThemeProvider }
