# Scenario 03: Spawn Creation and Configuration

## Objective

Test spawn creation workflow and basic spawn configuration including name, description, enabled state, and trigger settings.

## Prerequisites

- Application running at `http://localhost:5173`
- At least one profile exists and is active
- User at main application page (spawns view)

## Steps

### 1. Navigate to Application

**Action**: `navigate_page(url: "http://localhost:5173")`

**Expected**:

- Page loads with active profile
- Three-panel layout visible

### 2. Verify Spawns Panel

**Action**:

1. `wait_for(text: "Spawns", timeout: 3000)`
2. Take snapshot

**Expected**:

- Left panel shows "Spawns" header
- Spawn count displayed (may be "0 spawns")
- "New Spawn" button visible and enabled

### 3. Create First Spawn

**Action**:

1. Find "New Spawn" button in left panel
2. `click(uid: "[new-spawn-button-uid]")`

**Expected**:

- New spawn created immediately
- Spawn appears in left panel list
- Spawn automatically selected (highlighted)
- Center panel opens with spawn settings
- Default name like "New Spawn 1" assigned

### 4. Verify Spawn Editor Opens

**Action**:

1. Wait for spawn editor to load (look for spawn name field or enabled toggle)
2. Take snapshot of center panel

**Expected**:

- Center panel shows spawn editor form
- Spawn name field visible at top and editable
- Other configuration fields visible:
  - Description
  - Enabled toggle/switch
  - Duration field (in milliseconds)
  - Trigger type selector
  - Trigger-specific configuration sections
- Save and Cancel buttons at bottom of form

### 5. Edit Spawn Name

**Action**:

1. Find name input field in center panel
2. `fill(uid: "[name-input-uid]", value: "Test Spawn Alpha")`

**Expected**:

- Field accepts input
- Unsaved changes indicator appears (if implemented)
- Save button becomes enabled

### 6. Edit Spawn Description

**Action**:

1. Find description input/textarea
2. `fill(uid: "[description-input-uid]", value: "This is a test spawn for E2E validation")`

**Expected**:

- Field accepts multi-line input
- No validation errors

### 7. Configure Duration

**Action**:

1. Find duration input field
2. `fill(uid: "[duration-input-uid]", value: "5000")`

**Expected**:

- Field accepts numeric input (milliseconds)
- No validation errors for valid duration

### 8. Check Enabled Toggle

**Action**:

1. Take snapshot to locate enabled toggle/switch
2. Verify current state
3. If disabled, click to enable: `click(uid: "[enabled-toggle-uid]")`

**Expected**:

- Toggle switches state
- Visual indicator shows enabled state
- No errors

### 9. Configure Trigger (Basic)

**Action**:

1. Locate trigger type selector/dropdown
2. Verify default trigger type is set
3. Note: Don't change trigger type in this basic test

**Expected**:

- Trigger section visible
- Default trigger type shown (e.g., "Command")
- Trigger fields appropriate for type

### 10. Save Spawn Changes

**Action**:

1. Take snapshot
2. Find "Save" button at bottom of form
3. `click(uid: "[save-button-uid]")`

**Expected**:

- Save operation completes
- Success toast/notification appears
- Unsaved changes indicator clears
- Spawn list updates with new name "Test Spawn Alpha"

### 11. Verify Spawn in List

**Action**:

1. `wait_for(text: "Test Spawn Alpha", timeout: 2000)`
2. Take snapshot of left panel

**Expected**:

- Spawn list shows "Test Spawn Alpha"
- Spawn remains selected (highlighted)
- Enabled indicator shows spawn is enabled
- No error indicators on spawn item

### 12. Create Second Spawn

**Action**:

1. Click "New Spawn" button again
2. Wait for new spawn to appear

**Expected**:

- Second spawn created with name like "New Spawn 2"
- Second spawn automatically selected
- Center panel switches to new spawn's settings
- First spawn remains in list

### 13. Configure Second Spawn

**Action**:

1. Change name to "Test Spawn Beta"
2. Add description: "Second test spawn"
3. Save changes

**Expected**:

- Changes save successfully
- Both spawns now visible in list with distinct names

### 14. Switch Between Spawns

**Action**:

1. Take snapshot of spawn list
2. Click first spawn "Test Spawn Alpha" in list
3. `click(uid: "[first-spawn-uid]")`

**Expected**:

- Selection changes to first spawn
- Center panel loads first spawn's settings
- All previously saved values displayed correctly
- No data loss between switches

### 15. Verify Data Persistence

**Action**:

1. Check that "Test Spawn Alpha" settings show:
   - Name: "Test Spawn Alpha"
   - Description: "This is a test spawn for E2E validation"
   - Duration: "5000"
   - Enabled: true

**Expected**:

- All data persisted correctly
- No values lost or corrupted

### 16. Take Final Screenshot

**Action**: `take_screenshot(filePath: "e2e-tests/screenshots/03-spawn-creation-complete.png", fullPage: true)`

**Expected**:

- Screenshot shows two spawns in list
- First spawn selected with settings visible

## Success Criteria

- [ ] Can create new spawns via "New Spawn" button
- [ ] New spawns auto-select and open in editor
- [ ] Can edit spawn name and description
- [ ] Can configure duration and enabled state
- [ ] Save button persists all changes
- [ ] Can switch between spawns without data loss
- [ ] Spawn list updates reflect all changes
- [ ] No console errors during operations

## Performance Target

- Spawn creation: < 100ms
- Selection switch: < 100ms
- Save operation: < 200ms
- Form field updates: < 50ms (responsive input)

## Data State After Test

This scenario creates two spawns:

1. "Test Spawn Alpha" - Enabled, 5000ms duration, with description
2. "Test Spawn Beta" - With description

Both spawns have no assets assigned yet (ready for Scenario 04).

## Common Issues

- **Spawn doesn't auto-select**: May need to manually click after creation
- **Save button disabled**: Check for validation errors in form
- **Changes not persisting**: Ensure Save button is clicked, check for error toasts
- **Switching spawns clears unsaved changes**: Expected behavior, unsaved changes guard working
