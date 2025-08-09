# Epic Story Refactoring Prompt

## Task

Refactor user stories in a MediaSpawner project epic file to follow best practices for AI implementation. This is a personal project - keep language practical and straightforward (not sales-y).

## Before You Start

**CRITICAL**: First analyze dependencies by reading:

- `@DESIGN_VISION.md` - Overall architecture
- `@PROJECT_EPICS.md` - Epic relationships
- Other `planning/EPIC_X_USER_STORIES.md` files referenced in your target epic

## Refactoring Rules

### 1. Break Down Large Stories

- Target **2-5 story points** per story (split anything larger)
- Separate concerns: UI display vs integration vs performance
- Split stories with 6+ acceptance criteria

### 2. Separate Technical Details

Move implementation details to separate technical tasks:

```markdown
**Technical Task MS-XX-T1**: [Task Name]

- [Technical implementation points]
- [Service integrations needed]
- [Error handling approach]
```

### 3. Focus on User Value

- Change "As a developer" to "As a user" when possible
- Focus on user outcomes, not implementation details
- Remove technical jargon from acceptance criteria

### 4. Use This Story Structure

```markdown
## Story X: [User Goal Title]

**Story ID**: MS-XX
**Priority**: [High/Medium/Low]
**Estimate**: [2-5 points]
**Status**: Not Started

**User Story**:
As a [user], I want [capability], so that [benefit].

**Acceptance Criteria**:

- [ ] [Testable user outcome 1]
- [ ] [Testable user outcome 2]
- [ ] [Testable user outcome 3]

**Technical Task MS-XX-T1**: [Implementation Detail]

- [Technical points]
- [Service integrations]
- [Error handling]

**Dependencies**: [List epic and story dependencies]
```

## Example Transformation

**Before:**

```markdown
**User Story**: As a developer, I want comprehensive form validation with real-time feedback and error state management, so that I can provide robust user input handling.

**Acceptance Criteria**:

- [ ] Real-time validation using Yup schema validation
- [ ] Integration with Epic 1's SpawnService validation methods
- [ ] Error state persistence across component re-renders
- [ ] Field-level validation with debounced input
- [ ] Form submission validation with comprehensive error display
- [ ] Integration with existing error handling patterns
- [ ] Proper TypeScript interfaces for validation schemas
```

**After:**

```markdown
**User Story**: As a user, I want clear feedback when I make input errors, so that I can quickly fix my spawn configuration.

**Acceptance Criteria**:

- [ ] Error messages appear immediately for invalid inputs
- [ ] Errors are clearly explained in plain language
- [ ] Form shows which fields need attention
- [ ] Can't save with validation errors
- [ ] Errors clear when I fix the issues

**Technical Task MS-XX-T1**: Implement Form Validation

- Use Yup schema validation with Epic 1's SpawnService methods
- Implement field-level validation with debounced input
- Add error state persistence and proper TypeScript interfaces
- Handle form submission validation with comprehensive error display
```

## Process

1. Read target epic file thoroughly
2. Analyze dependencies by checking other planning files
3. Refactor each story following the rules above
4. Update story dependencies when you split/renumber stories
5. Update dependency visualization at bottom of file
6. Double-check all cross-epic dependencies are preserved

## What to Preserve

- All technical integration points between epics
- Service dependencies (SpawnService, AssetService, etc.)
- Performance requirements and targets
- "Definition of Done" and validation checklists
- Critical success factors and notes sections

## Final Check

- Dependencies are accurate and complete
- Story points are 2-5 each
- User language is practical and clear
- Technical tasks provide implementation guidance
- All cross-epic integration points preserved
- Story numbering is sequential and consistent

**Target Epic**: [Specified by user]
