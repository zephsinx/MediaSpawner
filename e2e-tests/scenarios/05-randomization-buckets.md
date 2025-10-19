# Scenario 05: Randomization Bucket Creation

## Objective

Test the randomization bucket functionality including creating buckets, configuring selection modes, adding members, and verifying bucket indicators on assets.

## Prerequisites

- Application running at `http://localhost:4173`
- At least one profile exists and is active
- Spawn "Test Spawn Alpha" exists with 2+ assets assigned (from Scenario 04)
- User at main application page

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

### 2. Locate Randomization Buckets Section

**Action**:

1. Scroll center panel to find "Randomization Buckets" section
2. Take snapshot when section visible

**Expected**:

- Section titled "Randomization Buckets" present
- May show "0 buckets" or empty state with text "No buckets yet"
- "Add Bucket" button visible in top-right of section
- Optional description/help text explaining bucket functionality

### 3. Open Create Bucket Dialog

**Action**:

1. Find "Add Bucket" button in Randomization Buckets section
2. `click(uid: "[add-bucket-button-uid]")`

**Expected**:

- Dialog/modal opens with title "Create Bucket"
- Form fields visible:
  - Bucket name input
  - Selection mode dropdown ("one" or "n")
  - Number input for "n" (if mode is "n")
- Save and Cancel buttons

### 4. Fill Bucket Form - Mode "One"

**Action**:

```javascript
fill_form([
  { uid: "[bucket-name-input-uid]", value: "Visual Elements" },
  { uid: "[selection-mode-uid]", value: "one" },
]);
```

**Expected**:

- Name field accepts input
- Selection mode set to "Pick one" or "one"
- Number input hidden (not needed for "one" mode)
- No validation errors

### 5. Save First Bucket

**Action**:

1. Take snapshot to get button UID
2. Click "Save" or "Create Bucket" button
3. `click(uid: "[save-bucket-button-uid]")`

**Expected**:

- Dialog closes
- Success notification appears
- New bucket appears in Randomization Buckets section
- Bucket card shows:
  - Name: "Visual Elements"
  - Selection mode: "Pick one"
  - Members: 0
  - "Edit Members" button

### 6. Verify Bucket Card

**Action**:

1. `wait_for(text: "Visual Elements", timeout: 2000)`
2. Take snapshot of Randomization Buckets section

**Expected**:

- Bucket card displayed with all details
- "Edit Members" button enabled
- Delete/remove bucket option available

### 7. Open Members Editor

**Action**:

1. Find "Edit Members" button on bucket card
2. `click(uid: "[edit-members-button-uid]")`

**Expected**:

- Members editor modal/dialog opens
- Dialog shows list of spawn's assets as checkboxes
- Each asset shows:
  - Checkbox (unchecked initially)
  - Asset name
  - Asset type chip/icon
  - Display order indicator
- "Done" or "Save" button to close

### 8. Add Members to Bucket

**Action**:

1. Take snapshot to get checkbox UIDs
2. Find checkbox for "Test Image Asset"
3. `click(uid: "[image-asset-checkbox-uid]")`
4. Find checkbox for "Test Video Asset"
5. `click(uid: "[video-asset-checkbox-uid]")`

**Expected**:

- Checkboxes toggle to checked state
- Selected assets highlighted or marked
- Member count updates in dialog (if shown)

### 9. Save Bucket Members

**Action**:

1. Find "Done" or "Save" button in members dialog
2. `click(uid: "[save-members-button-uid]")`

**Expected**:

- Dialog closes
- Bucket card updates to show "Members: 2" or similar
- Changes saved

### 10. Verify Bucket Chips on Assets

**Action**:

1. Take snapshot of right panel "Assets in Current Spawn" section
2. Look for bucket indicators on asset chips

**Expected**:

- "Test Image Asset" chip shows bucket indicator
- "Test Video Asset" chip shows bucket indicator
- Bucket indicator displays bucket name or icon
- Tooltip or label shows "Visual Elements" bucket

