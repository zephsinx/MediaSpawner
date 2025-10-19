# Scenario 08: Performance Benchmarks

## Objective

Measure application performance against baseline targets and validate optimization improvements.

## Prerequisites

- Application running at `http://localhost:4173`
- Clean browser state (clear cache, no extensions interfering)
- Incognito/private mode recommended
- At least one profile with moderate data (2-3 spawns, 3-5 assets)
- Production preview server not under load
- No browser throttling enabled

## Important Notes

- Run this scenario FIRST for most accurate baseline measurements
- Run each test 3 times and report median values
- Note any significant outliers
- Results vary by machine specs - compare against relative targets

## Steps

### 1. Clear Browser State

**Action**:

```javascript
evaluate_script(() => {
  localStorage.clear();
  sessionStorage.clear();
  return { cleared: true };
});
```

**Expected**:

- Storage cleared successfully
- Fresh start for performance testing

### 2. Setup Test Profile

**Action**:

1. Navigate to application
2. Create profile "Performance Test Profile"
3. Create 2 spawns with 3 assets each
4. Return to home screen
5. Refresh page to measure cold start

**Expected**:

- Test data created
- Application in typical user state

---

## Test 1: First Contentful Paint (FCP)

### 3. Start Performance Trace

**Action**:

```javascript
performance_start_trace(reload: true, autoStop: false)
```

**Expected**:

- Trace recording begins
- Page reloads automatically
- Trace captures initial load

### 4. Wait for Application Load

**Action**: `wait_for(text: "MediaSpawner", timeout: 5000)`

**Expected**:

- Application renders
- Header visible

### 5. Stop Performance Trace

**Action**: `performance_stop_trace()`

**Expected**:

- Trace data returned with metrics

### 6. Analyze FCP Metric

**Action**: Review trace results for First Contentful Paint

**Expected**:

- FCP value in milliseconds
- Target: < 500ms
- Baseline: ~472ms
- Pass: ≤ 500ms
- Warn: 450-500ms
- Fail: > 500ms

### 7. Check for Performance Insights

**Action**: If insights available, review for issues

**Expected**:

- No critical performance warnings
- Layout shifts minimal
- Blocking resources optimized

---

## Test 2: Bundle Size Analysis

### 8. List Network Requests

**Action**:

```javascript
list_network_requests(resourceTypes: ["script"])
```

**Expected**:

- List of JavaScript file requests
- Each request shows transfer size

### 9. Identify Main Bundle

**Action**: Find main bundle file (typically `index-[hash].js`)

**Expected**:

- Main bundle identified
- Transfer size visible

### 10. Verify Main Bundle Size

**Action**: Check transfer size of main bundle

**Expected**:

- Target: < 420KB
- Baseline: 408KB
- Pass: ≤ 420KB
- Warn: 400-420KB
- Fail: > 420KB

### 11. Calculate Total JavaScript Size

**Action**: Sum transfer sizes of all script resources

**Expected**:

- Total JS size calculated
- Target: < 650KB
- Pass: ≤ 650KB
- Warn: 600-650KB
- Fail: > 650KB

### 12. Identify Lazy-Loaded Chunks

**Action**: Look for chunk files (e.g., `Layout-[hash].js`, `SpawnEditor-[hash].js`)

**Expected**:

- Multiple chunk files present (indicates code splitting)
- Layout chunk: ~25-50KB
- SpawnEditor chunk: ~150-200KB
- Asset Management chunk: ~40-80KB

---

## Test 3: Time to Interactive (TTI)

### 13. Reload and Measure Interaction Time

**Action**:

1. Start performance trace with reload
2. After page loads, wait for spawns list
3. Measure time from navigation start to interactive

**Expected**:

- TTI from trace results
- Target: < 1000ms (1 second)
- Pass: ≤ 1000ms
- Warn: 900-1000ms
- Fail: > 1000ms

### 14. Verify UI Responsiveness

**Action**: Check trace for long tasks and blocking periods

**Expected**:

- No tasks > 50ms during initial load
- Main thread not blocked excessively
- User can interact quickly after visual render

---

## Test 4: Spawn Selection Performance

### 15. Navigate to Application

**Action**: Ensure application loaded with spawns visible

**Expected**:

- At least 2 spawns in list

### 16. Measure Spawn Selection Time

**Action**:

