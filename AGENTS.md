# MediaSpawner — AGENTS.md

This file guides coding agents working on MediaSpawner. It complements README.md with concrete commands, conventions, and expectations that agents can execute verbatim.

## Project overview

- React 19 + TypeScript, Vite build, Tailwind CSS.
- App state persisted in browser localStorage.
- Planning docs live in `planning/`.

## Setup and common commands

- Install deps: `npm install`
- Start dev server: `npm run dev`
- Build for production: `npm run build`
- Preview production build: `npm run preview`
- Lint all files: `npm run lint`

## Project vision and scope

- Configuration-only application; no runtime media simulation or playback.
- Manual save model with explicit unsaved-changes warnings; no auto-save on edit.

## Testing instructions

- Test runner: Vitest with JSDOM environment and Testing Library.
- Global setup: `src/test-setup.ts` adds `@testing-library/jest-dom` matchers.
- Run full suite: `npm run test`
- Watch mode: `npm run test:watch`
- UI mode: `npm run test:ui`
- Coverage: `npm run test:coverage` (reports: text, html, json, lcov)
- Focus one test by name: `npm run test -- -t "<name>"`
- Run a single file: `npm run test -- src/path/to/File.test.tsx`
- Conventions:
  - One test file per source file when practical.
  - Reset mocks between tests so they do not affect each other (use `beforeEach` with `vi.resetAllMocks()` or equivalent).
  - Keep the entire suite green before merging; add/update tests for changed behavior.

## Testing expectations and assertions

- Persist only diffs for per-asset overrides (`buildOverridesDiff`).
- Dispatch global events after successful saves.
- Mode routing must honor the unsaved-changes guard.
- `resolveEffectiveProperties` never falls back to base asset values; use `sourceMap: "none"` when unset.

## Code style and quality

- TypeScript strict mode is enabled (see `tsconfig.app.json` and `tsconfig.node.json`).
- ESLint configs: JS recommended + TypeScript recommended, React Hooks plugin, React Refresh rule.
- Avoid the `any` type; prefer precise types.
- Favor readable names and guard clauses over deep nesting.
- Delete unused or replaced code; do not leave legacy code commented out.
- Write comments only to explain non-obvious "why" decisions, not "what" the code does.
- UI guidelines and tokens: see `planning/UI_STYLE_GUIDE.md`.

## React Best Practices

### Reducer Purity

