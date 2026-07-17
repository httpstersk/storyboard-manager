/** Strong ease-in-out matching CSS `--ease-in-out` for on-screen movement. */
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const

/** Strong ease-out matching CSS `--ease-out` for responsive entrances/exits. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const
/** Standard spring for medium-distance layout movement and panel shifts. */
const SPRING_LAYOUT = { bounce: 0.1, duration: 0.35, type: "spring" } as const

/** Snappy low-bounce spring for shared-element and thumb transitions. */
const SPRING_SNAPPY = { bounce: 0.15, duration: 0.3, type: "spring" } as const
/** Fast fade used for compact helper UI and ephemeral status lines. */
const TRANSITION_FADE_FAST = { duration: 0.125, ease: EASE_OUT } as const

/** Standard fade timing for overlays and subtle content transitions. */
const TRANSITION_FADE_STANDARD = { duration: 0.18, ease: EASE_OUT } as const

/** Modal panel enter timing with subtle scale and responsive easing. */
const TRANSITION_MODAL = { duration: 0.2, ease: EASE_OUT } as const

/** Small popover/select/tooltip panel scale-and-fade timing. */
const TRANSITION_POPOVER = { duration: 0.15, ease: EASE_OUT } as const

export {
  EASE_IN_OUT,
  EASE_OUT,
  SPRING_LAYOUT,
  SPRING_SNAPPY,
  TRANSITION_FADE_FAST,
  TRANSITION_FADE_STANDARD,
  TRANSITION_MODAL,
  TRANSITION_POPOVER,
}
