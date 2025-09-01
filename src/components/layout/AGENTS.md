# Layout Components — AGENTS.md

## Scope and purpose

- Three-panel application frame and cross-panel coordination.

## LayoutContext keys

- `selectedSpawnId: string | undefined`
- `selectedSpawnAssetId: string | undefined`
- `centerPanelMode: 'spawn-settings' | 'asset-settings'`
- `hasUnsavedChanges: boolean`

## Mode routing and guards

- Mode switches requested via `mediaspawner:request-center-switch`.
- Always guard on `hasUnsavedChanges`; prompt before discarding edits.

## Scrolling and sizing

- Use `min-h-0 overflow-y-auto` on scrollable panels to avoid layout overflow and preserve panel scroll behavior.

## Testing guidance

- Verify `LayoutContext` updates propagate correctly.
- Assert mode routing respects the unsaved-changes guard.
- Ensure header and panel placeholders render correct accessible names.
