"use client"

import NextImage from "next/image"
import * as React from "react"

import { useMountEffect } from "@/hooks/use-mount-effect"
import { IMAGE_UPLOAD_RULES } from "@/lib/validation"

/** Width multiplier applied to brush and eraser stroke size. */
const BRUSH_WIDTH_SCALE = 2.5

/** Tools supported by the scene drawing overlay. */
export type DrawTool = "brush" | "eraser"

/** Imperative drawing operations exposed to the scene editor. */
export interface DrawingCanvasHandle {
  clear: () => void
  getDrawing: () => HTMLCanvasElement | null
  undo: () => void
}

interface DrawingCanvasProps {
  brushSize: number
  color: string
  isDisabled: boolean
  onHistoryChange?: (state: DrawingHistoryState) => void
  ref?: React.Ref<DrawingCanvasHandle>
  tool: DrawTool
}

/** Availability flags for the drawing history controls. */
interface DrawingHistoryState {
  canClear: boolean
  canUndo: boolean
}

/** A pointer position in CSS pixels relative to the canvas top-left. */
interface Point {
  x: number
  y: number
}

/** Props for the scene image and freehand drawing surface. */
export interface SceneCanvasProps {
  brushSize: number
  color: string
  drawingCanvasRef: React.RefObject<DrawingCanvasHandle | null>
  fileInputRef: React.RefObject<HTMLInputElement | null>
  image: string | undefined | null
  isDisabled?: boolean
  onFile: (file: File) => void
  onHistoryChange?: (state: DrawingHistoryState) => void
  sceneNumber: string
  tool: DrawTool
}

/**
 * Canvas area with an image drop target and transparent freehand drawing
 * overlay. The upload input remains inside this component for a labelled,
 * keyboard-accessible image replacement control.
 */
export function SceneCanvas({
  brushSize,
  color,
  drawingCanvasRef,
  fileInputRef,
  image,
  isDisabled = false,
  onFile,
  onHistoryChange,
  sceneNumber,
  tool,
}: SceneCanvasProps) {
  function handleDrop(event: React.DragEvent) {
    event.preventDefault()

    const file = event.dataTransfer.files[0]

    if (file && !isDisabled) {
      onFile(file)
    }
  }

  return (
    <div
      className="relative flex aspect-video w-full items-center justify-center overflow-clip rounded-xl bg-surface-thumb"
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      {!image ? (
        <span className="text-canvas leading-none font-extralight tracking-display text-ink-on-media select-none sm:text-canvas-lg dark:text-emphasis-foreground/80">
          {sceneNumber}
        </span>
      ) : null}
      <CanvasImage image={image} />
      <DrawingCanvas
        brushSize={brushSize}
        color={color}
        isDisabled={isDisabled}
        onHistoryChange={onHistoryChange}
        ref={drawingCanvasRef}
        tool={tool}
      />
      <input
        accept={IMAGE_UPLOAD_RULES.acceptedTypes.join(",")}
        aria-label="Upload scene image"
        className="sr-only"
        disabled={isDisabled}
        onChange={(event) => {
          const file = event.target.files?.[0]

          if (file) {
            onFile(file)
          }

          event.target.value = ""
        }}
        ref={fileInputRef}
        type="file"
      />
      <span className="absolute right-3 bottom-2.5 z-20 rounded-full bg-ink-strong/55 px-2.5 py-[3px] text-caption text-ink-on-media">
        100%
      </span>
    </div>
  )
}

/** Uploaded image preview shown behind the drawing surface. */
function CanvasImage({ image }: { image: string | undefined | null }) {
  if (!image) {
    return null
  }

  return (
    <NextImage
      alt="Uploaded scene reference"
      className="absolute inset-0 z-10 size-full object-cover"
      fill
      src={image}
      unoptimized
    />
  )
}

