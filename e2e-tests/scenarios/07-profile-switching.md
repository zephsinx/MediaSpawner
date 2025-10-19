# Scenario 07: Profile Switching

## Objective

Test profile switching workflow with state isolation and unsaved changes guard.

## Prerequisites

- Application running at `http://localhost:5173`
- At least two profiles exist (create additional if needed)
- First profile has spawns and assets (from previous scenarios)
- Second profile can be empty or have different data

## Steps

### 1. Navigate to Application

**Action**: `navigate_page(url: "http://localhost:5173")`

**Expected**:

- Application loads with active profile
- Profile selector shows current profile

### 2. Verify Current Profile State

**Action**:

1. `wait_for(text: "MediaSpawner", timeout: 3000)`
2. Take snapshot of header
3. Check profile selector value

**Expected**:

- Profile dropdown shows active profile (e.g., "My First Profile")
- Current profile's spawns visible in left panel
- Application fully loaded

### 3. Create Second Profile (if needed)

**Action**:

1. If only one profile exists:
2. Click "Create Profile" button
3. Fill form:
   - Name: "Secondary Profile"
   - Description: "Profile for testing switching"
4. Save new profile

**Expected**:

- Second profile created successfully
- New profile becomes active
- Empty spawns list (new profile has no data)

### 4. Return to First Profile

**Action**:

1. Take snapshot to locate profile selector
2. Find profile dropdown in header
3. `click(uid: "[profile-selector-uid]")` to open dropdown
4. Select first profile from list

**Expected**:

- Dropdown opens showing all profiles
- First profile selectable
- Click switches to first profile

### 5. Verify Profile Switch Without Unsaved Changes

**Action**:

1. Wait for profile to load
2. `wait_for(text: "My First Profile", timeout: 2000)` in selector
3. Take snapshot

**Expected**:

- Profile switches immediately (no confirmation)
- First profile's spawns appear in list
- Previous spawn selection cleared
- Center panel may show empty state or first spawn
- Right panel updates to show first profile's assets

### 6. Select Spawn and Begin Editing

**Action**:

1. Click spawn "Test Spawn Alpha" in left panel
2. Wait for spawn settings to load
3. Locate spawn name field
4. Modify spawn name (add " EDITED" to end)
5. DO NOT SAVE

**Expected**:

- Spawn selected and loaded
- Name field editable
- Changes made but not saved
- Unsaved changes indicator appears (if implemented)
- Save button enabled

### 7. Verify Unsaved Changes State

**Action**: Take snapshot showing unsaved changes

**Expected**:

- Modified field shows changed value
- Visual indicator of unsaved changes (asterisk, highlighted save button, etc.)
- Application aware changes are pending

### 8. Attempt Profile Switch with Unsaved Changes

**Action**:

1. Click profile selector dropdown
2. Select different profile (Secondary Profile)

**Expected**:

- Confirmation dialog appears immediately
- Dialog title: "Unsaved Changes" or similar
- Dialog message warns about discarding changes
- Two options:
  - "Cancel" or "Stay" - cancel the switch
  - "Discard Changes" or "Continue" - proceed with switch

### 9. Cancel Profile Switch

**Action**:

1. Take snapshot of confirmation dialog
2. Find "Cancel" button
3. `click(uid: "[cancel-button-uid]")`

**Expected**:

- Dialog closes
- Profile switch cancelled
- Remains on first profile
- Unsaved changes still present
- Modified field value unchanged

### 10. Verify Cancellation Worked

**Action**: Check spawn settings still show edited value

**Expected**:

- Still on "My First Profile"
- Spawn "Test Spawn Alpha" still selected
- Modified name field still shows "EDITED" text
- Unsaved changes indicator still present

### 11. Attempt Switch Again and Discard

**Action**:

1. Click profile selector again
2. Select "Secondary Profile"
3. Wait for confirmation dialog
4. Click "Discard Changes" button
5. `click(uid: "[discard-button-uid]")`

