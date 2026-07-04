/**
 * Procedural UI click sound synthesised with the Web Audio API.
 *
 * A single shared {@link AudioContext} and a preallocated noise buffer are
 * reused across plays; each click layers two short band-passed noise
 * "grains" so it reads as a soft, mechanical tick rather than a tone.
 * Playback is a no-op during SSR, when the user prefers reduced motion, and
 * when the requested volume is not positive.
 */

/**
 * Peak master gain for a click at full user volume. Deliberately low so the
 * tick stays unobtrusive even at volume 1.
 */
const MASTER_GAIN = 0.09

/**
 * Length of the reusable white-noise buffer, in seconds. Must be at least as
 * long as the longest grain in {@link CLICK_GRAINS}.
 */
const NOISE_BUFFER_SECONDS = 0.04

/**
 * Fraction by which each grain's centre frequency and gain are randomly
 * varied per play, so repeated clicks sound organic rather than identical.
 */
const JITTER = 0.06

/** Duration of the short linear attack opening each grain, in seconds. */
const ATTACK_SECONDS = 0.0005

/** One band-passed noise layer of the composite click. */
interface ClickGrain {
  /** Seconds the grain takes to decay to near-silence. */
  duration: number
  /** Bandpass centre frequency, in hertz. */
  frequency: number
  /** Peak gain of this grain relative to {@link MASTER_GAIN} (0–1). */
  gain: number
  /** Bandpass resonance; higher is more focused and mechanical. */
  q: number
  /** Delay before the grain starts, in seconds, relative to the trigger. */
  startOffset: number
}

/**
 * The two grains that make up the "clickity" tick: a bright, brief contact
 * transient followed a few milliseconds later by a softer, lower body.
 */
const CLICK_GRAINS: readonly ClickGrain[] = [
  { duration: 0.006, frequency: 3400, gain: 1, q: 3, startOffset: 0 },
  { duration: 0.016, frequency: 2200, gain: 0.7, q: 2.5, startOffset: 0.003 },
]

let audioContext: AudioContext | null = null
let noiseBuffer: AudioBuffer | null = null

/**
 * Returns the shared {@link AudioContext}, creating it lazily on first use,
 * or null when the Web Audio API is unavailable (including during SSR).
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null
  }

  if (audioContext === null) {
    // Safari < 14.1 only exposes the prefixed constructor; narrow via an
    // explicit cast rather than `any` so the fallback stays typed.
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext

    if (AudioContextCtor === undefined) {
      return null
    }

    audioContext = new AudioContextCtor()
  }

  return audioContext
}

/** Returns the shared white-noise buffer, creating it lazily on first use. */
function getNoiseBuffer(context: AudioContext): AudioBuffer {
  if (noiseBuffer === null) {
    const length = Math.floor(context.sampleRate * NOISE_BUFFER_SECONDS)
    noiseBuffer = context.createBuffer(1, length, context.sampleRate)
    const channel = noiseBuffer.getChannelData(0)

    for (let index = 0; index < length; index++) {
      channel[index] = Math.random() * 2 - 1
    }
  }

  return noiseBuffer
}

/** Returns a small signed multiplier within ±{@link JITTER}. */
function randomJitter(): number {
  return (Math.random() * 2 - 1) * JITTER
}

/**
 * Schedules a single {@link ClickGrain} as noise → bandpass → gain →
 * destination, and disconnects its nodes once playback ends.
 */
function playGrain(
  context: AudioContext,
  buffer: AudioBuffer,
  grain: ClickGrain,
  volume: number,
  triggerTime: number
): void {
  const source = context.createBufferSource()
  source.buffer = buffer

  const filter = context.createBiquadFilter()
  filter.type = "bandpass"
  filter.frequency.value = grain.frequency * (1 + randomJitter())
  filter.Q.value = grain.q

  const gain = context.createGain()
  const start = triggerTime + grain.startOffset
  const end = start + grain.duration
  const peak = MASTER_GAIN * volume * grain.gain * (1 + randomJitter())

  // Exponential ramps can neither start from nor reach 0, so open on a tiny
  // value, take a short linear attack to the peak, then decay exponentially.
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), start + ATTACK_SECONDS)
  gain.gain.exponentialRampToValueAtTime(0.001, end)

  source.connect(filter).connect(gain).connect(context.destination)

  source.start(start)
  source.stop(end)
  source.onended = () => {
    source.disconnect()
    filter.disconnect()
    gain.disconnect()
  }
}

/** Options accepted by {@link playClickSound}. */
interface PlayClickSoundOptions {
  /** User volume in the range 0–1; non-positive values are silent. */
  volume: number
}

/**
 * Plays one composite click. No-op during SSR, when the user prefers
 * reduced motion, or when `volume` is not a positive, finite number.
 */
export function playClickSound({ volume }: PlayClickSoundOptions): void {
  if (typeof window === "undefined" || !Number.isFinite(volume) || volume <= 0) {
    return
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return
  }

  const context = getAudioContext()

  if (context === null) {
    return
  }

  // Browsers start the context suspended until a user gesture; resume it so
  // the first click after load is audible.
  if (context.state === "suspended") {
    void context.resume()
  }

  const buffer = getNoiseBuffer(context)
  const clampedVolume = Math.min(1, volume)
  const triggerTime = context.currentTime

  for (const grain of CLICK_GRAINS) {
    playGrain(context, buffer, grain, clampedVolume, triggerTime)
  }
}

export type { PlayClickSoundOptions }