```javascript
evaluate_script(() => {
  const startTime = performance.now();

  // Find and click spawn item
  const spawnItem = document.querySelector(
    '[role="listbox"] > div:first-child',
  );
  if (spawnItem) {
    spawnItem.click();

    // Wait for selection indicator to appear
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        const endTime = performance.now();
        resolve({
          duration: endTime - startTime,
          spawnsFound: true,
        });
      });
    });
  }

  return { spawnsFound: false };
});
```

**Expected**:

- Measurement captured
- Target: < 100ms
- Pass: ≤ 100ms
- Warn: 80-100ms
- Fail: > 100ms

---

## Test 5: Asset Assignment Performance

### 17. Setup Asset Assignment Test

**Action**:

1. Navigate to application
2. Select spawn
3. Ensure right panel shows asset library

**Expected**:

- Spawn selected
- Asset library visible

### 18. Measure Asset Add Operation

**Action**:

```javascript
evaluate_script(() => {
  const startTime = performance.now();

  // Find add asset button (adjust selector as needed)
  const addButton = document.querySelector('[aria-label*="Add"]');
  if (addButton) {
    addButton.click();

    // Measure until DOM updates
    const observer = new MutationObserver(() => {
      const endTime = performance.now();
      observer.disconnect();
      return { duration: endTime - startTime };
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // Timeout fallback
    setTimeout(() => {
      observer.disconnect();
      const endTime = performance.now();
      return { duration: endTime - startTime, timeout: true };
    }, 1000);
  }

  return { addButtonFound: false };
});
```

**Expected**:

- Measurement captured
- Target: < 200ms
- Pass: ≤ 200ms
- Warn: 150-200ms
- Fail: > 200ms

---

## Test 6: Form Save Performance

### 19. Setup Form Save Test

**Action**:

1. Select spawn with editable form
2. Make small change to field
3. Prepare to click save

**Expected**:

- Form editable
- Save button enabled

### 20. Measure Save Operation

**Action**:

```javascript
evaluate_script(() => {
  const startTime = performance.now();

  // Find save button
  const saveButton = document.querySelector(
    '[aria-label*="Save"], button[type="submit"]',
  );
  if (saveButton) {
    saveButton.click();

    // Wait for success indicator or form close
    return new Promise((resolve) => {
      const observer = new MutationObserver((mutations) => {
        // Look for toast notification or success message
        if (
          document.body.textContent.includes("success") ||
          document.body.textContent.includes("saved")
        ) {
          const endTime = performance.now();
          observer.disconnect();
          resolve({ duration: endTime - startTime });
        }
      });

      observer.observe(document.body, { childList: true, subtree: true });

      // Timeout after 1 second
      setTimeout(() => {
        observer.disconnect();
        const endTime = performance.now();
        resolve({ duration: endTime - startTime, timeout: true });
      }, 1000);
    });
  }

  return { saveButtonFound: false };
});
```

**Expected**:

- Measurement captured
- Target: < 300ms
- Pass: ≤ 300ms
- Warn: 250-300ms
- Fail: > 300ms

---

## Test 7: Memory Usage

### 21. Measure Memory Footprint

**Action**:

```javascript
evaluate_script(() => {
  if (performance.memory) {
    return {
      usedJSHeapSize: Math.round(
        performance.memory.usedJSHeapSize / 1024 / 1024,
      ),
      totalJSHeapSize: Math.round(
        performance.memory.totalJSHeapSize / 1024 / 1024,
      ),
      jsHeapSizeLimit: Math.round(
        performance.memory.jsHeapSizeLimit / 1024 / 1024,
      ),
    };
  }
  return { memoryAPINotAvailable: true };
});
```

**Expected**:

- Memory measurements in MB
- Used heap target: < 50MB
- Pass: < 50MB
- Warn: 40-50MB
- Fail: > 50MB

---

## Test 8: Network Request Count

### 22. Reload and Count Requests

**Action**:

1. Clear network log
2. Reload page
3. Wait for full load
4. `list_network_requests()`

**Expected**:

- Request list returned

### 23. Analyze Request Count

**Action**: Count total requests

**Expected**:

- Target: < 15 requests
- Pass: ≤ 15 requests
- Warn: 12-15 requests
- Fail: > 15 requests

### 24. Verify No External Requests

**Action**: Check all requests are to localhost

