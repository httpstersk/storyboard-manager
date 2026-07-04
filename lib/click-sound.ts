/**
 * Procedural UI click sound synthesised with the Web Audio API.
 *
 * Inspired by the tactile, physical click sounds of Teenage Engineering
 * hardware (OP-1, OP-Z, Pocket Operators). The composite sound layers three
 * elements to mimic a well-made physical button:
 *
 *  1. **Contact spark** — a very brief high-frequency noise burst representing
 *     the instant the finger makes contact with the button surface.
 *  2. **Mechanical body** — a warmer, low-mid noise grain giving the click
 *     its weight and presence, like chassis compression under the keypress.
 *  3. **Spring thump** — a short tonal oscillator whose pitch sweeps sharply
 *     downward, evoking the physical spring tension releasing inside the
 *     button mechanism. This is what separates a premium click from a
 *     digital one.
 *
 * A single shared {@link AudioContext} and a preallocated noise buffer are
 * reused across plays. Playback is a no-op during SSR, when the user prefers
 * reduced motion, and when the requested volume is not positive.
 */

/**
 * Peak master gain for the noise grain layers at full user volume. Kept low
 * so the click stays unobtrusive — present enough to feel, not enough to notice.
 */
const MASTER_GAIN = 0.09

/**
 * Length of the reusable white-noise buffer, in seconds. Must be at least as
 * long as the longest noise grain in {@link NOISE_GRAINS}.
 */
const NOISE_BUFFER_SECONDS = 0.05

/**
 * Fraction by which each grain's centre frequency and peak gain are randomly
 * varied per play, giving repeated clicks an organic, non-identical feel.
 */
const JITTER = 0.05

/** Duration of the ultra-short attack that opens each noise grain, in seconds. */
const ATTACK_SECONDS = 0.0003

// ---------------------------------------------------------------------------
// Noise grain layer
// ---------------------------------------------------------------------------

/** One band-passed noise layer of the composite click. */
interface NoiseGrain {
  /** Seconds the grain takes to decay to near-silence. */
  duration: number
  /** Bandpass centre frequency, in hertz. */
  frequency: number
  /** Peak gain of this grain relative to {@link MASTER_GAIN} (0–1). */
  gain: number
  /** Bandpass resonance; higher is more focused. 2–5 is natural for clicks. */
  q: number
  /** Delay before the grain starts, in seconds, relative to the trigger. */
  startOffset: number
}

/**
 * Two noise grains forming the physical character of the click:
 *
 * - **Contact spark** (layer 1): High frequency (5.8 kHz), very short (4 ms)
 *   — a whisper of surface contact, barely-there transient.
 * - **Mechanical body** (layer 2): Low-mid frequency (800 Hz), short decay
 *   (14 ms) — a soft, muted body with minimal presence.
 */
const NOISE_GRAINS: readonly NoiseGrain[] = [
  { duration: 0.004, frequency: 5800, gain: 0.6, q: 3.5, startOffset: 0 },
  { duration: 0.014, frequency: 800, gain: 0.45, q: 1.8, startOffset: 0.002 },
]

// ---------------------------------------------------------------------------
// Tonal oscillator layer (spring thump)
// ---------------------------------------------------------------------------

/**
 * Parameters for the short tonal oscillator that gives the click its
 * physical "spring release" character — the element that makes TE hardware
 * clicks feel tactile rather than synthetic.
 */
interface SpringThump {
  /** Total duration of the oscillator, in seconds. */
  duration: number
  /** Peak gain of this layer relative to {@link MASTER_GAIN}. */
  gain: number
  /** Ending pitch of the downward frequency sweep, in hertz. */
  pitchEnd: number
  /** Starting pitch of the downward frequency sweep, in hertz. */
  pitchStart: number
  /** Delay before the thump starts, in seconds, relative to the trigger. */
  startOffset: number
}

/**
 * A short sine oscillator sweeping from ~90 Hz to ~50 Hz over 20 ms.
 * Kept quiet so it registers as felt texture rather than a heard tone.
 */
const SPRING_THUMP: SpringThump = {
  duration: 0.020,
  gain: 0.25,
  pitchEnd: 50,
  pitchStart: 90,
  startOffset: 0.001,
}

// ---------------------------------------------------------------------------
// AudioContext and noise buffer singletons
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Grain schedulers
// ---------------------------------------------------------------------------

/**
 * Schedules a single {@link NoiseGrain} as:
 *   noise buffer → bandpass filter → gain → destination
 *
 * Nodes are disconnected once playback ends to avoid memory leaks.
 */
function scheduleNoiseGrain(
  context: AudioContext,
  buffer: AudioBuffer,
  grain: NoiseGrain,
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

  // Exponential ramps cannot start from or reach 0 — open on a tiny seed
  // value, take a very brief linear attack to the peak, then decay naturally.
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

/**
 * Schedules the tonal spring-thump oscillator:
 *   oscillator → gain → destination
 *
 * The pitch sweeps exponentially downward over the duration so the thump
 * sounds like a spring snapping to rest rather than a static tone. The gain
 * envelope mirrors the noise grains: fast attack, exponential decay.
 */
function scheduleSpringThump(
  context: AudioContext,
  thump: SpringThump,
  volume: number,
  triggerTime: number
): void {
  const oscillator = context.createOscillator()
  oscillator.type = "sine"

  const start = triggerTime + thump.startOffset
  const end = start + thump.duration
  const peak = MASTER_GAIN * volume * thump.gain * (1 + randomJitter())

  // Pitch sweep: rapid downward exponential glide mimics spring-mass resonance.
  oscillator.frequency.setValueAtTime(thump.pitchStart, start)
  oscillator.frequency.exponentialRampToValueAtTime(thump.pitchEnd, end)

  const gain = context.createGain()
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.linearRampToValueAtTime(Math.max(peak, 0.0002), start + ATTACK_SECONDS)
  gain.gain.exponentialRampToValueAtTime(0.001, end)

  oscillator.connect(gain).connect(context.destination)

  oscillator.start(start)
  oscillator.stop(end)
  oscillator.onended = () => {
    oscillator.disconnect()
    gain.disconnect()
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/** Options accepted by {@link playClickSound}. */
interface PlayClickSoundOptions {
  /** User volume in the range 0–1; non-positive values are silent. */
  volume: number
}

/**
 * Plays one composite click. No-op during SSR, when the user prefers
 * reduced motion, or when `volume` is not a positive, finite number.
 *
 * The click layers three elements simultaneously:
 *  - A soft 5.8 kHz contact spark (noise grain, 4 ms)
 *  - A muted 800 Hz mechanical body (noise grain, 14 ms)
 *  - A quiet spring-thump oscillator sweeping 90→50 Hz (20 ms)
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

  for (const grain of NOISE_GRAINS) {
    scheduleNoiseGrain(context, buffer, grain, clampedVolume, triggerTime)
  }

  scheduleSpringThump(context, SPRING_THUMP, clampedVolume, triggerTime)
}

export type { PlayClickSoundOptions }
