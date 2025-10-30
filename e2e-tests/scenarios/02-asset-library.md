# Scenario 02: Asset Library Operations

## Objective

Validate asset library management workflows including navigating to the asset library page, adding new assets, and viewing the asset list.

## Prerequisites

- Application running at `http://localhost:4173`
- At least one profile exists (created in Scenario 01 or manually)
- User at main application page (spawns view)

## Steps

### 1. Navigate to Application

**Action**: `navigate_page(url: "http://localhost:4173")`

**Expected**:

- Page loads successfully
- Application renders with active profile

### 2. Locate Asset Library Navigation

**Action**:

1. `wait_for(text: "MediaSpawner", timeout: 3000)`
2. Take snapshot
3. Find "Edit Assets" button/link in navigation area

**Expected**:

- Navigation button labeled "Edit Assets" visible in header
- Button is enabled and clickable

### 3. Navigate to Asset Library

**Action**: `click(uid: "[edit-assets-button-uid]")`

**Expected**:

- Page navigates to `/assets` route
- URL changes to include `/assets`

### 4. Verify Asset Library Page Load

**Action**:

1. `wait_for(text: "Asset Library", timeout: 3000)`
2. Take snapshot

**Expected**:

- Page shows "Asset Library" heading or title
- Asset list area visible (may be empty)
- "Add Asset" button visible
- Filter/search controls visible

### 5. Check Empty State (if no assets)

**Action**: Review snapshot for asset list content

**Expected** (if empty):

- Empty state message displayed
- Instructions or prompt to add first asset
- "Add Asset" button prominent

**Expected** (if assets exist):

- Asset cards displayed in grid/list
- Each card shows asset name and type
- Preview thumbnails visible for visual assets

### 6. Open Add Asset Form

**Action**:

1. Take snapshot
2. Find "Add Asset" button
3. `click(uid: "[add-asset-button-uid]")`

**Expected**:

- Add asset form appears (inline or modal)
- Form fields visible:
  - Name input
  - Type selector (Image, Video, Audio)
  - File path input
- Cancel button visible

### 7. Fill Asset Form - Image

**Action**:

```text
fill_form([
  { uid: "[name-input-uid]", value: "Test Image Asset" },
  { uid: "[type-select-uid]", value: "image" },
  { uid: "[path-input-uid]", value: "C:\\Media\\test-image.png" }
])
```

**Expected**:

- All fields accept input
- No validation errors
- Type selector shows "Image" selected

### 8. Submit Asset Creation

**Action**:

1. Take snapshot to get button UID
2. Find "Add Asset" or "Save" button in form
3. `click(uid: "[save-asset-button-uid]")`

**Expected**:

- Form closes or resets
- Success toast notification appears
- New asset appears in asset list

### 9. Verify Asset in List

**Action**:

1. `wait_for(text: "Test Image Asset", timeout: 3000)`
2. Take snapshot

**Expected**:

- New asset card visible with name "Test Image Asset"
- Asset type badge shows "Image" or image icon
- File path displayed (may be abbreviated)
- Asset count updated (if count shown)

### 10. Add Second Asset - Video

**Action**:

1. Click "Add Asset" button again
2. Fill form:
   - Name: "Test Video Asset"
   - Type: "video"
   - Path: "C:\\Media\\test-video.mp4"
3. Click save

**Expected**:

- Second asset added successfully
- Both assets visible in list
- Assets displayed in order (typically newest first or alphabetical)

### 11. Add Third Asset - Audio

**Action**:

1. Click "Add Asset" button again
2. Fill form:
   - Name: "Test Audio Asset"
   - Type: "audio"
   - Path: "C:\\Media\\test-audio.mp3"
3. Click save

**Expected**:

- Third asset added successfully
- All three assets visible
- Different type icons/badges for each asset type

### 12. Verify Type Filtering (if available)

**Action**:

1. Take snapshot
2. If type filter dropdown exists, test filtering by type

**Expected** (if feature exists):

- Filter shows all asset types
- Selecting "Image" shows only image assets
- Selecting "All" shows all assets again

### 13. Take Final Screenshot

**Action**: `take_screenshot(filePath: "e2e-tests/screenshots/02-asset-library-complete.png", fullPage: true)`

**Expected**:

- Screenshot shows asset library with multiple assets
- All asset cards rendered correctly

### 13.1 Rename Asset from Library (kebab menu)

**Action**:

1. Take snapshot of Asset Library list to capture UIDs
2. Locate the row for "Test Image Asset"
3. Click its per-row kebab (⋮) button (aria-label: "More actions")
4. Click "Rename"
5. When inline input appears, type "Test Image Asset Renamed" and press Enter

**Expected**:

- Success toast appears
- The asset row updates to show "Test Image Asset Renamed"
- Subsequent searches by the new name find the asset

### 13.2 Inline rename via double-click

**Action**:

1. Double-click the asset name "Test Video Asset"
2. Type "Test Video Asset Renamed" and press Enter

**Expected**:

- Asset name updates to "Test Video Asset Renamed"
- No dialog; inline edit completes with success toast

### 13.3 Uniqueness validation (duplicate name rejected)

**Action**:

1. Double-click the asset name "Test Audio Asset"
2. Type an existing name (e.g., "Test Image Asset Renamed") and press Enter

**Expected**:

- Inline error appears: "Name must be unique"
- Rename is not saved; asset name remains unchanged after canceling or blurring

### 14. Return to Main View

**Action**:

1. Find navigation back to main view (logo click or back button)
2. Navigate back to spawns view

**Expected**:

- Navigation successful
- Returns to main three-panel layout
- Assets remain persisted (verify in next scenarios)

## Success Criteria

- [ ] Successfully navigate to Asset Library page
- [ ] Add asset form opens and closes correctly
- [ ] Can create assets of all three types (image, video, audio)
- [ ] Assets appear in list immediately after creation
- [ ] Asset data persists in localStorage
- [ ] Type badges/icons display correctly
- [ ] Can rename from Asset Library via kebab (⋮) and double-click
- [ ] Duplicate names are rejected with clear inline error
- [ ] Renamed assets are discoverable via search
- [ ] No console errors during operations

## Performance Target

- Page navigation: < 200ms
- Asset creation: < 200ms per asset
- List updates: < 100ms after save

## Data State After Test

This scenario creates three assets:

1. "Test Image Asset" (image)
2. "Test Video Asset" (video)
3. "Test Audio Asset" (audio)

These assets will be available for use in subsequent scenarios (especially Scenario 04).

## Common Issues

- **Form doesn't appear**: Check button UID, verify element is clickable
- **Assets not persisting**: Check localStorage, verify save operations complete
- **Type selector not working**: May need to click to open dropdown first
- **Path validation errors**: Ensure path format is valid for your OS
