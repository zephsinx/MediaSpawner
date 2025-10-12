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

- Blur-based validation: Volume 0–100; Dimensions > 0; Position ≥ 0; Scale ≥ 0.
- Validation triggers on field blur and before save; inline error messages shown when invalid.
- Save disabled while invalid; inline error messages; confirm dialogs on destructive actions.

## Hook patterns

- Use `useCallback` with stable dependencies to prevent unnecessary re-renders.
- Use refs to access latest state in event listeners without re-registering.
- Extract complex logic into custom hooks (e.g., `useAssetValidation`).
- Prefer functional state updates to avoid stale closures.
- Debounced inputs use refs and functional updates to avoid circular dependencies.
- Example: Event listeners that check state should use refs:

  ```tsx
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    const handler = () => {
      if (stateRef.current) {
        /* use latest value */
      }
    };
    window.addEventListener("event", handler);
    return () => window.removeEventListener("event", handler);
  }, []); // ← state not in deps
  ```

## Services and events

- Persist only diffs using `buildOverridesDiff(desired)`.
- On successful save, dispatch `mediaspawner:spawn-updated` with `{ spawnId, updatedSpawn? }`.

## Testing guidance

- Assert only diffs are persisted for overrides.
- Verify mode routing honors the unsaved-changes guard.
- Ensure global events are dispatched after save.
- No base-asset fallback: effective values come from overrides or spawn defaults; otherwise undefined.
