# Scenario 04: Asset Assignment to Spawns

## Objective

Verify the workflow for assigning assets from the library to spawns and viewing assets within a spawn.

## Prerequisites

- Application running at `http://localhost:4173`
- At least one profile exists and is active
- At least one spawn exists (created in Scenario 03)
- At least three assets exist in library (created in Scenario 02)
- User at main application page with spawn selected

## Steps

### 1. Navigate and Select Spawn

**Action**:

1. `navigate_page(url: "http://localhost:4173")`
2. `wait_for(text: "Spawns", timeout: 3000)`
3. Take snapshot
4. Click spawn "Test Spawn Alpha" (or any existing spawn)

**Expected**:

- Spawn selected in left panel (highlighted)
- Center panel shows spawn editor form with spawn details
- Right panel shows asset management sections

### 2. Verify Right Panel Structure

**Action**:

1. Take snapshot of right panel
2. Look for two main sections

**Expected**:

- Top section: "Assets in Current Spawn" or similar
- Bottom section: "Asset Library" or "Available Assets"
- Both sections visible and separated

### 3. Check Initial Spawn Assets State

**Action**: Review "Assets in Current Spawn" section

**Expected**:

- Section shows "0 assets" or "No assets added"
- Empty state message or instructions
- Section prepared to display asset chips/cards

### 4. View Asset Library Section

**Action**: Scroll to "Asset Library" section in right panel

**Expected**:

- Section shows available assets from library
- Asset cards/items from Scenario 02 visible:
  - "Test Image Asset"
  - "Test Video Asset"
  - "Test Audio Asset"
- Each asset has "Add to Spawn" or "+" button

### 5. Add First Asset to Spawn

**Action**:

1. Take snapshot to get asset card UIDs
2. Find "Test Image Asset" card
3. Find and click "Add to Spawn" or "+" button
4. `click(uid: "[add-image-asset-button-uid]")`

**Expected**:

- Asset added immediately
- Success indicator (toast or visual feedback)
- Asset appears in "Assets in Current Spawn" section
- Asset count updates (e.g., "1 asset")

### 6. Verify Asset Appears in Spawn

**Action**:

1. `wait_for(text: "Test Image Asset", timeout: 2000)`
2. Take snapshot of "Assets in Current Spawn" section

**Expected**:

- Asset chip/card shows in spawn assets section
- Asset name "Test Image Asset" displayed
- Asset type indicator (icon or badge) shows "Image"
- Remove/delete option visible on asset chip

### 7. Add Second Asset

**Action**:

1. Scroll back to Asset Library section
2. Find "Test Video Asset"
3. Click its "Add to Spawn" button

**Expected**:

- Second asset added successfully
- Both assets now in "Assets in Current Spawn" section
- Asset count shows "2 assets"
- Assets displayed in order added (or deterministic order)

### 8. Add Third Asset

**Action**:

1. Find "Test Audio Asset" in library
2. Click its "Add to Spawn" button

**Expected**:

- Third asset added
- All three assets visible in spawn section
- Asset count shows "3 assets"

### 9. Verify All Assets Display Correctly

**Action**: Take snapshot of complete "Assets in Current Spawn" section

**Expected**:

- Three asset chips/cards displayed:
  1. Test Image Asset (with image icon)
  2. Test Video Asset (with video icon)
  3. Test Audio Asset (with audio icon)
- Each asset distinguishable by type
- No duplicate entries

### 10. Verify Draft State

**Action**: Check for unsaved changes indicator in right panel

**Expected**:

- Right panel shows unsaved asset changes indicator
- Save/Cancel buttons visible in "Assets in Current Spawn" section
- Status text indicates assets added (e.g., "+3 assets")
- Note: Asset assignments require explicit save (manual save model)

### 11. Save Asset Assignments

**Action**:

1. Locate Save button in "Assets in Current Spawn" section header
2. Take snapshot to find Save button UID
3. Click Save button: `click(uid: "[save-assets-button-uid]")`

**Expected**:

- Save completes successfully
- All asset assignments persisted
- Success toast notification appears
- Unsaved changes indicator clears
- Save/Cancel buttons disappear

### 12. Test Asset Removal

**Action**:

1. Take snapshot of "Assets in Current Spawn" section
2. Find remove/delete button (trash icon or "×") on "Test Audio Asset"
3. Click to remove asset: `click(uid: "[remove-audio-button-uid]")`

**Expected**:

- Confirmation dialog appears asking to confirm removal
- After confirming, asset creates draft state (requires save)
- Unsaved changes indicator reappears showing asset removal
- Save/Cancel buttons visible again
- Asset still visible until saved (draft state)

### 13. Save Removal and Verify

**Action**:

1. Click Save button to persist removal
2. Wait for save confirmation
3. Take snapshot

**Expected**:

- Save completes successfully
- Only two assets remain in spawn:
  - Test Image Asset
  - Test Video Asset
- Test Audio Asset remains in library section, available to add again
- Asset count shows "2 assets" (or "(2)" in section header)

### 14. Switch to Different Spawn

**Action**:

1. Take snapshot of spawn list
2. Click different spawn (e.g., "Test Spawn Beta")

**Expected**:

- Different spawn selected
- Right panel updates to show assets for new spawn
- New spawn likely has 0 assets (empty state)
- Previous spawn's asset assignments preserved

### 15. Return to First Spawn

**Action**: Click back to "Test Spawn Alpha"

**Expected**:

- Returns to first spawn
- Asset assignments still present (2 assets)
- No data loss from switching spawns

### 16. Take Final Screenshot

**Action**: `take_screenshot(filePath: "e2e-tests/screenshots/04-asset-assignment-complete.png", fullPage: true)`

**Expected**:

- Screenshot shows spawn with assigned assets
- Both center and right panels visible

## Success Criteria

- [ ] Can view asset library in right panel
- [ ] Can add assets from library to spawn
- [ ] Assets appear immediately in spawn section after adding
- [ ] Asset count updates correctly
- [ ] Asset type indicators display correctly
- [ ] Can remove assets from spawn
- [ ] Removed assets return to available library
- [ ] Asset assignments persist when switching spawns
- [ ] No console errors during operations

## Performance Target

- Add asset to spawn: < 200ms
- Remove asset from spawn: < 150ms
- Switch spawn and load assets: < 100ms
- UI updates responsive throughout

## Data State After Test

After this scenario:

- "Test Spawn Alpha" has 2 assets assigned:
  - Test Image Asset
  - Test Video Asset
- "Test Spawn Beta" has 0 assets (or whatever was previously assigned)
- All assets remain in library

## Common Issues

- **Add button not working**: Ensure spawn is selected, check button UID
- **Assets not appearing**: Wait for async operation, check for success toast
- **Asset count not updating**: May be cached, trigger re-render by interacting with UI
- **Can't remove asset**: Check for confirmation dialog, may need to confirm removal