- **Reducers must be pure functions**: They should only compute new state based on previous state and action, without side effects.
- **No side effects in reducers**: Never dispatch events, make API calls, or perform other side effects within reducer functions.
- **Example violation** (❌ Don't do this):

  ```typescript
  function layoutReducer(
    state: LayoutState,
    action: LayoutAction,
  ): LayoutState {
    // ... state computation ...

    // ❌ WRONG: Side effect in reducer
    if (profileId !== previousProfileId) {
      window.dispatchEvent(new CustomEvent("mediaspawner:profile-changed"));
    }

    return newState;
  }
  ```

- **Correct approach** (✅ Do this):

  ```typescript
  function layoutReducer(
    state: LayoutState,
    action: LayoutAction,
  ): LayoutState {
    // ✅ CORRECT: Pure function, only computes new state
    return {
      ...state,
      activeProfileId: profileId,
      // ... other state updates
    };
  }

  // Side effects belong in useEffect
  useEffect(() => {
    if (currentProfileId !== previousProfileId) {
      window.dispatchEvent(new CustomEvent("mediaspawner:profile-changed"));
    }
  }, [currentProfileId]);
  ```

### Side Effect Placement

- **Render phase must be pure**: No state updates, API calls, or side effects during component render.
- **Use useEffect for side effects**: All side effects should be placed in useEffect hooks, event handlers, or service methods.
- **Common side effects to avoid in render**:
  - `setState()` calls
  - `dispatch()` calls
  - `window.dispatchEvent()` calls
  - API calls
  - localStorage/sessionStorage access
  - console.log (except for debugging)

### Event Dispatching Best Practices

- **Dispatch events after operations complete**: Events should be dispatched after successful operations, not during state computation.
- **Use useEffect for reactive events**: When events need to be dispatched based on state changes, use useEffect to watch for changes.
- **Example from MediaSpawner** (✅ Good pattern):

  ```typescript
  // In SpawnService.updateSpawn - dispatch after successful save
  const result = await this.updateProfileSpawns(
    activeProfile.id,
    updatedSpawns,
  );
  if (result.success) {
    window.dispatchEvent(
      new CustomEvent("mediaspawner:spawn-updated", {
        detail: { spawnId: updatedSpawn.id },
      }),
    );
  }
  ```

### Common React Antipatterns to Avoid

1. **State updates during render**:

   ```typescript
   // ❌ WRONG
   function Component() {
     const [count, setCount] = useState(0);
     setCount(count + 1); // This will cause infinite re-renders
     return <div>{count}</div>;
   }
   ```

2. **Side effects in reducers**:

   ```typescript
   // ❌ WRONG
   function reducer(state, action) {
     localStorage.setItem("key", "value"); // Side effect in reducer
     return newState;
   }
   ```

3. **Event dispatch during render**:

   ```typescript
   // ❌ WRONG
   function Component() {
     window.dispatchEvent(new CustomEvent('my-event')); // Side effect in render
     return <div>Content</div>;
   }
   ```

### MediaSpawner-Specific Patterns

- **Event dispatching**: Follow the pattern used in `SpawnService.updateSpawn` - dispatch events after successful operations.
- **State management**: Use `useEffect` for reactive state updates, as seen in `SpawnList` and `AssetManagementPanel`.
- **Profile changes**: The `LayoutProvider` correctly uses `useEffect` to dispatch profile change events after state updates.
- **Event listening**: Components properly listen to events in `useEffect` hooks and clean up listeners on unmount.

### Error Prevention Checklist

Before implementing any React component or reducer:

- [ ] Are all state updates in useEffect, event handlers, or service methods?
- [ ] Is the reducer a pure function with no side effects?
- [ ] Are event dispatches happening after operations complete?
- [ ] Are all side effects properly contained in useEffect hooks?
- [ ] Is the render function pure with no side effects?

## Layout and modes

- Three-panel layout:
  - Left: Spawn list and navigation
  - Center: Editor (spawn settings or asset settings)
  - Right: Asset management (assets-in-spawn and library)
- `LayoutContext` keys:
  - `selectedSpawnId: string | undefined`
  - `selectedSpawnAssetId: string | undefined`
  - `centerPanelMode: 'spawn-settings' | 'asset-settings'`
  - `hasUnsavedChanges: boolean`
- Mode routing via events; switching must guard on `hasUnsavedChanges`.

## Directory structure hints

- `src/components/` UI components (some tests under `__tests__/`).
- `src/services/` app logic; `src/utils/` helpers; `src/types/` shared types.
- `planning/` contains epics/stories and project documentation.

## Core data model and inheritance

- Hierarchy: `SpawnProfile → Spawn → SpawnAsset`.
- Effective property value precedence: override; otherwise undefined.
- No base-asset fallback; do not store behavioral properties on `MediaAsset`.
- Persist per-asset overrides as diffs only.
- Spawn-level `duration` remains; assets may override via `SpawnAsset.overrides.duration`.

## Randomization buckets (spawn-level)

- `Spawn.randomizationBuckets?: RandomizationBucket[]`
  - Members reference `spawnAssetId` (not library asset id).
  - Selection: `"one" | "n"` (v1); `n` required when `selection === "n"`.
  - No weights/repeat flags in v1 UI (fields may exist but are unused).
- Invariants enforced by `validateRandomizationBuckets`:
  - Each spawn asset may belong to at most one bucket.
  - Members must exist in `spawn.assets` and be unique per bucket.
  - When `selection === "n"`, require `1 ≤ n ≤ enabledMemberCount`.
- `SpawnService.updateSpawn`:
  - Reconciles buckets with assets (removes dangling members) and validates.
  - Emits `mediaspawner:spawn-updated` after successful save.
- UI:
  - Spawn editor includes a "Randomization Buckets" section.
  - "Edit Members" modal shows [checkbox] Name + type chip + order chip; tooltip shows full path.
  - Assets already in a bucket are shown with a bucket chip in the right panel (Assets in Current Spawn).

## Services and events

- Services:
  - `SpawnService`: CRUD for spawn data; accepts `randomizationBuckets`.
  - `AssetService`: global asset library; assets are descriptive only (no behavioral `properties`).
  - `CacheService`, `ConfigurationService`, `ImportExportService`, `SettingsService`, `SpawnProfileService` exported via `src/services/index.ts`.
- Global events:
  - After saving spawn changes: `mediaspawner:spawn-updated` with `{ spawnId, updatedSpawn? }`.
  - Request mode switch: `mediaspawner:request-center-switch` with `{ mode: 'spawn-settings' | 'asset-settings', spawnAssetId? }`.
  - After asset library changes: `mediaspawner:assets-updated`.

## Shared UI patterns

- Center panel forms share a Save/Cancel action row and track dirty state via `setUnsavedChanges`.
- All fields are directly editable; no override toggles.
- No global reset of default properties; groups have no override toggles.

## Validation and UX

- Blur-based validation (examples): Volume 0–100; Dimensions > 0; Position ≥ 0; Scale ≥ 0.
- Validation occurs when fields lose focus (onBlur) and before save.
- Inline errors; Save disabled while invalid; confirm dialogs for destructive or data-loss actions.

## Utilities invariants

- `resolveEffectiveProperties({ spawn, overrides? }) -> { effective, sourceMap }` where `sourceMap` in `"override" | "none"`.
- `buildOverridesDiff(desired)` stores only keys with non-undefined values.

## Environment and tooling notes

- Vite base path auto-configures for GitHub Pages when `GITHUB_REPOSITORY` is present (see `vite.config.ts`). No manual action needed for local dev.

## CI expectations

- Pull requests run on Node 22 with `npm ci`, then `npm run lint`, `npm run build`, and `npm run test` (see `.github/workflows/pr-checks.yml`).
- Keep CI green; fix lint, type, and test failures before merging.

## Windows PowerShell note

- When running npm scripts in PowerShell, do not pipe to `cat` (e.g., avoid `npm run test | cat`). Just run the command directly: `npm run test`.

## Expectations for agents

- Use the commands above to verify changes locally. Keep tests and lint clean before finishing tasks.
- Implement only explicitly requested features or fixes; suggestions are welcome but should not be auto-implemented.
