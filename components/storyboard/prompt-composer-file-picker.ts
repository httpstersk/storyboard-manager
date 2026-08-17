/**
 * Delay before attaching the window `focus` fallback that ends a file-picker
 * session. Native pickers can emit `focus` as the dialog opens; waiting a
 * macrotask avoids treating that as "the user closed the picker".
 */
const FILE_PICKER_FOCUS_LISTENER_DELAY_MS = 0

/** Tracks an open native file picker so the composer can stay expanded. */
export interface FilePickerSession {
  /** Opens `input`'s native picker and marks the session active. */
  begin: (input: HTMLInputElement | null) => void
  /** Whether a native file picker is currently holding focus. */
  isOpen: () => boolean
}

/**
 * Creates a session that survives the focus loss caused by an OS file dialog.
 * Callers skip composer collapse while {@link FilePickerSession.isOpen} is true.
 */
export function createFilePickerSession(): FilePickerSession {
  let focusListenerTimeoutId = 0
  let isOpen = false
  let trackedInput: HTMLInputElement | null = null

  function end(): void {
    if (!isOpen) {
      return
    }

    isOpen = false
    window.clearTimeout(focusListenerTimeoutId)
    window.removeEventListener("focus", end)
    trackedInput?.removeEventListener("cancel", end)
    trackedInput?.removeEventListener("change", end)
    trackedInput = null
  }

  function begin(input: HTMLInputElement | null): void {
    end()

    if (input === null) {
      return
    }

    isOpen = true
    trackedInput = input
    input.addEventListener("cancel", end)
    input.addEventListener("change", end)
    // Native file pickers can emit a window `focus` as the dialog opens.
    // Defer the fallback listener so that event does not end the session
    // before the user has chosen or cancelled.
    focusListenerTimeoutId = window.setTimeout(() => {
      window.addEventListener("focus", end)
    }, FILE_PICKER_FOCUS_LISTENER_DELAY_MS)
    input.click()
  }

  return {
    begin,
    isOpen: () => isOpen,
  }
}
