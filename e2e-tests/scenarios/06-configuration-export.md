# Scenario 06: Configuration Export

## Objective

Validate the configuration export functionality including navigating to settings, triggering export, verifying file download, and validating JSON structure.

## Prerequisites

- Application running at `http://localhost:4173`
- At least one profile with spawns and assets exists (from previous scenarios)
- Data to export:
  - 1+ profiles
  - 2+ spawns
  - 3+ assets
  - 1+ randomization bucket

## Steps

### 1. Navigate to Application

**Action**: `navigate_page(url: "http://localhost:4173")`

**Expected**:

- Application loads with active profile
- Main view visible

### 2. Open Settings

**Action**:

1. `wait_for(text: "MediaSpawner", timeout: 3000)`
2. Take snapshot of header area
3. Find "Settings" button (gear icon or text button)
4. `click(uid: "[settings-button-uid]")`

**Expected**:

- Settings page/modal opens
- OR navigates to `/settings` route
- Settings content visible

### 3. Wait for Settings Load

**Action**:

1. `wait_for(text: "Settings", timeout: 3000)`
2. OR `wait_for(text: "Import/Export", timeout: 3000)`
3. Take snapshot

**Expected**:

- Settings page fully loaded
- Various setting sections visible:
  - OBS canvas dimensions
  - Streamer.bot connection
  - Import/Export section
- Form fields and controls rendered

### 4. Locate Import/Export Section

**Action**:

1. Scroll to "Import/Export Configuration" section
2. Take snapshot when section visible

**Expected**:

- Section titled "Import/Export Configuration"
- Description text explaining functionality
- Two buttons:
  - "Export Configuration" or "Export"
  - "Import Configuration" or "Import"
- Both buttons enabled

### 5. Verify Pre-Export State

**Action**: Take snapshot before export

**Expected**:

- Export button enabled
- No error messages
- Download count: 0 files pending

### 6. Trigger Configuration Export

**Action**:

1. Find "Export Configuration" button
2. `click(uid: "[export-button-uid]")`

**Expected**:

- Button shows loading state (optional)
- Success toast/notification appears with message like:
  "Configuration exported successfully! (X profiles, Y assets, Z spawns)"
- File download initiates

### 7. Verify Export Success Notification

**Action**:

1. `wait_for(text: "exported successfully", timeout: 3000)`
2. Take snapshot

**Expected**:

- Success message visible
- Message includes counts:
  - Profile count (at least 1)
  - Asset count (at least 3)
  - Spawn count (at least 2)
- No error messages

### 8. Check for Download (via browser)

**Action**: Use evaluate_script to check download state

```javascript
evaluate_script(() => {
  // Check if download was triggered
  // Note: May not be detectable in all browsers
  return {
    downloadsChecked: true,
  };
});
```

**Expected**:

- Download initiated (file may be in downloads folder)
- Filename format: `mediaspawner-config-YYYY-MM-DD-HHMMSS.json`

### 9. Verify Network Request

**Action**: `list_network_requests()`

**Expected**:

- No network requests to external servers for export
- Export handled client-side (localStorage → JSON → download)
- Confirms export is local-only operation

### 10. Validate Export Button Reset

**Action**: Take snapshot after export completes

**Expected**:

- Export button returns to normal state (not loading)
- Button still enabled for additional exports
- No errors displayed

### 11. Test Multiple Exports

**Action**:

1. Click "Export Configuration" button again
2. Wait for success notification

**Expected**:

- Second export succeeds
- New file downloaded with different timestamp
- Each export independent and successful

### 12. Review JSON Structure (Manual Step)

**Action**: Manual review of downloaded file

**Expected JSON structure**:

```json
{
  "version": "1.0",
  "exportDate": "ISO-8601 timestamp",
  "profiles": [
    {
      "id": "uuid",
      "name": "My First Profile",
      "description": "...",
      "spawns": [
        {
          "id": "uuid",
          "name": "Test Spawn Alpha",
          "enabled": true,
          "duration": 5000,
          "assets": [...],
          "randomizationBuckets": [...]
        }
      ]
    }
  ],
  "assets": [
    {
      "id": "uuid",
      "name": "Test Image Asset",
      "type": "image",
      "filePath": "..."
    }
  ],
  "settings": {
    "obsCanvasWidth": 1920,
    "obsCanvasHeight": 1080,
    ...
  }
}
```

**Expected validation**:

- Valid JSON format (parseable)
- All expected top-level keys present
- Profile data includes spawns
- Spawns include assets and buckets
- Asset library exported
- Settings exported
- No sensitive data (passwords, tokens)
- No corrupted or truncated data

### 13. Verify Data Completeness

**Action**: Compare export counts to application state

**Expected**:

- Profile count matches selector dropdown
- Spawn count matches spawn list
- Asset count matches asset library
- All data from all profiles included (not just active)

### 14. Test Export with Empty Profile

**Action**:

1. Create new empty profile (no spawns)
2. Export configuration
3. Verify export includes empty profile

**Expected**:

- Export succeeds with empty profile
- Profile appears in JSON with empty spawns array
- No errors for empty state

### 15. Take Final Screenshot

**Action**: `take_screenshot(filePath: "e2e-tests/screenshots/06-export-complete.png", fullPage: true)`

**Expected**:

- Screenshot shows settings page with Import/Export section
- Success notification visible

### 16. Return to Main View

**Action**:

1. Close settings or navigate back
2. Return to spawn view

**Expected**:

- Navigation successful
- Application state unchanged by export
- Data still intact

## Success Criteria

- [ ] Can navigate to settings page
- [ ] Import/Export section visible and accessible
- [ ] Export button triggers export operation
- [ ] Success notification appears with counts
- [ ] File download initiates
- [ ] Downloaded file is valid JSON
- [ ] JSON structure matches expected schema
- [ ] All data exported (profiles, spawns, assets, settings)
- [ ] Can export multiple times without errors
- [ ] Export is local-only (no network requests)
- [ ] No console errors during export

## Performance Target

- Export operation: < 500ms for typical dataset
- File generation: < 200ms
- UI response: < 100ms to show success notification

## Data State After Test

This scenario does not modify application state. All data remains unchanged. Multiple export files may be downloaded to user's downloads folder.

## Common Issues

- **Export button not working**: Check button enabled state, verify no validation blocking export
- **No download**: Browser may block downloads, check browser permissions
- **Success message but no file**: Check browser download settings, may need to allow downloads
- **Invalid JSON**: Check for data corruption in localStorage, verify export service logic
- **Missing data**: Ensure all profiles, spawns, and assets were properly created in previous scenarios
- **Counts don't match**: Export includes all profiles, not just active; count all data across all profiles

## Notes

- Export includes ALL profiles and data, not just the active profile
- Export is purely client-side operation using localStorage
- File timestamp in name prevents overwrite of previous exports
- Export can be used for backup, sharing, or migration
- Imported configuration (not tested here) should restore identical state
