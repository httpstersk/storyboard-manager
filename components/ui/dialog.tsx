"use client"

import { Dialog as DialogPrimitive } from "radix-ui"
import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * A modal dialog built on the Radix Dialog primitive.
 *
 * ```tsx
 * <Dialog onOpenChange={setOpen} open={open}>
 *   <Dialog.Content>
 *     <Dialog.Header>
 *       <Dialog.Title>Edit scene</Dialog.Title>
 *     </Dialog.Header>
 *     <Dialog.Footer>...</Dialog.Footer>
 *   </Dialog.Content>
 * </Dialog>
 * ```
 */
const DialogRoot = DialogPrimitive.Root

/** Panel of a {@link Dialog}, rendered in a portal above an overlay. */
function DialogContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:duration-150 data-[state=closed]:ease-out data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:duration-200 data-[state=open]:ease-out" />
      <DialogPrimitive.Content
        className={cn(
          "fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100svh-3rem)] w-[calc(100vw-2rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-clip rounded-2xl border border-edge bg-surface-panel shadow-modal outline-none",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:duration-150 data-[state=closed]:ease-out",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:duration-200 data-[state=open]:ease-out",
          className
        )}
        {...props}
      >
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** Header bar of a {@link Dialog}. */
function DialogHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex h-14 shrink-0 items-center justify-between border-b border-edge px-5",
        className
      )}
      {...props}
    />
  )
}

/** Title of a {@link Dialog}, announced when the dialog opens. */
function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-title font-medium text-ink-strong", className)}
      {...props}
    />
  )
}

/** Supporting description of a {@link Dialog}. */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      className={cn("text-label text-ink-muted", className)}
      {...props}
    />
  )
}

/** Footer bar of a {@link Dialog}. */
function DialogFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex h-15 shrink-0 items-center justify-between px-5",
        className
      )}
      {...props}
    />
  )
}

const Dialog = Object.assign(DialogRoot, {
  Close: DialogPrimitive.Close,
  Content: DialogContent,
  Description: DialogDescription,
  Footer: DialogFooter,
  Header: DialogHeader,
  Title: DialogTitle,
  Trigger: DialogPrimitive.Trigger,
})

export { Dialog }
