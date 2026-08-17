"use client"

import { useAtomValue, useSetAtom } from "jotai"
import * as React from "react"
import { SFDocumentOnDocument } from "sf-symbols-lib/monochrome"

import { readFileAsDataUrl } from "@/components/storyboard/prompt-composer-context"
import { IconButton } from "@/components/ui/icon-button"
import { enqueueCapture } from "@/lib/capture-queue"
import { requestVideoGeneration } from "@/lib/generate-video-client"
import { type Scene, totalRuntimeSeconds } from "@/lib/storyboard"
import { cn } from "@/lib/utils"
import {
  allocateSeedanceReferenceSlots,
  resolveSeedanceDuration,
} from "@/lib/video-generation"
import { videoResolutionAtom } from "@/lib/video-resolution-settings"
import {
  completeBoardVideoGeneration,
  composerCharacterImageFilesAtom,
  composerEnvironmentImageFilesAtom,
  failBoardVideoGeneration,
  makeBoardVideoAtom,
  seedanceVideoPromptAtom,
  startBoardVideoGeneration,
  videoGenerationByBoardIdAtom,
  videoPromptSourceAtom,
} from "@/lib/video-section-atoms"

/** Props for {@link VideoSectionRoot}. */
interface VideoSectionRootProps extends React.ComponentProps<"section"> {
  /** Selected board id — scopes generation state to this storyboard. */
  boardId: string
  /**
   * Captures the scene grid as a PNG (shader-empty scenes omitted).
   * Owned by the workspace so React can filter the grid before capture.
   */
  captureGridPng: () => Promise<string>
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
 * <VideoSection.Root
 *   boardId={board.id}
 *   captureGridPng={captureGridPng}
 *   scenes={scenes}
 * >
 *   <VideoSection.Prompt />
 *   <VideoSection.Player />
 * </VideoSection.Root>
 * ```
 */
function VideoSectionRoot({
  boardId,
  captureGridPng,
  children,
  className,
  scenes,
  ...props
}: VideoSectionRootProps) {
  const characterImageFiles = useAtomValue(composerCharacterImageFilesAtom)
  const environmentImageFiles = useAtomValue(composerEnvironmentImageFilesAtom)
  const setSource = useSetAtom(videoPromptSourceAtom)

  // Sync visible scenes into the video prompt source atom.
  // NOTE: The companion sync for character/environment data lives in
  // PromptComposerRoot. Each component owns its own slice; neither should
  // overwrite the other.
  React.useEffect(() => {
    const slots = allocateSeedanceReferenceSlots(
      characterImageFiles.length,
      environmentImageFiles.length
    )

    setSource((previous) => ({
      ...previous,
      characterImageCount: slots.characterCount,
      environmentImageCount: slots.environmentCount,
      scenes,
    }))
  }, [
    characterImageFiles.length,
    environmentImageFiles.length,
    scenes,
    setSource,
  ])

  return (
    <VideoSectionContext.Provider value={{ boardId, captureGridPng }}>
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
  boardId: string
  captureGridPng: () => Promise<string>
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
  const { boardId } = useVideoSection()
  const boardVideoAtom = React.useMemo(
    () => makeBoardVideoAtom(boardId),
    [boardId]
  )
  const { isGenerating, videoUrl } = useAtomValue(boardVideoAtom)

  return (
    <div
      className={cn(
        "relative aspect-video overflow-hidden rounded-xl bg-surface-inset",
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
              ? "Generating video with Seedance 2.5…"
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
  const { boardId, captureGridPng } = useVideoSection()
  const characterImageFiles = useAtomValue(composerCharacterImageFilesAtom)
  const environmentImageFiles = useAtomValue(composerEnvironmentImageFilesAtom)
  const [copied, setCopied] = React.useState(false)
  const copiedResetRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null
  )
  /** Stable per-board derived atom — only re-renders when this board changes. */
  const boardVideoAtom = React.useMemo(
    () => makeBoardVideoAtom(boardId),
    [boardId]
  )
  const { error, isGenerating } = useAtomValue(boardVideoAtom)
  const setVideoByBoardId = useSetAtom(videoGenerationByBoardIdAtom)
  const prompt = useAtomValue(seedanceVideoPromptAtom)
  const source = useAtomValue(videoPromptSourceAtom)
  const videoResolution = useAtomValue(videoResolutionAtom)
  /** Caches data-URL conversions so the same File is never re-read twice. */
  const referenceImageCacheRef = React.useRef<WeakMap<File, string>>(
    new WeakMap()
  )

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

  const handleGenerate = () => {
    if (prompt.trim() === "") {
      setVideoByBoardId((previous) =>
        failBoardVideoGeneration(
          boardId,
          "The storyboard grid could not be captured.",
          previous
        )
      )
      return
    }

    // Capture at click time so a board switch mid-flight does not retarget
    // the request or block Generate Video on other boards.
    const generationBoardId = boardId
    const generationCapture = captureGridPng
    const generationDuration = resolveSeedanceDuration(
      totalRuntimeSeconds(source.scenes)
    )
    const generationPrompt = prompt
    const generationResolution = videoResolution
    // Same allocation the prompt's @ImageN bindings were built from, so the
    // uploaded image order always matches the text.
    const slots = allocateSeedanceReferenceSlots(
      characterImageFiles.length,
      environmentImageFiles.length
    )
    const generationCharacterFiles = characterImageFiles.slice(
      0,
      slots.characterCount
    )
    const generationEnvironmentFiles = environmentImageFiles.slice(
      0,
      slots.environmentCount
    )

    setVideoByBoardId((previous) =>
      startBoardVideoGeneration(generationBoardId, previous)
    )

    const toDataUrl = async (file: File): Promise<string> => {
      const cached = referenceImageCacheRef.current.get(file)
      if (cached !== undefined) return cached
      const dataUrl = await readFileAsDataUrl(file)
      referenceImageCacheRef.current.set(file, dataUrl)
      return dataUrl
    }

    // Detached so further boards can generate while this one is in flight.
    void (async () => {
      try {
        // Serialise DOM captures one at a time so concurrent generations do
        // not simultaneously saturate the main thread with html-to-image work.
        const storyboardImage = await enqueueCapture(() => generationCapture())
        const [characterImageRefs, environmentImageRefs] = await Promise.all([
          Promise.all(generationCharacterFiles.map(toDataUrl)),
          Promise.all(generationEnvironmentFiles.map(toDataUrl)),
        ])
        const { videoUrl } = await requestVideoGeneration({
          characterImageRefs,
          duration: generationDuration,
          environmentImageRefs,
          prompt: generationPrompt,
          resolution: generationResolution,
          storyboardImage,
        })

        React.startTransition(() => {
          setVideoByBoardId((previous) =>
            completeBoardVideoGeneration(generationBoardId, previous, videoUrl)
          )
        })
      } catch (generationError) {
        React.startTransition(() => {
          setVideoByBoardId((previous) =>
            failBoardVideoGeneration(
              generationBoardId,
              generationError instanceof Error
                ? generationError.message
                : "The video could not be generated.",
              previous
            )
          )
        })
      }
    })()
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
          onClick={handleGenerate}
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
