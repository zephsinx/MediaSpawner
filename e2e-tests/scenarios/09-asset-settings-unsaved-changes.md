# Scenario 09: Asset Settings Unsaved Changes Guard

## Objective

Test the improved unsaved changes behavior specifically for asset settings, including switching between different asset configurations and verifying the consolidated modal logic.

## Prerequisites

- Application running at `http://localhost:4173`
- At least one profile exists and is active
- Spawn "Test Spawn Alpha" exists with 2+ assets assigned (from Scenario 04)
- User at main application page with spawn selected

## Steps

### 1. Navigate and Select Spawn

**Action**:

1. `navigate_page(url: "http://localhost:4173")`
2. `wait_for(text: "Spawns", timeout: 3000)`
3. Take snapshot
4. Click spawn "Test Spawn Alpha" with assets

**Expected**:

- Spawn selected (highlighted in left panel)
- Center panel shows spawn editor form
- Assets visible in right panel "Assets in Current Spawn" section

### 2. Open First Asset Settings

**Action**:

1. Take snapshot of right panel
2. Find "Configure" button on first asset (e.g., "Test Image Asset")
3. `click(uid: "[configure-image-button-uid]")`

**Expected**:

- Center panel switches to asset settings mode
- Asset settings form loads for "Test Image Asset"
- Form shows asset properties (dimensions, position, etc.)
- "Close asset settings" button visible

### 3. Make Asset Changes

**Action**:

1. Locate width input field in dimensions section
2. `fill(uid: "[width-input-uid]", value: "300")`
3. Locate height input field
4. `fill(uid: "[height-input-uid]", value: "200")`

**Expected**:

- Fields accept input
- Unsaved changes indicator appears
- Save button becomes enabled
- Changes marked as unsaved

### 4. Verify Unsaved Changes State

**Action**: Take snapshot showing unsaved changes

**Expected**:

- Modified fields show changed values
- Visual indicator of unsaved changes
- Application aware changes are pending
- Change type tracked as "asset"

### 5. Attempt to Switch to Different Asset

**Action**:

1. Take snapshot of right panel
2. Find "Configure" button on second asset (e.g., "Test Video Asset")
3. `click(uid: "[configure-video-button-uid]")`

**Expected**:

- Confirmation dialog appears immediately
- Dialog title: "Unsaved Asset Settings"
- Dialog message: "Switching will discard property changes. Continue?"
- Two options:
  - "Stay" - cancel the switch
  - "Switch" - proceed with switch

### 6. Cancel Asset Switch

**Action**:

1. Take snapshot of confirmation dialog
2. Find "Stay" button
3. `click(uid: "[stay-button-uid]")`

**Expected**:

- Dialog closes
- Asset switch cancelled
- Remains on first asset settings
- Unsaved changes still present
- Modified field values unchanged

### 7. Verify Cancellation Worked

**Action**: Check asset settings still show edited values

**Expected**:

- Still on "Test Image Asset" settings
- Width field still shows "300"
- Height field still shows "200"
- Unsaved changes indicator still present

### 8. Attempt Switch Again and Discard

**Action**:

1. Click "Configure" on second asset again
2. Wait for confirmation dialog
3. Click "Switch" button
4. `click(uid: "[switch-button-uid]")`

**Expected**:

- Dialog appears again with "Unsaved Asset Settings" title
- After clicking switch:
  - Dialog closes
  - Center panel switches to second asset settings
  - Changes to first asset discarded (not saved)

### 9. Verify Second Asset Settings Loaded

**Action**:

1. `wait_for(text: "Test Video Asset", timeout: 2000)`
2. Take snapshot

**Expected**:

- Asset settings form shows "Test Video Asset" properties
- Form fields show default/current values for video asset
- No unsaved changes indicator
- Clean state for second asset

### 10. Return to First Asset and Verify Changes Were Discarded

**Action**:

1. Click "Configure" on first asset again
2. Check width and height field values

**Expected**:

- Width field shows original value (not "300")
- Height field shows original value (not "200")
- Changes from step 3 were not saved
- Discard operation worked correctly

