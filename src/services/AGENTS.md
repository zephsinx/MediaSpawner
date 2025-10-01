# Services — AGENTS.md

## Scope and purpose

- Business logic and persistence boundaries for profiles, spawns, and assets.

## Contracts

- `SpawnService`: CRUD for spawn data; accepts per-asset overrides as diffs.
- `AssetService`: global asset library; assets are descriptive only (no behavioral `properties`).
- `CacheService`, `ConfigurationService`, `ImportExportService`, `SettingsService`, `SpawnProfileService` — exported via `src/services/index.ts`.

## Invariants

- Persist only diffs for per-asset overrides; never copy spawn defaults into overrides.
- Do not add behavioral properties to `MediaAsset`.

## Events

- After saving spawn changes: dispatch `mediaspawner:spawn-updated` with `{ spawnId, updatedSpawn? }`.
- Asset library changes may dispatch `mediaspawner:assets-updated` as applicable.

## Testing guidance

- Mock service boundaries in component tests.
- Assert success flags and optional error messages on service responses.
- Verify diffs-only persistence and expected global events.
