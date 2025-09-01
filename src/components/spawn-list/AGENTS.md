# Spawn List — AGENTS.md

## Scope and purpose

- Left panel listing spawns, selection, and navigation into editor modes.

## Selection and routing

- Selection updates `LayoutContext.selectedSpawnId`.
- Request center mode switches via `mediaspawner:request-center-switch`.
- Respect `hasUnsavedChanges` guard before switching modes.

## Testing guidance

- Verify selection updates context and focuses the correct center mode.
- Ensure unsaved-changes prompts appear when applicable.
