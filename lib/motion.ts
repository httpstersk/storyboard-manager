/** Strong ease-in-out matching CSS `--ease-in-out` for on-screen movement. */
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const

/** Strong ease-out matching CSS `--ease-out` for responsive entrances/exits. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const

/** Snappy low-bounce spring for shared-element and thumb transitions. */
const SPRING_SNAPPY = { bounce: 0.15, duration: 0.3, type: "spring" } as const

export { EASE_IN_OUT, EASE_OUT, SPRING_SNAPPY }
