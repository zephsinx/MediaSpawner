# E2E Test Recommendation Guide

This guide provides simple instructions for creating recommendation documents after running e2e test scenarios.

## File Naming Convention

Create recommendation files in the `results/` folder using this pattern:

- `01-first-time-user-recommendations.md`
- `02-asset-library-recommendations.md`
- `03-spawn-creation-recommendations.md`
- etc.

## Document Structure

Each recommendation document should follow this structure:

### 1. Header Section

```markdown
# E2E Test Results: Scenario [XX] - [Scenario Name]

**Test Date**: [Current Date]
**Test Environment**: [Environment Details]
**Test Status**: ✅ PASSED / ❌ FAILED
```

### 2. Executive Summary

Brief 2-3 sentence overview of test results and key findings.

### 3. Recommendations Section

Focus on **specific, actionable issues** rather than ongoing monitoring:

```markdown
## Recommendations

### 1. [Issue Title]

**Issue**: [Specific problem description]
**Location**: [Where the issue occurs]
**Severity**: [Low/Medium/High] ([breaking/non-breaking])
**Impact**: [What this affects]

**Recommendation**:

- [Specific action to take]
- [Implementation details]
- [Expected outcome]

**Priority**: [Low/Medium/High]
**Effort**: [Time estimate]
```

### 4. Test Metrics Summary

Include performance data and test results:

```markdown
## Test Metrics Summary

| Metric   | Target   | Actual   | Status |
| -------- | -------- | -------- | ------ |
| [Metric] | [Target] | [Actual] | ✅/❌  |
```

### 5. Key Findings

List positive findings and areas for improvement.

### 6. Conclusion

Overall assessment with readiness status.

## Recommendation Guidelines

### Do Include

- **Specific issues** with clear impact
- **Actionable solutions** with implementation details
- **Priority levels** and effort estimates
- **Performance metrics** that exceed/fail targets
- **Console errors** or warnings found
- **User experience issues** that need addressing

### Don't Include

- **"Continue monitoring"** recommendations
- **"Ongoing maintenance"** suggestions
- **Features that already exist** in the application
- **Vague improvements** without specific issues
- **Performance monitoring** unless there are actual problems

## Example Recommendation

```markdown
### 1. Form Validation Enhancement

**Issue**: Windows file paths rejected by validation
**Location**: Asset creation form validation
**Severity**: Low (non-breaking)
**Impact**: Users cannot use local Windows file paths

**Recommendation**:

- Enhance path validation to support Windows file path formats
- Add support for both local file paths and URLs
- Provide clear validation messages for unsupported formats

**Priority**: Medium
**Effort**: Medium
```

## Quality Checklist

Before finalizing recommendations:

- [ ] Are all recommendations specific and actionable?
- [ ] Do recommendations address actual issues found during testing?
- [ ] Are priority levels appropriate for the impact?
- [ ] Do effort estimates seem reasonable?
- [ ] Are there any recommendations for features that already exist?
- [ ] Do recommendations focus on improvements rather than ongoing monitoring?

## Notes

- Recommendations should help prioritize development work
- Focus on user-facing issues and performance problems
- Avoid redundant suggestions for features already implemented
- Keep recommendations concise and actionable
