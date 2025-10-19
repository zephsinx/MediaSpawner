# MediaSpawner E2E Test Suite

This document provides an overview of all regression test scenarios for MediaSpawner.

## Test Execution Order

For best results, run tests in this order:

1. **Performance benchmarks** (Scenario 08) - Establish baseline with clean state
2. **Critical path workflows** (Scenarios 01-07) - Validate user journeys

## Test Scenarios

### Scenario 01: First-Time User Experience

**File**: `scenarios/01-first-time-user.md`

**Objective**: Verify that a new user can successfully create their first profile and navigate the application.

**Coverage**:

- Empty state UI
- Profile creation dialog
- Profile activation
- Initial navigation

**Duration**: ~2 minutes

---

### Scenario 02: Asset Library Operations

**File**: `scenarios/02-asset-library.md`

**Objective**: Validate asset management workflows including adding and viewing assets.

**Coverage**:

- Navigate to Asset Library
- Add new asset form
- Asset list display
- Asset filtering

**Duration**: ~3 minutes

---

### Scenario 03: Spawn Creation and Configuration

**File**: `scenarios/03-spawn-creation.md`

**Objective**: Test spawn creation and basic configuration settings.

**Coverage**:

- Create new spawn
- Edit spawn name
- Configure spawn settings
- Save spawn changes

**Duration**: ~3 minutes

---

### Scenario 04: Asset Assignment to Spawns

**File**: `scenarios/04-asset-assignment.md`

**Objective**: Verify the workflow for adding assets to spawns.

**Coverage**:

- View spawn assets panel
- Add assets from library to spawn
- Verify asset appears in spawn
- Asset count updates

**Duration**: ~2 minutes

---

### Scenario 05: Randomization Bucket Creation

**File**: `scenarios/05-randomization-buckets.md`

**Objective**: Test randomization bucket functionality.

**Coverage**:

- Access randomization buckets section
- Create new bucket
- Configure selection mode
- Add members to bucket
- Verify bucket chips on assets

**Duration**: ~4 minutes

---

### Scenario 06: Configuration Export

**File**: `scenarios/06-configuration-export.md`

**Objective**: Validate configuration export functionality.

**Coverage**:

- Navigate to settings
- Trigger export
- Verify download occurs
- Validate JSON structure

**Duration**: ~2 minutes

---

### Scenario 07: Profile Switching

**File**: `scenarios/07-profile-switching.md`

**Objective**: Test profile switching with state isolation.

**Coverage**:

- Create multiple profiles
- Switch between profiles
- Verify state isolation
- Unsaved changes guard

**Duration**: ~3 minutes

---

### Scenario 08: Performance Benchmarks

**File**: `scenarios/08-performance.md`

**Objective**: Measure application performance against baseline targets.

**Coverage**:

- First Contentful Paint
- Bundle size analysis
- Time to Interactive
- Interaction responsiveness
- Network request analysis

**Duration**: ~5 minutes

---

## Total Suite Duration

Approximately **24 minutes** for complete suite execution.

## Success Metrics

- All scenarios pass verification checkpoints
- No critical console errors
- Performance metrics within baselines
- Data persistence confirmed

## Failure Handling

If a scenario fails:

1. Document the failure point
2. Capture screenshot of current state
3. Note console errors
4. Attempt to continue remaining scenarios if possible
5. Report all failures in summary

## Reporting

After running the suite, provide:

- Pass/fail status for each scenario
- Performance metric summary
- Any console errors or warnings
- Screenshots of failures
- Overall assessment of application health