**Expected**:

- Dialog appears again
- After clicking discard:
  - Dialog closes
  - Profile switches to Secondary Profile
  - Changes to first profile discarded (not saved)

### 12. Verify Second Profile State

**Action**:

1. `wait_for(text: "Secondary Profile", timeout: 2000)`
2. Take snapshot

**Expected**:

- Profile selector shows "Secondary Profile"
- Spawn list shows spawns from secondary profile (likely empty)
- Center panel resets to empty or default state
- Right panel shows secondary profile's assets
- Complete state isolation between profiles

### 13. Return to First Profile

**Action**:

1. Switch back to "My First Profile" via selector
2. Wait for profile to load

**Expected**:

- Switches without confirmation (no unsaved changes)
- First profile loads

### 14. Verify Changes Were Discarded

**Action**:

1. Click spawn "Test Spawn Alpha"
2. Check spawn name field value

**Expected**:

- Spawn name shows original value WITHOUT "EDITED" text
- Changes from step 6 were not saved
- Discard operation worked correctly
- Data integrity maintained

### 15. Test Rapid Profile Switching

**Action**:

1. Switch to Secondary Profile
2. Immediately switch back to My First Profile
3. Switch to Secondary again

**Expected**:

- All switches complete successfully
- No errors or race conditions
- Each profile loads its correct data
- UI remains responsive

### 16. Test Profile Switching from Different Pages

**Action**:

1. Navigate to Asset Library page
2. Switch profiles while on Asset Library

**Expected**:

- Profile switches successfully
- Asset Library updates to show new profile's assets
- No navigation errors
- Can return to main view and see correct profile data

### 17. Verify State Isolation

**Action**:

1. Switch to first profile
2. Note spawn count and asset count
3. Switch to second profile
4. Note spawn count and asset count
5. Verify counts are different and isolated

**Expected**:

- Each profile maintains independent data
- First profile has spawns and assets from previous tests
- Second profile has different data (or empty)
- No data bleed between profiles

### 18. Take Final Screenshot

**Action**: `take_screenshot(filePath: "e2e-tests/screenshots/07-profile-switching-complete.png", fullPage: true)`

**Expected**:

- Screenshot shows application with profile selector
- Current profile clearly indicated

## Success Criteria

- [ ] Can switch between profiles via dropdown selector
- [ ] Profile switch updates all panels (spawns, settings, assets)
- [ ] Unsaved changes trigger confirmation dialog
- [ ] Can cancel profile switch and retain unsaved changes
- [ ] Can discard changes and proceed with switch
- [ ] Discarded changes are not saved to profile
- [ ] Each profile maintains isolated data state
- [ ] Can switch from any page in application
- [ ] Rapid switching works without errors
- [ ] No console errors during switching
- [ ] Profile data persists correctly across switches

## Performance Target

- Profile switch (no unsaved changes): < 200ms
- Unsaved changes dialog appearance: < 50ms (immediate)
- Data reload after switch: < 150ms

## Data State After Test

After this scenario:

- First profile ("My First Profile") unchanged (edits were discarded)
- Second profile ("Secondary Profile") unchanged
- Both profiles maintain independent data
- Active profile is whichever was selected last

## Common Issues

- **No confirmation dialog**: Check that actual changes were made, not just field focused
- **Changes saved despite discarding**: Check unsaved changes detection logic
- **Wrong data after switch**: Profile isolation may be broken, check localStorage keys
- **Dropdown not opening**: Profile selector may be styled as readonly, look for button to trigger selector
- **Slow switching**: Large datasets may take longer to load, verify within performance targets

## Notes

- Unsaved changes guard is critical for data integrity
- Each profile stored separately in localStorage
- Profile switch clears any selection state (no spawn selected after switch)
- Asset library and spawns both profile-specific
- Settings may be global or per-profile (check application design)