### 11. Create Second Bucket - Mode "N"

**Action**:

1. Scroll to Randomization Buckets section
2. Click "Add Bucket" button again
3. Fill form:
   - Name: "Audio Options"
   - Selection mode: "n"
   - Number: 2

**Expected**:

- Second bucket creation dialog opens
- When selection mode set to "n", number input appears
- Number input accepts value "2"

### 12. Save Second Bucket

**Action**: Click Save button in dialog

**Expected**:

- Second bucket created successfully
- Both buckets now visible in section
- Second bucket shows "Pick 2" or "Pick N (2)"

### 13. Add Asset to Library for Second Bucket

**Action**:

1. Navigate to Asset Library (if needed to add more audio assets)
2. OR work with existing assets if enough available
3. Return to spawn view

**Expected**:

- Additional assets available for assignment
- OR proceed with existing assets

### 14. Verify Bucket Validation

**Action**:

1. Take snapshot of both buckets
2. Verify bucket section shows no errors

**Expected**:

- Both buckets valid
- No error indicators
- All invariants met:
  - Each asset in at most one bucket
  - "n" value ≤ enabled member count

### 15. Test Bucket Editing

**Action**:

1. Find edit button on first bucket "Visual Elements"
2. If available, click to edit bucket settings

**Expected** (if feature exists):

- Can modify bucket name or settings
- Changes save correctly

### 16. Test Bucket Deletion

**Action**:

1. Find delete button on second bucket "Audio Options"
2. Click delete button
3. Confirm deletion if prompted

**Expected**:

- Confirmation dialog appears
- After confirmation, bucket removed
- Bucket chips removed from assets
- Only first bucket remains

### 17. Save Spawn with Bucket Configuration

**Action**:

1. Scroll to bottom of spawn settings
2. Click "Save" button
3. `click(uid: "[save-spawn-button-uid]")`

**Expected**:

- Save completes successfully
- Bucket configuration persisted
- Success notification appears

### 18. Verify Persistence

**Action**:

1. Switch to different spawn
2. Switch back to "Test Spawn Alpha"
3. Scroll to Randomization Buckets section

**Expected**:

- Bucket "Visual Elements" still present
- Members still assigned (2 assets)
- Configuration unchanged
- Bucket chips still visible on assets

### 19. Take Final Screenshot

**Action**: `take_screenshot(filePath: "e2e-tests/screenshots/05-randomization-buckets-complete.png", fullPage: true)`

**Expected**:

- Screenshot shows bucket section with configured bucket
- Asset chips with bucket indicators visible

## Success Criteria

- [ ] Can create randomization buckets with both selection modes
- [ ] Can open members editor and add assets to bucket
- [ ] Members editor shows all spawn assets with checkboxes
- [ ] Bucket member count updates correctly
- [ ] Bucket chips/indicators appear on assets in spawn
- [ ] Can delete buckets
- [ ] Bucket configuration persists with spawn
- [ ] Bucket validation works (no duplicate assignments)
- [ ] No console errors during operations

## Performance Target

- Create bucket: < 200ms
- Open members editor: < 150ms
- Add/remove members: < 100ms per operation
- Save bucket config: < 200ms

## Data State After Test

After this scenario:

- "Test Spawn Alpha" has one randomization bucket:
  - Name: "Visual Elements"
  - Selection mode: "one"
  - Members: 2 (Test Image Asset, Test Video Asset)
- Bucket configuration persisted in spawn data

## Common Issues

- **Members editor not opening**: Check spawn has assets assigned first
- **Checkboxes not toggling**: Ensure correct UID from snapshot, check for disabled state
- **Bucket chips not showing**: May need to scroll or refresh right panel
- **Validation errors**: Ensure "n" value doesn't exceed member count
- **Assets can't be in multiple buckets**: Expected behavior, move asset to different bucket if needed
