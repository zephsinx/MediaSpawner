# Asset Management — AGENTS.md

## Scope and purpose

- Right panel for managing assets in the current spawn and the global asset library.
- Manual save model for all asset operations (add, remove, reorder).

## Directory structure

```
asset-management/
├── AssetManagementPanel.tsx      # Orchestrator with collapsible sections (~110 lines)
├── types.ts                      # Shared types (ResolvedSpawnAsset)
├── SpawnAssetsSection/
│   ├── index.tsx                 # Section logic, state management, drag-drop (~320 lines)
│   ├── SpawnAssetItem.tsx        # Single draggable asset item (~260 lines)
│   └── PendingChangesPanel.tsx   # Diff display for pending changes (~140 lines)
├── AssetLibrarySection/
│   ├── index.tsx                 # Section logic, filtering, keyboard nav (~280 lines)
│   ├── AssetLibraryItem.tsx      # Single library asset item (~170 lines)
│   └── AddAssetControls.tsx      # Add buttons, URL form, search (~150 lines)
├── shared/
│   ├── index.ts                  # Barrel exports
│   ├── SpawnAssetsCount.tsx      # Header count for spawn assets (~60 lines)
│   ├── AssetLibraryCount.tsx     # Header count for library (~20 lines)
│   ├── ThumbnailWithPreview.tsx  # Thumbnail with hover popover (~50 lines)
│   ├── AssetTypeBadge.tsx        # Type badge component (~20 lines)
│   ├── assetTypeUtils.ts         # getAssetTypeIcon helper
│   └── AssetPopoverContent.tsx   # Shared popover content (~45 lines)
└── __tests__/                    # Test files (unchanged)
```

## Architecture

Two main sections:

- **Assets in Current Spawn** (`SpawnAssetsSection`): Draft-enabled asset list with save/cancel controls
- **Asset Library** (`AssetLibrarySection`): Global asset pool with search and add functionality

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
- Tests import `AssetManagementPanel` and test through the public API