/** Transparent pointer-driven drawing overlay for an editable scene image. */
function DrawingCanvas({
  brushSize,
  color,
  isDisabled,
  onHistoryChange,
  ref,
  tool,
}: DrawingCanvasProps) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const drawingRef = React.useRef(false)
  const historyRef = React.useRef<HTMLCanvasElement[]>([])
  const lastPointRef = React.useRef<Point | null>(null)

  const triggerHistoryChange = React.useCallback(() => {
    onHistoryChange?.({
      canClear: historyRef.current.length > 0,
      canUndo: historyRef.current.length > 0,
    })
  }, [onHistoryChange])

  function saveStateToHistory() {
    const canvas = canvasRef.current

    if (!canvas) {
      return
    }

    const copy = document.createElement("canvas")
    copy.height = canvas.height
    copy.width = canvas.width
    copy.getContext("2d")?.drawImage(canvas, 0, 0)
    historyRef.current.push(copy)
    triggerHistoryChange()
  }

  React.useImperativeHandle(
    ref,
    () => ({
      clear: () => {
        const canvas = canvasRef.current
        const context = canvas?.getContext("2d")

        if (!canvas || !context) {
          return
        }

        context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
        historyRef.current = []
        triggerHistoryChange()
      },
      getDrawing: () => captureDrawing(canvasRef.current),
      undo: () => {
        const canvas = canvasRef.current
        const context = canvas?.getContext("2d")

        if (!canvas || !context || historyRef.current.length === 0) {
          return
        }

        const previousState = historyRef.current.pop()

        if (previousState) {
          context.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight)
          context.drawImage(
            previousState,
            0,
            0,
            canvas.clientWidth,
            canvas.clientHeight
          )
        }

        triggerHistoryChange()
      },
    }),
    [triggerHistoryChange]
  )

  useMountEffect(() => {
    const canvas = canvasRef.current

    if (canvas === null) {
      return
    }

    syncCanvasSize(canvas)
    triggerHistoryChange()

    const observer = new ResizeObserver(() => syncCanvasSize(canvas))
    observer.observe(canvas)

    return () => observer.disconnect()
  })

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")

    if (!canvas || !context) {
      return
    }

    canvas.setPointerCapture(event.pointerId)
    drawingRef.current = true
    saveStateToHistory()

    const point = getCanvasPoint(canvas, event)
    lastPointRef.current = point
    configureStroke(context, tool, color, brushSize)
    drawSegment(context, point, point)
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")

    if (!drawingRef.current || !canvas || !context) {
      return
    }

    const point = getCanvasPoint(canvas, event)
    drawSegment(context, lastPointRef.current ?? point, point)
    lastPointRef.current = point
  }

  function handlePointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current

    if (!drawingRef.current) {
      return
    }

    drawingRef.current = false
    lastPointRef.current = null

    if (canvas?.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId)
    }
  }

  return (
    <canvas
      className={`absolute inset-0 z-10 size-full touch-none ${isDisabled ? "pointer-events-none cursor-not-allowed" : "cursor-crosshair"}`}
      onPointerCancel={handlePointerUp}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      ref={canvasRef}
    />
  )
}

/** Captures a detached copy only when the overlay contains painted pixels. */
function captureDrawing(
  canvas: HTMLCanvasElement | null
): HTMLCanvasElement | null {
  if (canvas === null || canvas.height === 0 || canvas.width === 0) {
    return null
  }

  const context = canvas.getContext("2d")

  if (context === null) {
    return null
  }

  const { data } = context.getImageData(0, 0, canvas.width, canvas.height)

  for (let index = 3; index < data.length; index += 4) {
    if (data[index] !== 0) {
      const copy = document.createElement("canvas")
      copy.height = canvas.height
      copy.width = canvas.width
      copy.getContext("2d")?.drawImage(canvas, 0, 0)

      return copy
    }
  }

  return null
}

/** Configures the drawing context for the active tool and selected colour. */
function configureStroke(
  context: CanvasRenderingContext2D,
  tool: DrawTool,
  color: string,
  brushSize: number
): void {
  context.lineCap = "round"
  context.lineJoin = "round"

  if (tool === "eraser") {
    context.globalCompositeOperation = "destination-out"
    context.lineWidth = brushSize * BRUSH_WIDTH_SCALE
    context.strokeStyle = "#000000"

    return
  }

  context.globalCompositeOperation = "source-over"
  context.lineWidth = brushSize * BRUSH_WIDTH_SCALE
  context.strokeStyle = color
}

/** Draws a segment, including a dot when both endpoints are identical. */
function drawSegment(
  context: CanvasRenderingContext2D,
  from: Point,
  to: Point
): void {
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
}

/** Gets a pointer position relative to a canvas in CSS pixels. */
function getCanvasPoint(
  canvas: HTMLCanvasElement,
  event: React.PointerEvent<HTMLCanvasElement>
): Point {
  const rect = canvas.getBoundingClientRect()

  return { x: event.clientX - rect.left, y: event.clientY - rect.top }
}

/** Keeps the backing store in device pixels while preserving existing marks. */
function syncCanvasSize(canvas: HTMLCanvasElement): void {
  const context = canvas.getContext("2d")

  if (context === null) {
    return
  }

  const ratio = window.devicePixelRatio || 1
  const cssHeight = canvas.clientHeight
  const cssWidth = canvas.clientWidth
  const height = Math.round(cssHeight * ratio)
  const width = Math.round(cssWidth * ratio)

  if (
    height === 0 ||
    width === 0 ||
    (canvas.height === height && canvas.width === width)
  ) {
    return
  }

  const previous = document.createElement("canvas")
  previous.height = canvas.height
  previous.width = canvas.width
  previous.getContext("2d")?.drawImage(canvas, 0, 0)

  canvas.height = height
  canvas.width = width
  context.setTransform(ratio, 0, 0, ratio, 0, 0)

  if (previous.height > 0 && previous.width > 0) {
    context.drawImage(previous, 0, 0, cssWidth, cssHeight)
  }
}
