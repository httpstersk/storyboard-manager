import { useAtomValue } from "jotai"
import * as React from "react"

import { playClickSound } from "@/lib/click-sound"
import { soundSettingsAtom } from "@/lib/sound-settings"

/**
 * Selector matching every control that should emit a click sound. `button`
 * covers the switch, segmented options, pill-select trigger, colour
 * swatches, and steppers; the role entries cover portaled, non-button
 * controls (select options, menu items, and the slider thumb).
 */
const INTERACTIVE_SELECTOR = [
  "button",
  '[role="menuitem"]',
  '[role="option"]',
  '[role="slider"]',
].join(", ")

/** Keys that activate a focused control and so should tick like a click. */
const ACTIVATION_KEYS = new Set(["Enter", " "])

/**
 * Resolves the interactive control at an event target, or null when the
 * target is not inside an enabled control.
 */
function resolveControl(target: EventTarget | null): Element | null {
  if (!(target instanceof Element)) {
    return null
  }

  const control = target.closest(INTERACTIVE_SELECTOR)

  if (control === null) {
    return null
  }

  const disabled =
    control.matches(":disabled") ||
    control.getAttribute("aria-disabled") === "true"

  return disabled ? null : control
}

/**
 * Plays a subtle click whenever the user activates a button or parameter
 * control anywhere in the app. Wire once, near the app root.
 *
 * Uses document-level pointer and keyboard listeners (a deliberate
 * external-system synchronisation) rather than per-control handlers, so no
 * component needs to opt in. The listeners close over the current
 * preferences and are re-bound when those change; while muted, none are
 * attached at all.
 */
export function useInteractionSounds(): void {
  const { enabled, volume } = useAtomValue(soundSettingsAtom)
  // Read the latest volume inside the handlers via a ref so dragging the
  // volume slider does not tear down and re-bind the document listeners on
  // every step; the listener effect below re-runs only when `enabled` flips.
  const volumeRef = React.useRef(volume)

  React.useEffect(() => {
    volumeRef.current = volume
  }, [volume])

  React.useEffect(() => {
    if (!enabled) {
      return
    }

    function play(target: EventTarget | null): void {
      if (resolveControl(target) !== null) {
        playClickSound({ volume: volumeRef.current })
      }
    }

    function onPointerDown(event: PointerEvent): void {
      // Primary button / touch / pen only; ignore right- and middle-click.
      if (event.button !== 0) {
        return
      }

      play(event.target)
    }

    function onKeyDown(event: KeyboardEvent): void {
      if (event.repeat || !ACTIVATION_KEYS.has(event.key)) {
        return
      }

      play(event.target)
    }

    document.addEventListener("pointerdown", onPointerDown, { passive: true })
    document.addEventListener("keydown", onKeyDown)

    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [enabled])
}
