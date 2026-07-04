# AGENTS.md

This file provides guidance to AI agents when working with code in this repository.

## Workflow Orchestration

### 1. Plan Mode Default
- Enter plan mode for ANY non-trivial task (3+ steps or architectural decisions)
- If something goes sideways, STOP and re-plan immediately - don't keep pushing
- Use plan mode for verification steps, not just building
- Write detailed specs upfront to reduce ambiguity

### 2. Subagent Strategy to keep main context window clean
- Offload research, exploration, and parallel analysis to subagents
- For complex problems, throw more compute at it via subagents
- One task per subagent for focused execution

### 3. Self-Improvement Loop
- After ANY correction from the user: update 'tasks/lessons.md' with the pattern
- Write rules for yourself that prevent the same mistake
- Ruthlessly iterate on these lessons until mistake rate drops
- Review lessons at session start for relevant project

### 4. Verification Before Done
- Never mark a task complete without proving it works
- Diff behavior between main and your changes when relevant
- Ask yourself: "Would a staff engineer approve this?"
- Run tests, check logs, demonstrate correctness

### 5. Demand Elegance (Balanced)
- For non-trivial changes: pause and ask "is there a more elegant way?"
- If a fix feels hacky: "Knowing everything I know now, implement the elegant solution"
- Skip this for simple, obvious fixes - don't over-engineer
- Challenge your own work before presenting it

### 6. Autonomous Bug Fixing
- When given a bug report: just fix it. Don't ask for hand-holding
- Point at logs, errors, failing tests -> then resolve them
- Zero context switching required from the user
- Go fix failing CI tests without being told how

## Task Management
1. **Plan First**: Write plan to 'tasks/todo.md' with checkable items
2. **Verify Plan**: Check in before starting implementation
3. **Track Progress**: Mark items complete as you go
4. **Explain Changes**: High-level summary at each step
5. **Document Results**: Add review to 'tasks/todo.md'
6. **Capture Lessons**: Update 'tasks/lessons.md' after corrections

## Core Principles
- **Simplicity First**: Make every change as simple as possible. Impact minimal code.
- **No Laziness**: Find root causes. No temporary fixes. Senior developer standards.
- **Minimal Impact**: Changes should only touch what's necessary. Avoid introducing bugs.

## Technical Requirements

- Always add `TSdocs` to your code.
- Always sort all props, fields, functions and type properties in alphabetical order.
- Always use the Compound Component Pattern while creating new components.
- Never compromise on security for the sake of speed. Always validate your solution for possible security vulnerabilities.
- Make the components accessible following the WCAG 2.1 guidelines.
- Treat UI's as a thin layer over your data. Avoid local state (e.g. `useState`) unless it is absolutely necessary and clearly separate from business logic. Use `useRef` for variables that don't need to be reactive and Jotai's `useAtom` for global state.
- When you find yourself with nested if/else statements or complex conditional rendering, create a new component. Reserve inline ternaries for tiny, readable sections.
- Choose to derive data rather than using useEffect. Only use useEffect to synchronise with an external system (e.g. document-level events). This can cause confusion over what the logic is doing. Explicitly define logic rather than depending on implicit reactive behaviour.
- Treat `setTimeout` as a last resort and always comment on why.
- Do NOT add useless comments. Avoid adding comments unless you are clarifying a race condition (e.g. setTimeout), a long-term TODO or a confusing piece of code that even a senior engineer wouldn't initially understand.
- Before hardcoding any values, consider whether they might be used elsewhere in the code. All of our code should adhere to the DRY principle.

## Code Quality Standards

### Type Safety
- Never use `as any` or `@ts-ignore` without documenting why it's necessary
- Type function parameters and return values explicitly
- Use Zod schemas for runtime validation at API boundaries

### Constants and Configuration
- Extract magic numbers to named constants
- Document each constant with TSDoc explaining its purpose and constraints
- Export constants through barrel files for clean imports
- Reference constants in Zod schemas for single source of truth

### Error Handling
- Catch errors at appropriate boundaries (API routes, tool execution, file I/O)
- Surface errors to users via structured responses or activity events
- Never use empty catch blocks — log and handle explicitly
- Throw early when critical dependencies fail (e.g., skill loading)

### Module Organization
- Keep files under 500 lines — extract helpers and utilities when growing
- Separate concerns: one responsibility per file
- Group related functionality in subdirectories
