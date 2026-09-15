/**
 * Ambient types for the `@magic-spells/dialog-panel` and
 * `@magic-spells/bottom-sheet` custom elements powering the storyboard
 * prompt composer. Neither package ships React types, so their JSX tags and
 * imperative element surfaces are declared here.
 */

/** Detail carried by every `dialog-panel` lifecycle event (`beforeShow`, `shown`, `beforeHide`, `hidden`). */
export interface DialogPanelEventDetail {
  /** `data-result` of the element that triggered the close, if any. */
  result: string | undefined
  state: "hidden" | "hiding" | "showing" | "shown"
  triggerElement: HTMLElement | null
}

/** Imperative surface of a `<dialog-panel>` element. */
export interface DialogPanelElement extends HTMLElement {
  readonly dialog: HTMLDialogElement
  hide(triggerEl?: HTMLElement): boolean
  readonly isOpen: boolean
  show(triggerEl?: HTMLElement): boolean
  readonly state: "hidden" | "hiding" | "showing" | "shown"
  readonly triggerElement: HTMLElement | null
}

/** Imperative surface of a `<bottom-sheet>` element. */
export interface BottomSheetElement extends HTMLElement {
  readonly backdrop: HTMLElement | null
  readonly content: HTMLElement | null
  readonly dialog: HTMLDialogElement | null
  readonly footer: HTMLElement | null
  readonly header: HTMLElement | null
  /** Clears any in-flight gesture transform and closes through the parent panel. */
  hide(): boolean
  maxDisplayWidth: number
  readonly panel: DialogPanelElement | null
  /** Opens through the parent panel. `triggerEl` is used for focus return. */
  show(triggerEl?: HTMLElement): void
  /** Current resting snap in dvh percent, or `null` when the sheet is binary. */
  snap: number | null
  /** Parsed ascending snap percentages. Assign an array or a comma-separated string. */
  snapPoints: number[] | string
  /** Animates to a declared snap. Undeclared values are ignored. */
  snapTo(value: number): void
}

declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      "bottom-sheet": DetailedHTMLProps<
        HTMLAttributes<BottomSheetElement> & {
          inset?: boolean
          "max-display-width"?: number | string
          snap?: number | string
          "snap-points"?: string
          spring?: string
        },
        BottomSheetElement
      >
      "bottom-sheet-content": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >
      "bottom-sheet-footer": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >
      "bottom-sheet-header": DetailedHTMLProps<
        HTMLAttributes<HTMLElement>,
        HTMLElement
      >
      "dialog-panel": DetailedHTMLProps<
        HTMLAttributes<DialogPanelElement>,
        DialogPanelElement
      >
    }
  }
}
