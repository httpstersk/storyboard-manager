"use client"

import * as React from "react"

import { SceneThumbnailShader } from "@/components/storyboard/scene-thumbnail-shader"
import { Field } from "@/components/ui/field"
import { InlineInput } from "@/components/ui/inline-input"
import type { Scene } from "@/lib/storyboard"
import { cn } from "@/lib/utils"

interface SceneCardContextValue {
  scene: Scene
  sceneNumber: string
}

const SceneCardContext = React.createContext<SceneCardContextValue | null>(
  null
)

function useSceneCard(): SceneCardContextValue {
  const context = React.useContext(SceneCardContext)

  if (context === null) {
    throw new Error(
      "SceneCard compound components must be used within <SceneCard>."
    )
  }

  return context
}

/** Props for the {@link SceneCard} root. */
interface SceneCardProps extends React.ComponentProps<"article"> {
  /** Scene rendered by this card. */
  scene: Scene
  /** Two-digit display number of the scene, for example "01". */
  sceneNumber: string
}

/**
 * A storyboard scene card.
 *
 * ```tsx
 * <SceneCard scene={scene} sceneNumber="01">
 *   <SceneCard.Thumbnail onEdit={openEditor} />
 *   <SceneCard.Details>
 *     <SceneCard.Row label="Time">...</SceneCard.Row>
 *     <SceneCard.Notes>
 *       <SceneCard.NoteRow label="Action" ... />
 *     </SceneCard.Notes>
 *   </SceneCard.Details>
 * </SceneCard>
 * ```
 */
function SceneCardRoot({
  children,
  className,
  scene,
  sceneNumber,
  ...props
}: SceneCardProps) {
  const contextValue = React.useMemo<SceneCardContextValue>(
    () => ({ scene, sceneNumber }),
    [scene, sceneNumber]
  )

  return (
    <article
      aria-label={`Scene ${sceneNumber}`}
      className={cn("flex flex-col bg-surface-panel", className)}
      {...props}
    >
      <SceneCardContext.Provider value={contextValue}>
        {children}
      </SceneCardContext.Provider>
    </article>
  )
}

/** Props for {@link SceneCardThumbnail}. */
interface SceneCardThumbnailProps {
  className?: string
  /** Called when the thumbnail is activated to edit the scene. */
  onEdit: () => void
}

/**
 * Scene preview area: shader background, uploaded reference image when
 * present, giant numeral, and a full-size edit target.
 */
function SceneCardThumbnail({ className, onEdit }: SceneCardThumbnailProps) {
  const { scene, sceneNumber } = useSceneCard()

  return (
    <div
      className={cn(
        "relative flex aspect-video shrink-0 items-center justify-center overflow-clip bg-surface-thumb",
        className
      )}
    >
      <SceneThumbnailShader preset={scene.shader} />
      <SceneCardReferenceImage image={scene.image} />
      {!scene.image && (
        <span className="relative z-10 text-display font-extralight tracking-display text-ink-on-media/90 select-none">
          {sceneNumber}
        </span>
      )}
      <button
        aria-label={`Edit scene ${sceneNumber}`}
        className="absolute inset-0 z-20 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        onClick={onEdit}
        type="button"
      />
    </div>
  )
}

/** Uploaded reference image overlay, rendered only when one exists. */
function SceneCardReferenceImage({ image }: { image?: string }) {
  if (!image) {
    return null
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- data URLs from local uploads cannot go through next/image
    <img
      alt=""
      className="absolute inset-0 z-10 size-full object-cover"
      src={image}
    />
  )
}

/** Container for the parameter rows and notes of a {@link SceneCard}. */
function SceneCardDetails({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div className={cn("flex flex-col gap-2 p-3", className)} {...props} />
  )
}

/** Props for {@link SceneCardRow}. */
interface SceneCardRowProps {
  children: React.ReactNode
  className?: string
  /** Label shown on the left of the row. */
  label: string
}

/** A labelled parameter row inside {@link SceneCardDetails}. */
function SceneCardRow({ children, className, label }: SceneCardRowProps) {
  return (
    <Field className={cn("min-h-5.5", className)}>
      <Field.Label>{label}</Field.Label>
      <Field.Control>{children}</Field.Control>
    </Field>
  )
}

/** Container for the note rows of a {@link SceneCard}. */
function SceneCardNotes({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "mt-1 flex flex-col gap-2 border-t border-edge pt-2",
        className
      )}
      {...props}
    />
  )
}

/** Props for {@link SceneCardNoteRow}. */
interface SceneCardNoteRowProps {
  /** Label shown on the left of the note. */
  label: string
  /** Called with the sanitised note text on every change. */
  onValueChange: (value: string) => void
  /** Placeholder shown when the note is empty. */
  placeholder: string
  /** Current note text. */
  value: string
}

/** An inline-editable note row inside {@link SceneCardNotes}. */
function SceneCardNoteRow({
  label,
  onValueChange,
  placeholder,
  value,
}: SceneCardNoteRowProps) {
  return (
    <Field className="min-h-5.5 justify-start">
      <Field.Label className="w-12">{label}</Field.Label>
      <Field.Control>
        <InlineInput
          onChange={(event) => onValueChange(event.target.value)}
          placeholder={placeholder}
          value={value}
        />
      </Field.Control>
    </Field>
  )
}

const SceneCard = Object.assign(SceneCardRoot, {
  Details: SceneCardDetails,
  NoteRow: SceneCardNoteRow,
  Notes: SceneCardNotes,
  Row: SceneCardRow,
  Thumbnail: SceneCardThumbnail,
})

export {
  SceneCard,
  type SceneCardNoteRowProps,
  type SceneCardProps,
  type SceneCardRowProps,
  type SceneCardThumbnailProps,
}
