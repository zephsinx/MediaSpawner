# MediaSpawner E2E Regression Tests

This directory contains end-to-end regression test scenarios designed to be executed by AI agents using chrome-devtools MCP (Model Context Protocol) tools.

## Purpose

These tests validate critical user workflows and performance benchmarks for MediaSpawner. They complement the existing Vitest unit test suite by focusing on complete user journeys through the application.

## Prerequisites

Before running tests:

1. **Production preview server must be running**

   ```bash
   npm run preview
   ```

   Server should be accessible at `http://localhost:4173`

2. **Clean state**
   - Tests assume a fresh localStorage state
   - Clear browser storage before running: `localStorage.clear()` in console
   - Or use incognito/private browsing mode

3. **Chrome DevTools MCP**
   - AI agent must have access to chrome-devtools MCP server
   - Supported MCP tools documented below

## MCP Tools Reference

The following chrome-devtools MCP tools are used in test scenarios:

### Navigation

- `navigate_page(url: string)` - Navigate to a URL
- `navigate_page_history(navigate: "back" | "forward")` - Navigate browser history

### Page Inspection

- `take_snapshot()` - Capture page structure with element UIDs for interaction
- `take_screenshot(filePath?: string, fullPage?: boolean)` - Capture visual screenshot
- `wait_for(text: string, timeout?: number)` - Wait for text to appear on page

### Interaction

- `click(uid: string)` - Click an element by UID from snapshot
- `fill(uid: string, value: string)` - Fill input or select element
- `fill_form(elements: Array<{uid, value}>)` - Fill multiple form fields at once
- `hover(uid: string)` - Hover over an element

### Performance

- `performance_start_trace(reload: boolean, autoStop: boolean)` - Start performance trace
- `performance_stop_trace()` - Stop trace and get metrics
- `performance_analyze_insight(insightName: string)` - Get detailed insight analysis
- `list_network_requests(resourceTypes?: string[])` - List network requests

### Debugging

- `list_console_messages()` - Get console output
- `evaluate_script(function: string, args?: any[])` - Run JavaScript in page context

## Test Execution Pattern

Each test scenario follows this general pattern:

1. **Setup**: Navigate to page and verify initial state
2. **Action**: Perform user interactions
3. **Verification**: Check expected outcomes
4. **Cleanup**: Note any state changes for next test

### Example Execution Flow

```markdown
1. Navigate to application
   - Tool: navigate_page(url: "http://localhost:4173")
   - Expected: Page loads successfully

2. Wait for app to render
   - Tool: wait_for(text: "MediaSpawner")
   - Expected: Header appears with app title

3. Take snapshot to identify elements
   - Tool: take_snapshot()
   - Expected: Snapshot contains interactive elements with UIDs

4. Click element
   - Tool: click(uid: "[uid-from-snapshot]")
   - Expected: UI responds to interaction

5. Verify outcome
   - Tool: wait_for(text: "Expected Result")
   - Expected: Success message or state change
```

## Pass/Fail Criteria

### Success Indicators

- Expected text appears on page
- UI elements in correct state (enabled/disabled, visible/hidden)
- No console errors related to application logic
- Performance metrics meet baseline targets
- Data persists correctly in localStorage

### Failure Indicators

- Expected elements not found
- Console errors or warnings
- Performance metrics exceed baseline thresholds
- Data loss or corruption
- UI unresponsive or broken

## Performance Baselines

See `PERFORMANCE_BASELINES.md` for current performance targets. Tests should verify:

- First Contentful Paint (FCP) < 500ms
- Main bundle size < 420KB
- Time to Interactive (TTI) < 1s
- UI interactions respond < 200ms

## Test Suite Organization

- `TEST_SUITE.md` - Index of all test scenarios
- `scenarios/` - Individual test scenario files
  - `01-first-time-user.md` - Profile creation workflow
  - `02-asset-library.md` - Asset management operations
  - `03-spawn-creation.md` - Spawn creation and configuration
  - `04-asset-assignment.md` - Adding assets to spawns
  - `05-randomization-buckets.md` - Bucket configuration
  - `06-configuration-export.md` - Export functionality
  - `07-profile-switching.md` - Profile switching workflow
  - `08-performance.md` - Performance benchmarks

## Running Tests

AI agents should:

1. Read the scenario file
2. Execute each step using MCP tools
3. Verify expected outcomes
4. Report actual vs expected results
5. Note any deviations or failures

Tests can be run individually or as a complete suite. Each scenario is designed to be independent.

## Notes for AI Agents

- Element UIDs from `take_snapshot()` are temporary and change between snapshots
- Always take a fresh snapshot before interacting with elements
- Use `wait_for()` to ensure async operations complete
- Performance tests should run first to establish clean baseline
- Report unexpected console errors even if test otherwise passes
- Include screenshots for visual verification when helpful