**Expected**:

- All requests to `http://localhost:4173`
- No external API calls
- No analytics or tracking requests
- LocalStorage-only architecture confirmed

---

## Test 9: Console Error Check

### 25. Check Console Messages

**Action**: `list_console_messages()`

**Expected**:

- No error messages
- No critical warnings
- Development warnings acceptable (React dev mode)

---

## Test 10: Regression Detection

### 26. Compare Against Baselines

**Action**: Calculate percentage change from baseline for each metric

**Expected results**:

| Metric           | Baseline | Target   | Result | Status | % Change |
| ---------------- | -------- | -------- | ------ | ------ | -------- |
| FCP              | 472ms    | < 500ms  | [X]ms  | [?]    | [?]%     |
| Main Bundle      | 408KB    | < 420KB  | [X]KB  | [?]    | [?]%     |
| Total JS         | ~600KB   | < 650KB  | [X]KB  | [?]    | [?]%     |
| TTI              | ~850ms   | < 1000ms | [X]ms  | [?]    | [?]%     |
| Spawn Selection  | ~65ms    | < 100ms  | [X]ms  | [?]    | [?]%     |
| Asset Assignment | ~145ms   | < 200ms  | [X]ms  | [?]    | [?]%     |
| Memory Footprint | ~40MB    | < 50MB   | [X]MB  | [?]    | [?]%     |

**Regression thresholds**:

- Critical (>20%): Block release, investigate immediately
- Warning (10-20%): Investigate before release
- Minor (<10%): Monitor trend

---

## Test 11: Compare Before/After Optimization

### 27. Document Improvement Since Optimization

**Action**: Reference PERFORMANCE_BASELINES.md for historical comparison

**Expected**:

- Confirm current performance maintains optimization gains:
  - FCP: 93% improvement (7088ms → 472ms)
  - Bundle: 17% reduction (490KB → 408KB)
  - Code splitting implemented
  - Lazy loading active

---

## Success Criteria

- [ ] FCP < 500ms
- [ ] Main bundle < 420KB
- [ ] Total JS < 650KB
- [ ] TTI < 1000ms
- [ ] Spawn selection < 100ms
- [ ] Asset assignment < 200ms
- [ ] Form save < 300ms
- [ ] Memory usage < 50MB
- [ ] Request count < 15
- [ ] No console errors
- [ ] No regressions > 10% from baseline

## Performance Report Template

```markdown
# Performance Test Results

Date: [YYYY-MM-DD]
Time: [HH:MM]
Environment: [Browser] [Version] on [OS]
Test Run: [1/2/3] (Median of 3 runs)

## Core Web Vitals

- First Contentful Paint: [X]ms (Target: < 500ms) [PASS/WARN/FAIL]
- Time to Interactive: [X]ms (Target: < 1000ms) [PASS/WARN/FAIL]

## Bundle Analysis

- Main Bundle: [X]KB (Target: < 420KB) [PASS/WARN/FAIL]
- Total JavaScript: [X]KB (Target: < 650KB) [PASS/WARN/FAIL]
- Lazy Chunks: [X] chunks identified

## Interaction Performance

- Spawn Selection: [X]ms (Target: < 100ms) [PASS/WARN/FAIL]
- Asset Assignment: [X]ms (Target: < 200ms) [PASS/WARN/FAIL]
- Form Save: [X]ms (Target: < 300ms) [PASS/WARN/FAIL]

## Resource Usage

- Memory Footprint: [X]MB (Target: < 50MB) [PASS/WARN/FAIL]
- Network Requests: [X] requests (Target: < 15) [PASS/WARN/FAIL]

## Console Health

- Errors: [X]
- Warnings: [X]
- Info: [X]

## Overall Status: [PASS/WARN/FAIL]

### Notes:

[Any observations, anomalies, or context]

### Regressions:

[List any metrics that regressed > 10%]

### Recommendations:

[Any suggested optimizations or investigations]
```

## Common Issues

- **High variability between runs**: Clear cache between runs, close other applications
- **FCP slower than expected**: Check for blocking resources, verify lazy loading working
- **Large bundle size**: Check for unintentional imports, verify tree shaking
- **Memory leaks**: Check for event listeners not cleaned up, verify component unmounting
- **Slow interactions**: Check for unnecessary re-renders, verify React.memo usage
