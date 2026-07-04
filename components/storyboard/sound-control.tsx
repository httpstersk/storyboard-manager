"use client"

import { useAtom } from "jotai"
import { SFSpeakerSlash, SFSpeakerWave1, SFSpeakerWave2 } from "sf-symbols-lib/monochrome"
import * as React from "react"

import { IconButton } from "@/components/ui/icon-button"
import { Popover } from "@/components/ui/popover"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { soundSettingsAtom } from "@/lib/sound-settings"
import { cn } from "@/lib/utils"

/** Volume at or above which the control shows the "loud" speaker icon. */
const LOUD_VOLUME_THRESHOLD = 0.5

/**
 * Toolbar control for the UI click sound: an icon trigger that opens a
 * popover with a mute toggle and a volume slider. State lives in
 * {@link soundSettingsAtom}, so the control is a thin layer over that data.
 */
function SoundControl() {
  const [settings, setSettings] = useAtom(soundSettingsAtom)
  const labelId = React.useId()
  const { enabled, volume } = settings

  const muted = !enabled || volume === 0
  const Icon = muted ? SFSpeakerSlash : volume < LOUD_VOLUME_THRESHOLD ? SFSpeakerWave1 : SFSpeakerWave2

  return (
    <Popover>
      <Popover.Trigger asChild>
        <IconButton label={enabled ? "Sound settings" : "Sound settings, muted"}>
          <Icon aria-hidden />
        </IconButton>
      </Popover.Trigger>
      <Popover.Content className="w-48">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4">
            <span className="text-caption text-ink-muted" id={labelId}>
              Sound
            </span>
            <Switch
              aria-labelledby={labelId}
              checked={enabled}
              onCheckedChange={(next) =>
                setSettings((prev) => ({ ...prev, enabled: next }))
              }
            />
          </div>
          <div className="flex items-center gap-2.5">
            <Slider
              className={cn(
                "grow",
                !enabled && "pointer-events-none opacity-40"
              )}
              disabled={!enabled}
              label="Volume"
              max={1}
              min={0}
              onValueChange={([next]) =>
                setSettings((prev) => ({ ...prev, volume: next }))
              }
              step={0.05}
              value={[volume]}
            />
            <span className="w-7 text-right text-caption tabular-nums text-ink-muted">
              {Math.round(volume * 100)}
            </span>
          </div>
        </div>
      </Popover.Content>
    </Popover>
  )
}

export { SoundControl }
