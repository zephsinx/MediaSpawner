# Asset Management — AGENTS.md

## Scope and purpose

- Right panel for managing assets in the current spawn and the global asset library.
- Manual save model for all asset operations (add, remove, reorder).

## Architecture

Two main sections:

- **Assets in Current Spawn**: Draft-enabled asset list with save/cancel controls
- **Asset Library**: Global asset pool with search and add functionality

## Draft state pattern

Asset operations (add, remove, reorder) create draft changes that require explicit save:

- `draftAssets: SpawnAsset[] | null` — null means no changes, array means pending changes
- Visual indicator shows unsaved changes (count/type)
- Save/Cancel buttons appear when draft exists
- `hasAssetChanges` derived from comparing draft vs saved state
- Updates `LayoutContext.hasUnsavedChanges` to block navigation

## Event-based communication

**Dispatched events:**

- `mediaspawner:request-add-asset-to-spawn` — Request to add asset to spawn (with `{ assetId, assetName }`)

**Listened events:**

- `mediaspawner:spawn-updated` — Reload spawn after external updates
- `mediaspawner:profile-changed` — Reset state on profile switch
- `mediaspawner:request-add-asset-to-spawn` — Handle add requests from library section

## Asset operations

- **Add**: Dispatched via event, handled in SpawnAssetsSection, creates draft
- **Remove**: Updates draft state, shows confirm dialog, requires save
- **Reorder**: Drag-and-drop updates draft state immediately, requires save
- **Save**: Calls `SpawnService.updateSpawn` with draft assets, clears draft on success
- **Cancel**: Discards draft, reverts to saved spawn.assets

## UI patterns

- Save/Cancel buttons only visible when `hasAssetChanges === true`
- Status text shows what changed ("+2 assets", "3 assets removed", "Assets reordered")
- Toast notifications for add operations indicate "(unsaved)" state
- Drag-and-drop continues to work smoothly (updates draft, not saved state)

## Integration with spawn editor

- Asset changes set `hasUnsavedChanges` context flag
- Mode switches blocked when asset changes pending
- Compatible with spawn settings also having unsaved changes (both block navigation)

## Testing guidance

- Mock `SpawnService.updateSpawn` for save operations
- Verify draft state creation on add/remove/reorder
- Assert Save button persists draft, Cancel reverts draft
- Ensure `hasUnsavedChanges` set correctly
- Test navigation blocking with unsaved asset changes
- Verify event-based add communication works
