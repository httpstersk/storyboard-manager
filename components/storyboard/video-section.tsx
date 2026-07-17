"use client"

import { useAtom, useAtomValue, useSetAtom } from "jotai"
import * as React from "react"
import { SFDocumentOnDocument } from "sf-symbols-lib/monochrome"

import { readFileAsDataUrl } from "@/components/storyboard/prompt-composer-context"
import { IconButton } from "@/components/ui/icon-button"
import { captureNodePngDataUrl } from "@/lib/board-io"
import { requestVideoGeneration } from "@/lib/generate-video-client"
import type { Scene } from "@/lib/storyboard"
import { cn } from "@/lib/utils"
import { MAX_SEEDANCE_CHARACTER_IMAGES } from "@/lib/video-generation"
import {
  composerCharacterImageFilesAtom,
  generatedVideoUrlAtom,
  isGeneratingVideoAtom,
  seedanceVideoPromptAtom,
  videoGenerationErrorAtom,
  videoPromptSourceAtom,
} from "@/lib/video-section-atoms"

/** Props for {@link VideoSectionRoot}. */
interface VideoSectionRootProps extends React.ComponentProps<"section"> {
  /** Ref to the scene grid element used for PNG capture. */
  gridRef: React.RefObject<HTMLElement | null>
  /**
   * Visible scenes of the selected board (rows × columns), synced into the
   * prompt atom so the Seedance prompt matches the on-screen grid.
   */
  scenes: Scene[]
}

/**
 * Video section below the storyboard grid: copyable Seedance prompt with
 * generate controls, then the video player placeholder.
 *
 * ```tsx
 * <VideoSection.Root gridRef={gridRef} scenes={scenes}>
 *   <VideoSection.Prompt />
 *   <VideoSection.Player />
 * </VideoSection.Root>
 * ```
 */
function VideoSectionRoot({
  children,
  className,
  gridRef,
  scenes,
  ...props
}: VideoSectionRootProps) {
  const characterImageFiles = useAtomValue(composerCharacterImageFilesAtom)
  const setSource = useSetAtom(videoPromptSourceAtom)

  React.useEffect(() => {
    setSource((previous) => ({
      ...previous,
      characterImageCount: Math.min(
        characterImageFiles.length,
        MAX_SEEDANCE_CHARACTER_IMAGES
      ),
      scenes,
    }))
  }, [characterImageFiles.length, scenes, setSource])

  return (
    <VideoSectionContext.Provider value={{ gridRef }}>
      <section
        aria-label="Video"
        className={cn(
          "flex shrink-0 flex-col gap-3 rounded-2xl bg-surface-panel p-4",
          className
        )}
        {...props}
      >
        {children}
      </section>
    </VideoSectionContext.Provider>
  )
}

interface VideoSectionContextValue {
  gridRef: React.RefObject<HTMLElement | null>
}

const VideoSectionContext =
  React.createContext<VideoSectionContextValue | null>(null)

function useVideoSection(): VideoSectionContextValue {
  const context = React.use(VideoSectionContext)

  if (context === null) {
    throw new Error(
      "VideoSection compound components must be used within <VideoSection.Root>."
    )
  }

  return context
}

/** Aspect-ratio player showing a placeholder or the generated video. */
function VideoSectionPlayer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const isGenerating = useAtomValue(isGeneratingVideoAtom)
  const videoUrl = useAtomValue(generatedVideoUrlAtom)

  return (
    <div
      className={cn(
        "aspect-video relative overflow-hidden rounded-xl bg-surface-inset",
        className
      )}
      {...props}
    >
      {videoUrl !== null ? (
        <video
          aria-label="Generated storyboard video"
          className="size-full object-contain"
          controls
          key={videoUrl}
          src={videoUrl}
        />
      ) : (
        <div className="flex size-full items-center justify-center px-4">
          <p className="text-center text-caption text-ink-faint">
            {isGenerating
              ? "Generating video with Seedance 2.0…"
              : "Generated video will appear here"}
          </p>
        </div>
      )}
    </div>
  )
}

/**
 * Copyable Seedance prompt with Copy and Generate Video actions in one row.
 */
function VideoSectionPrompt({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { gridRef } = useVideoSection()
  const characterImageFiles = useAtomValue(composerCharacterImageFilesAtom)
  const [copied, setCopied] = React.useState(false)
  const copiedResetRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  const [error, setError] = useAtom(videoGenerationErrorAtom)
  const [isGenerating, setIsGenerating] = useAtom(isGeneratingVideoAtom)
  const prompt = useAtomValue(seedanceVideoPromptAtom)
  const setGeneratedVideoUrl = useSetAtom(generatedVideoUrlAtom)

  const canGenerate = !isGenerating && prompt.trim() !== ""

  React.useEffect(() => {
    return () => {
      if (copiedResetRef.current !== null) {
        clearTimeout(copiedResetRef.current)
      }
    }
  }, [])

  const handleCopy = async () => {
    if (prompt.trim() === "") {
      return
    }

    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)

      if (copiedResetRef.current !== null) {
        clearTimeout(copiedResetRef.current)
      }

      // Brief confirmation label; timeout is only for UI feedback reset.
      copiedResetRef.current = setTimeout(() => {
        setCopied(false)
        copiedResetRef.current = null
      }, 1_500)
    } catch {
      setCopied(false)
    }
  }

  const handleGenerate = async () => {
    if (gridRef.current === null || prompt.trim() === "") {
      setError("The storyboard grid could not be captured.")
      return
    }

    setIsGenerating(true)
    setError(null)

    try {
      const storyboardImage = await captureNodePngDataUrl(gridRef.current)
      const characterImageRefs = await Promise.all(
        characterImageFiles
          .slice(0, MAX_SEEDANCE_CHARACTER_IMAGES)
          .map((file) => readFileAsDataUrl(file))
      )
      const { videoUrl } = await requestVideoGeneration({
        characterImageRefs,
        prompt,
        storyboardImage,
      })

      setGeneratedVideoUrl(videoUrl)
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "The video could not be generated."
      )
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)} {...props}>
      <div className="flex items-center justify-end gap-2">
        <IconButton
          disabled={prompt.trim() === ""}
          label={copied ? "Copied" : "Copy video prompt"}
          onClick={() => void handleCopy()}
          size="label"
          variant="subtle"
        >
          <SFDocumentOnDocument aria-hidden />
          {copied ? "Copied" : "Copy"}
        </IconButton>
        <IconButton
          disabled={!canGenerate}
          label={isGenerating ? "Generating video" : "Generate video"}
          onClick={() => void handleGenerate()}
          size="label"
          variant="emphasis"
        >
          {isGenerating ? "Generating…" : "Generate Video"}
        </IconButton>
      </div>
      <pre
        aria-label="Seedance video prompt"
        className="max-h-48 overflow-y-auto rounded-xl bg-surface-inset px-3 py-2.5 font-mono text-caption leading-relaxed whitespace-pre-wrap text-ink-muted"
        tabIndex={0}
      >
        {prompt.trim() === ""
          ? "Add scenes to the storyboard to build a Seedance prompt."
          : prompt}
      </pre>
      {error !== null ? (
        <p className="text-caption text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}

const VideoSection = {
  Player: VideoSectionPlayer,
  Prompt: VideoSectionPrompt,
  Root: VideoSectionRoot,
}

export { VideoSection, type VideoSectionRootProps }
