# Test Writing and Fixing Guide

## When writing or fixing tests for a component, follow this process

---

**When working on tests for [COMPONENT_NAME], follow this process:**

### Step 0: Validate Component Correctness (CRITICAL)

**BEFORE making any test changes, you MUST:**

1. **State what the component SHOULD do** - Based on requirements, user stories, or expected behavior
2. **State what the component ACTUALLY does** - Based on code analysis, not assumptions
3. **Identify any discrepancies** - Are there mismatches between intended and actual behavior?
4. **Make a decision** - If there's a mismatch, fix the component first. Only modify tests if you've verified the component behavior is correct
5. **Explain your reasoning** - "I'm fixing the test because [specific evidence]" or "I'm fixing the component because [specific evidence]"

### Step 1: Understand the Component

1. **Read the component code** - Show me what the component actually does
2. **Identify the key behaviors** - What are the main functions and user interactions?
3. **Check for async patterns** - Does the component use async/await, loading states, or promises?
4. **Note the props and state** - What data does it receive and manage internally?

### Step 2: Understand the Requirements

1. **Review the user story/requirements** - What functionality should be tested?
2. **List the acceptance criteria** - What specific behaviors need validation?
3. **Identify edge cases** - What error conditions or unusual scenarios should be covered?

### Step 3: Analyze Current Tests (if fixing)

1. **Show me the current test structure** - What's already being tested?
2. **Identify the gap** - What's the component doing vs what tests expect?
3. **Explain the real issue** - Don't just list TypeScript errors, explain why they're happening
4. **Validate against requirements** - Do the tests actually validate the required functionality?

### Step 4: Propose Test Strategy

1. **List the test categories needed** - Unit tests, integration tests, user interaction tests, etc.
2. **Explain what each test validates** - How does it relate to the requirements?
3. **Show the test structure** - How will you organize the tests?
4. **Address any concerns** - What might be tricky to test and how will you handle it?

### Step 5: Implementation Plan

1. **Show me the specific changes needed** - Which files, which functions, which assertions?
2. **Explain the testing approach** - Will you use mocks, real data, async testing patterns?
3. **Validate the plan** - Does this actually test the component's real behavior?

### Step 6: Implementation

1. **Make the changes** - Implement the tests
2. **Explain what you changed and why** - Don't just show code, explain the reasoning
3. **Validate the results** - Run the tests and show the output

---

## Decision Framework for Test vs Component Fixes

**Fix the COMPONENT if:**

- Tests reveal the component doesn't implement required functionality
- Component behavior doesn't match documented requirements
- Tests fail with clear, logical expectations that the component should meet
- Component has obvious bugs or incorrect logic

**Fix the TESTS if:**

- Component behavior is correct but tests have wrong expectations
- Tests are testing implementation details rather than behavior
- Tests have syntax errors or incorrect test patterns
- Component works as intended but tests are poorly written

**Always provide evidence for your decision.**

---

## Rabbit Hole Prevention

**When fixing issues:**

1. **Define your original goal clearly** - What problem are you solving?
2. **Set boundaries** - "Only fix the specific error mentioned, ignore unrelated linter warnings"
3. **After each fix, ask** - "Does this solve the original problem?"
4. **If you're fixing unrelated errors** - Stop and reassess. Don't get sidetracked.

---

## Key Questions to Ask

- **"What does the component actually do?"** - Force analysis of real behavior
- **"How does this test relate to the requirements?"** - Ensure tests validate real functionality
- **"What's the real issue here?"** - Don't just fix errors, understand the root cause
- **"Does this test the actual user experience?"** - Focus on behavior, not just technical implementation
- **"Am I assuming the component is correct?"** - Question your assumptions
- **"Could this test failure indicate a component bug?"** - Consider both possibilities

## Red Flags to Watch For

- **Jumping straight to fixing errors** without understanding the component
- **Making multiple conflicting plans** - indicates poor initial analysis
- **Focusing on "making tests pass"** rather than testing real behavior
- **Not checking the component code first** - always understand what you're testing
- **Ignoring async patterns** - many components use async behavior intentionally
- **Fixing errors without understanding the original problem** - rabbit hole behavior
- **Making assumptions about correctness** - always validate with evidence

## Example Usage

**Instead of:** "Fix the failing tests in SpawnListItem.test.tsx"

**Use:** "I need you to fix the failing tests in SpawnListItem.test.tsx. First, validate whether the component behavior is correct by comparing it to requirements. Then explain what the tests are trying to do vs what the component does. Finally, propose a solution that tests the real component behavior."

---

## Remember

- **Always validate component correctness first**
- **Test real behavior, not just technical implementation**
- **Validate against actual requirements**
- **Explain your reasoning with evidence, don't just show code**
- **Focus on user experience, not just error-free code**
- **Question your assumptions about what's 'right'**
- **Keep track of your original goal**