### 11. Test Mixed Unsaved Changes Scenario

**Action**:

1. Make changes to asset settings (e.g., change volume to 75%)
2. Go back to spawn settings (click "Close asset settings")
3. Make changes to spawn settings (e.g., change spawn name)
4. Try to open asset settings again

**Expected**:

- Only one confirmation dialog appears
- Dialog title reflects the current change type
- No duplicate modals
- Consolidated modal logic working correctly

### 12. Test Asset Settings with Spawn Changes

**Action**:

1. Open asset settings for any asset
2. Make changes to asset properties
3. Go back to spawn settings
4. Add a new asset to the spawn (creates spawn-level changes)
5. Try to open asset settings for different asset

**Expected**:

- Confirmation dialog appears
- Dialog title: "Unsaved Spawn Changes" (spawn changes take precedence)
- Single modal, no duplicates
- Proper change type prioritization

### 13. Test Rapid Asset Switching

**Action**:

1. Open asset settings for first asset
2. Make small change
3. Switch to second asset (confirm discard)
4. Make small change
5. Switch to third asset (confirm discard)

**Expected**:

- All switches complete successfully
- No errors or race conditions
- Each asset loads its correct settings
- UI remains responsive
- Change tracking works correctly for each switch

### 14. Test Asset Settings from Different Spawns

**Action**:

1. Switch to different spawn (e.g., "Test Spawn Beta")
2. Open asset settings for an asset in that spawn
3. Make changes
4. Switch back to "Test Spawn Alpha"
5. Try to open asset settings

**Expected**:

- Profile switching works correctly
- Asset settings isolated per spawn
- Unsaved changes guard works across spawn switches
- No data bleed between spawns

### 15. Take Final Screenshot

**Action**: `take_screenshot(filePath: "e2e-tests/screenshots/09-asset-settings-unsaved-changes-complete.png", fullPage: true)`

**Expected**:

- Screenshot shows asset settings with proper unsaved changes handling
- UI demonstrates consolidated modal behavior

## Success Criteria

- [ ] Can open asset settings for different assets
- [ ] Unsaved asset changes trigger appropriate confirmation dialog
- [ ] Dialog shows "Unsaved Asset Settings" title
- [ ] Can cancel asset switch and retain unsaved changes
- [ ] Can discard changes and proceed with switch
- [ ] Discarded changes are not saved to asset
- [ ] Only one modal appears (no duplicates)
- [ ] Mixed unsaved changes handled correctly
- [ ] Change type tracking works properly
- [ ] Rapid switching works without errors
- [ ] No console errors during operations
- [ ] Asset settings isolated per spawn

## Performance Target

- Asset settings switch: < 150ms
- Unsaved changes dialog appearance: < 50ms (immediate)
- Asset settings load: < 100ms
- Mixed changes handling: < 200ms

## Data State After Test

After this scenario:

- Asset settings changes were discarded (not saved)
- All assets maintain their original property values
- Spawn configurations unchanged
- Unsaved changes guard working correctly

## Common Issues

- **No confirmation dialog**: Check that actual changes were made to asset properties
- **Changes saved despite discarding**: Check unsaved changes detection logic in AssetSettingsForm
- **Wrong dialog title**: Ensure change type is correctly tracked ("asset" vs "spawn")
- **Multiple modals appear**: This should be fixed with consolidated modal logic
- **Asset settings not loading**: Check spawn has assets assigned, verify asset IDs
- **Slow asset switching**: Large property sets may take longer to load
- **Change type not updating**: Verify setUnsavedChanges calls include correct changeType parameter

## Notes

- This scenario specifically tests the improved unsaved changes behavior
- Asset settings changes are tracked separately from spawn changes
- Modal titles now reflect the specific type of unsaved changes
- Consolidated modal logic prevents duplicate confirmation dialogs
- Change type tracking ensures appropriate messaging
- Asset settings are isolated per spawn (no cross-spawn data bleed)
- The guard works for both asset-to-asset switching and spawn-to-asset switching
