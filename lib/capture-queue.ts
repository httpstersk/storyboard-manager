/**
 * Serial queue for DOM capture operations.
 *
 * `html-to-image` serialises the full DOM to SVG and renders it on a canvas
 * on the main thread. Running multiple captures concurrently causes all of
 * them to compete for the same thread, making the UI feel frozen.
 *
 * {@link enqueueCapture} drains one work item at a time so captures
 * interleave with frame rendering rather than piling up simultaneously.
 * A failure in one capture does not block subsequent ones.
 */

/** Module-level chain — resolved immediately before the first capture. */
let captureChain: Promise<void> = Promise.resolve()

/**
 * Appends a capture unit to the module-level serial queue and returns its
 * result promise. Concurrent calls are serialised FIFO; each unit starts
 * only after the previous one settles (success or failure).
 *
 * @param work - Async factory that performs the actual capture.
 * @returns A promise that resolves or rejects with the capture result.
 */
export function enqueueCapture<T>(work: () => Promise<T>): Promise<T> {
  const result = captureChain.then(work)

  // Detach error handling from the shared chain so a failed capture does
  // not prevent the next one from starting.
  captureChain = result.then(
    () => {},
    () => {}
  )

  return result
}
