# Scenario 01: First-Time User Experience

## Objective

Verify that a new user with no existing data can successfully create their first spawn profile and navigate the application.

## Prerequisites

- Development server running at `http://localhost:5173`
- Clean localStorage (no existing MediaSpawner data)
- Fresh browser session or cleared storage

## Steps

### 1. Navigate to Application

**Action**: `navigate_page(url: "http://localhost:5173")`

**Expected**:

- Page loads successfully
- No JavaScript errors in console

### 2. Verify Initial Load

**Action**: `wait_for(text: "MediaSpawner", timeout: 5000)`

**Expected**:

- Application header appears with "MediaSpawner" title
- Page fully renders

### 3. Take Initial Snapshot

**Action**: `take_snapshot()`

**Expected**:

- Snapshot shows application structure
- Header with profile selector visible
- Main content area visible

### 4. Check for Empty State or Profile Prompt

**Action**: Look for profile selector in snapshot

**Expected**:

- Profile dropdown exists (may be empty or have default profile)
- "Create Profile" button visible in UI
- Left panel (Spawns) shows empty state or loading

### 5. Open Profile Creation Dialog

**Action**:

1. Take snapshot to get element UIDs
2. Find "Create Profile" button (look for button with text "Create Profile")
3. `click(uid: "[create-profile-button-uid]")`

**Expected**:

- Dialog/modal opens with title "Create Profile"
- Form fields for profile name and description visible
- Save/Create button visible

### 6. Fill Profile Form

**Action**:

```javascript
fill_form([
  { uid: "[name-input-uid]", value: "My First Profile" },
  { uid: "[description-input-uid]", value: "Test profile for E2E" },
]);
```

**Expected**:

- Fields accept input
- No validation errors shown

### 7. Submit Profile Creation

**Action**:

1. Take snapshot
2. Find "Create Profile" or "Save" button in dialog
3. `click(uid: "[save-button-uid]")`

**Expected**:

- Dialog closes
- Success toast/notification appears
- New profile becomes active in selector

### 8. Verify Profile Activation

**Action**:

1. `wait_for(text: "My First Profile", timeout: 3000)`
2. Take snapshot

**Expected**:

- Profile selector shows "My First Profile"
- Application is now fully accessible
- Spawns panel shows empty state with "No Spawns Found" message

### 9. Verify Empty Spawns State

**Action**: Check snapshot for spawn list state

**Expected**:

- Left panel shows "Spawns" header
- "0 spawns" count displayed
- "New Spawn" button visible
- Empty state message: "No Spawns Found"
- Instruction text about creating first spawn

### 10. Verify Center Panel

**Action**: Check snapshot for center panel content

**Expected**:

- Center panel shows welcome message or instructions
- OR center panel prompts user to create first spawn
- No errors or broken UI

### 11. Verify Right Panel

**Action**: Check snapshot for right panel (Asset Management)

**Expected**:

- Right panel visible with "Asset Library" or similar header
- Empty state or instructions for adding assets
- No errors

### 12. Take Final Screenshot

**Action**: `take_screenshot(filePath: "e2e-tests/screenshots/01-first-time-complete.png", fullPage: true)`

**Expected**:

- Screenshot captures complete application state
- UI looks correct with new profile active

## Success Criteria

- [ ] Application loads without errors
- [ ] Profile creation dialog opens successfully
- [ ] New profile can be created with valid name
- [ ] Profile becomes active after creation
- [ ] All three panels visible and functional
- [ ] Empty states display appropriate messages
- [ ] No console errors (check with `list_console_messages()`)

## Performance Target

- First Contentful Paint: < 500ms
- Profile creation completes: < 300ms after button click
- UI responsive throughout workflow

## Cleanup

This scenario creates one profile named "My First Profile". Subsequent tests can use this profile or create additional ones as needed.

## Common Issues

- **Dialog doesn't open**: Check that button UID is correct, take fresh snapshot
- **Profile not appearing**: Wait longer for async operation, check console for errors
- **Empty state not showing**: Profile may have pre-existing spawns from previous test, ensure clean localStorage
