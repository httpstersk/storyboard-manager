import * as React from "react"

/**
 * Runs `effect` once after mount and its optional cleanup on unmount.
 *
 * Use for one-time synchronisation with an external system — DOM APIs,
 * browser subscriptions, or third-party widget lifecycles — where the
 * behaviour is naturally "set up on mount, tear down on unmount". Prefer
 * derived values, event handlers, or a `key` prop over reaching for a
 * dependency-driven effect.
 */
export function useMountEffect(effect: () => void | (() => void)): void {
  // eslint-disable-next-line react-hooks/exhaustive-deps, react-doctor/exhaustive-deps -- mount-only by design
  React.useEffect(effect, [])
}
