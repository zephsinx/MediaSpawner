# Performance Baselines

This document defines the performance targets for MediaSpawner based on recent optimization work.

## Context

MediaSpawner underwent significant performance optimization in early 2025, achieving a 93% improvement in First Contentual Paint through code splitting and initialization pattern improvements. These baselines reflect the post-optimization targets.

## Core Web Vitals

### First Contentful Paint (FCP)

**Target**: < 500ms
**Current**: 472ms
**Measurement**: Time until first content renders

**How to measure**:

```text
1. Start trace: performance_start_trace(reload: true, autoStop: false)
2. Wait for page load
3. Stop trace: performance_stop_trace()
4. Check FCP in trace results
```

**Pass criteria**: FCP ≤ 500ms
**Warning threshold**: FCP > 450ms (within target but approaching limit)
**Fail**: FCP > 500ms

---

### Time to Interactive (TTI)

**Target**: < 1000ms (1 second)
**Measurement**: Time until page is fully interactive

**How to measure**:
From performance trace results, check TTI or measure:

```text
1. Start timer when navigation begins
2. Wait for: wait_for(text: "Spawns")
3. Try interaction: click spawn list item
4. Stop timer when interaction completes
```

**Pass criteria**: TTI ≤ 1000ms
**Warning threshold**: TTI > 900ms
**Fail**: TTI > 1000ms

---

## Bundle Size Metrics

### Main Bundle

**Target**: < 420KB (compressed)
**Current**: 408KB

**How to measure**:

```text
1. Navigate to page
2. List network requests: list_network_requests(resourceTypes: ["script"])
3. Find main bundle (index-[hash].js)
4. Check transfer size
```

**Pass criteria**: Main bundle ≤ 420KB
**Warning threshold**: > 400KB
**Fail**: > 420KB

---

### Total JavaScript

**Target**: < 650KB (compressed, all chunks)
**Measurement**: Sum of all JavaScript files loaded

**How to measure**:

```text
1. Navigate and wait for full load
2. List all script requests
3. Sum transfer sizes
```

**Pass criteria**: Total JS ≤ 650KB
**Warning threshold**: > 600KB
**Fail**: > 650KB

---

## Interaction Performance

### Spawn Selection

**Target**: < 100ms response time
**Measurement**: Time from click to UI update

**How to measure**:

```text
1. Take snapshot
2. Record timestamp
3. Click spawn item
4. Wait for selection indicator
5. Record timestamp
6. Calculate delta
```

**Pass criteria**: ≤ 100ms
**Warning threshold**: > 80ms
**Fail**: > 100ms

---

### Asset Assignment

**Target**: < 200ms response time
**Measurement**: Time from click to asset appearing in spawn

**How to measure**:

```text
1. Take snapshot
2. Record timestamp
3. Click "Add to Spawn" or similar action
4. Wait for asset chip to appear
5. Record timestamp
6. Calculate delta
```

**Pass criteria**: ≤ 200ms
**Warning threshold**: > 150ms
**Fail**: > 200ms

---

### Form Save

**Target**: < 300ms response time
**Measurement**: Time from save button click to success indicator

**How to measure**:

```text
1. Take snapshot
2. Record timestamp
3. Click Save button
4. Wait for success toast or confirmation
5. Record timestamp
6. Calculate delta
```

**Pass criteria**: ≤ 300ms
**Warning threshold**: > 250ms
**Fail**: > 300ms

---

## Network Performance

### Request Count (Initial Load)

**Target**: < 15 requests
**Measurement**: Number of network requests on first page load

**How to measure**:

```text
1. Navigate to page
2. Wait for load complete
3. List network requests: list_network_requests()
4. Count total requests
```

**Pass criteria**: ≤ 15 requests
**Warning threshold**: > 12 requests
**Fail**: > 15 requests

---

### API Response Time

**Target**: < 50ms (localStorage operations)
**Measurement**: Time for data fetch operations

**Note**: MediaSpawner uses localStorage, not network APIs, so this should be very fast.

**Pass criteria**: ≤ 50ms
**Warning threshold**: > 30ms
**Fail**: > 50ms

---

## Memory Performance

### Initial Memory Footprint

**Target**: < 50MB
**Measurement**: JavaScript heap size after initial load

**How to measure**:

```javascript
evaluate_script(() => {
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize / 1024 / 1024,
      totalJSHeapSize: performance.memory.totalJSHeapSize / 1024 / 1024,
    };
  }
  return null;
});
```

**Pass criteria**: < 50MB
**Warning threshold**: > 40MB
**Fail**: > 50MB

---

## Performance Test Strategy

### Test Execution Order

1. **Run performance tests first** with clean browser state
2. Clear cache and localStorage before testing
3. Run tests in incognito/private mode
4. Use consistent network conditions (local dev server, no throttling)

### Multiple Runs

- Run each performance test 3 times
- Use median value for comparison
- Report outliers separately

### Environment Consistency

- Same machine specs
- Same browser version
- No other tabs or applications interfering
- Dev server not under load

### Reporting Format

```markdown
Performance Test Results
Date: YYYY-MM-DD
Environment: [browser, version, OS]

| Metric           | Target   | Actual | Status | Notes |
| ---------------- | -------- | ------ | ------ | ----- |
| FCP              | < 500ms  | 472ms  | PASS   |       |
| TTI              | < 1000ms | 850ms  | PASS   |       |
| Main Bundle      | < 420KB  | 408KB  | PASS   |       |
| Spawn Selection  | < 100ms  | 65ms   | PASS   |       |
| Asset Assignment | < 200ms  | 145ms  | PASS   |       |

Overall: PASS (5/5 metrics within targets)
```

---

## Optimization History

### January 2025 - Code Splitting & Initialization

- **Before**: FCP 7088ms, Main bundle 490KB
- **After**: FCP 472ms, Main bundle 408KB
- **Improvement**: 93% faster FCP, 17% smaller bundle

**Key changes**:

- Lazy loading of Layout, SpawnEditor, AssetManagement panels
- Removed blocking initialization hook
- Deferred UI providers (Tooltip, Toaster) to Layout level
- Inline script for theme application

---

## Regression Indicators

If tests show degradation:

**Critical** (>20% regression):

- Immediate investigation required
- Block release until resolved

**Warning** (10-20% regression):

- Investigate before release
- Document reason if acceptable

**Minor** (<10% regression):

- Monitor trend
- Address in future optimization cycle
