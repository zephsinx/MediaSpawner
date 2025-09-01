# Utilities — AGENTS.md

## Scope and purpose

- Cross-cutting helpers for property resolution, validation, display, and scheduling.

## Contracts and invariants

- `assetSettingsResolver.resolveEffectiveProperties({ spawn, overrides? }) -> { effective, sourceMap }`
  - `sourceMap` values: `"override" | "spawn-default" | "none"`.
  - No base-asset fallback.
- `buildOverridesDiff(effective, spawnDefaults, desired)` stores only keys that differ from spawn defaults.
- Validators: keep numeric ranges and non-negativity constraints consistent with UI (e.g., volume 0–100).

## Testing guidance

- Verify no base-asset fallback and correct `sourceMap` labeling.
- Ensure diffs-only persistence from `buildOverridesDiff`.
- Keep utility tests focused, colocated under `__tests__`, and reset mocks between tests.
