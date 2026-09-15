/**
 * Shorthand ambient declarations for the untyped `@magic-spells/*` packages.
 *
 * Kept in their own global script file (no top-level import/export) rather
 * than folded into `magic-spells.d.ts`: shorthand module declarations only
 * take effect over TypeScript's real node_modules resolution when the file
 * containing them has no imports or exports of its own -- inside a module
 * file they're silently ignored and the untyped `.js` file still resolves,
 * so the dynamic `import()` calls in `prompt-composer.tsx` would otherwise
 * fail with "implicitly has an 'any' type" (TS7016).
 */
declare module "@magic-spells/bottom-sheet"
declare module "@magic-spells/dialog-panel"
