# Configuration Components — AGENTS.md

## Scope and purpose

- Center panel editors for spawn settings and asset settings.
- Manual save model with explicit unsaved-changes guard.

## Modes and routing

- Modes: `spawn-settings` | `asset-settings` (via `LayoutContext.centerPanelMode`).
- Request a mode switch with `mediaspawner:request-center-switch` and payload `{ mode, spawnAssetId? }`.
- Guard mode changes on `hasUnsavedChanges`; prompt before discarding edits.

## Override patterns

- Per-field override toggles gate editability; when off, show read-only inherited value.
- Global Reset clears all overrides and restores current spawn defaults.
- Dimensions and Position use a single group toggle each controlling both fields.

## Validation and UX

- Live validation examples: Volume 0–100; Dimensions > 0; Position ≥ 0; Scale ≥ 0.
- Save disabled while invalid; inline error messages; confirm dialogs on destructive actions.

## Services and events

- Persist only diffs using `buildOverridesDiff(desired)`.
- On successful save, dispatch `mediaspawner:spawn-updated` with `{ spawnId, updatedSpawn? }`.

## Testing guidance

- Assert only diffs are persisted for overrides.
- Verify mode routing honors the unsaved-changes guard.
- Ensure global events are dispatched after save.
- No base-asset fallback: effective values come from overrides or spawn defaults; otherwise undefined.
