# 001 — Animate composer border-radius as the final step

- **Status**: DONE
- **Commit**: a0a7a47
- **Severity**: MEDIUM
- **Category**: Performance & Easing / Interruptibility
- **Estimated scope**: 2 files, small (one new token, one prop change)

## Problem

`components/storyboard/prompt-composer.tsx` (`PromptComposerRoot`) drove both
`height` and `borderRadius` off a single shared spring, so the corner morph
ran in lockstep with the whole 350ms height animation instead of landing as
a distinct final beat:

```tsx
// components/storyboard/prompt-composer.tsx:462-479 — original
<m.div
  animate={{
    borderRadius:
      isImageEdit || isCompact
        ? COMPOSER_RADIUS_PILL
        : COMPOSER_RADIUS_EXPANDED,
    height: isImageEdit ? "auto" : (measuredHeight ?? "auto"),
  }}
  ...
  transition={SPRING_LAYOUT}
  {...props}
>
```

`SPRING_LAYOUT` is `{ bounce: 0.1, duration: 0.35, type: "spring" }`
(`lib/motion.ts`). On collapse from the fully expanded state (20px corners),
the radius swept toward the 999px pill while the box was still tall, so the
viewer saw the corners morphing mid-flight on a still-large block — read as
"strange".

## Revision history

**v1 (rejected by feel-check):** gave `borderRadius` a `delay: 0.22` +
`duration: 0.18` tween (`TRANSITION_RADIUS_STEP`), so it sat frozen for 220ms
then snapped through its own short tween. This technically made the radius
"the final step," but the hard freeze-then-motion boundary — no radius
movement at all, then a sudden, independently-timed tween starting — read as
a discontinuous, two-stage, **robotic/clunky** morph rather than one fluid
gesture. Delaying *any* transition (spring or tween) produces this same
dead-zone-then-snap shape, so the fix couldn't be "tune the delay/easing" —
the delay itself was the defect.

**v2 (current):** removed the delay entirely. `borderRadius` now starts at
the exact same instant as `height`, using a spring from the same family
(shares `SPRING_LAYOUT`'s `bounce: 0.1`) so both properties read as one
physical system — but with a longer `duration` (0.5s vs. 0.35s), so the
corners are still gently finishing their round-out for ~150ms after the box
has stopped resizing. There is never a moment of zero radius motion; the
"final step" quality comes from radius simply *finishing later*, not from
being held still and then triggered.

## Target (current)

```tsx
// components/storyboard/prompt-composer.tsx — current
transition={{ ...SPRING_LAYOUT, borderRadius: SPRING_RADIUS_TRAIL }}
```

```ts
// lib/motion.ts — current
/**
 * Same-family spring as `SPRING_LAYOUT` for the composer shell's corner
 * radius, sharing its bounce so both properties read as one physical system.
 * Starts at the same instant as `SPRING_LAYOUT` (no delay -- a delayed start
 * reads as a frozen-then-snapped, robotic beat) but runs longer, so the
 * corners are still gently rounding out for a moment after the box's size
 * has settled, landing as a continuous final flourish.
 */
const SPRING_RADIUS_TRAIL = { bounce: 0.1, duration: 0.5, type: "spring" } as const
```

Values: `bounce: 0.1` (identical to `SPRING_LAYOUT`, so the two properties
share one physical character instead of a spring mixed with an unrelated
tween curve), `duration: 0.5` (within the 200–500ms modal/drawer-scale
budget; ~150ms longer than `SPRING_LAYOUT`'s 0.35s so radius visibly
outlasts the height change), no `delay` (concurrent start — this is the
change from v1 that fixes the robotic feel).

## Repo conventions to follow

- Motion transition tokens live in `lib/motion.ts`, exported alphabetically
  through a single `export { ... }` block — `SPRING_RADIUS_TRAIL` sits
  alphabetically between `SPRING_LAYOUT` and `SPRING_SNAPPY`.
- Existing exemplar: `SPRING_LAYOUT` / `SPRING_SNAPPY` in the same file
  follow the `{ bounce, duration, type: "spring" }` shape reused here.
- Per-value transition overrides are Motion's native mechanism for
  sequencing (`transition={{ ...base, <key>: <override> }}`) — no custom
  sequencing logic needed.

## Steps

1. `lib/motion.ts`: add the `SPRING_RADIUS_TRAIL` token (shown above) after
   `SPRING_LAYOUT`, and add it to the `export { ... }` block in alphabetical
   position.
2. `components/storyboard/prompt-composer.tsx`: add `SPRING_RADIUS_TRAIL` to
   the existing `@/lib/motion` import, and set
   `transition={{ ...SPRING_LAYOUT, borderRadius: SPRING_RADIUS_TRAIL }}` on
   the shell `m.div`.

## Boundaries

- Do NOT touch markup, class names, `COMPOSER_RADIUS_EXPANDED` /
  `COMPOSER_RADIUS_PILL`, or the `SPRING_LAYOUT` values themselves.
- Do NOT change any other component.
- Do NOT add new dependencies.
- Do NOT reintroduce a `delay` on `borderRadius` — see "Revision history"
  above for why that shape reads as robotic regardless of its duration/ease.
- If the shell `m.div`'s `animate`/`transition` props have drifted from the
  snippet above since commit `a0a7a47`, stop and report instead of
  improvising.

## Verification

- **Mechanical**: `bun run typecheck` and `bun run lint` — both clean.
- **Feel check**: run `bun run dev`, focus the composer to expand it, then
  blur it to collapse, and confirm:
  - The corners are visibly moving (never frozen) for the entire transition
    — no dead zone followed by a sudden snap.
  - The box's size settles first; the corners continue rounding out for a
    brief, smooth beat afterward, reading as a single continuous gesture
    with a "final flourish," not two separate animations.
  - Spamming focus/blur never leaves the radius stuck mid-morph or jumps it
    to a jarring value (springs retarget smoothly from their current value
    and velocity when interrupted).
  - In DevTools Animations panel at 10% playback speed, confirm radius moves
    continuously from t=0 with no flat segment, and keeps easing after the
    height track has visually stopped.
  - In the Performance panel, record the toggle and confirm frames hold
    steady with no dropped frames (rAF-driven, so it tracks the display's
    native refresh rate — 120fps on a 120Hz display).
  - Toggle `prefers-reduced-motion` (Rendering panel): the composer already
    has `motion-reduce:transition-none` on the box-shadow only; Motion's
    `animate`/`transition` props are unaffected by that Tailwind utility, so
    no reduced-motion regression is introduced by this change (out of scope
    to add one here, since none existed for this animation before).
