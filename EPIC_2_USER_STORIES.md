# Epic 2: Three-Panel Layout System - User Stories

## Epic Overview

**Epic**: Three-Panel Layout System  
**Priority**: 2 (Critical Path)  
**Status**: Not Started  

Build the core three-panel layout infrastructure with responsive design, panel state management, and header integration for spawn profile management.

---

## Story 1: Create Basic Three-Panel Layout Component

**Story ID**: MS-10  
**Priority**: High  
**Estimate**: 5 points  
**Status**: Not Started  

**User Story**:  
As a developer, I want a three-panel layout component with fixed proportions, so that I can provide consistent structure for spawn management workflow.

**Acceptance Criteria**:

- [ ] Three-panel layout: Left (25%), Center (50%), Right (25%)
- [ ] Responsive design for different desktop screen sizes (1280px+)
- [ ] Proper CSS Grid or Flexbox implementation
- [ ] Minimum and maximum panel widths enforced (prevent too narrow/wide)
- [ ] Clean, practical styling (minimal visual flourishes)
- [ ] Tailwind CSS integration
- [ ] Proper TypeScript props interface

**Technical Notes**:

- Use CSS Grid for precise panel control
- Target desktop resolutions: 1280px, 1440px, 1920px, ultrawide
- Ensure panels maintain usability at different desktop sizes
- Plan for future panel resizing (not implemented yet)

**Dependencies**: Epic 1 (types for routing context)

---

## Story 2: Implement Application Header with Profile Context

**Story ID**: MS-11  
**Priority**: High  
**Estimate**: 3 points  
**Status**: Not Started  

**User Story**:  
As a user, I want a header with spawn profile selector and context indicators, so that I always know which profile I'm working in and can switch profiles easily.

**Acceptance Criteria**:

- [ ] Header component with spawn profile selector dropdown
- [ ] Active profile indication (name/description)
- [ ] Profile actions: Create, Edit, Delete (placeholder buttons)
- [ ] Application title/branding
- [ ] Header layout optimized for desktop screens
- [ ] Clear visual hierarchy
- [ ] Integration with SpawnProfileService for active profile

**Technical Notes**:

- Use existing dropdown patterns from current app
- Profile selector should call SpawnProfileService.setActiveProfile()
- Consider breadcrumb space for future navigation context
- Keep header height consistent

**Dependencies**: Epic 1 (SpawnProfileService)

---

## Story 3: Create Panel State Management System

**Story ID**: MS-12  
**Priority**: High  
**Estimate**: 5 points  
**Status**: Not Started  

**User Story**:  
As a developer, I want centralized panel state management, so that panels can communicate selected spawn, profile context, and unsaved changes.

**Acceptance Criteria**:

- [ ] React Context for panel state (selected spawn, active profile, etc.)
- [ ] Panel communication system (spawn selection, profile changes)
- [ ] State persistence for selected spawn per profile
- [ ] Unsaved changes tracking across panels
- [ ] Clear state transitions when switching profiles
- [ ] TypeScript interfaces for all state objects
- [ ] Error handling for invalid state

**Technical Notes**:

- Use React Context + useReducer for complex state
- Consider localStorage for persisting selected spawn per profile
- Design state to support future features (multiple selection, etc.)
- Ensure state resets appropriately on profile switches

**Dependencies**: Epic 1 (Spawn/SpawnProfile types)

---

## Story 4: Update Routing for New Layout Structure

**Story ID**: MS-13  
**Priority**: Medium  
**Estimate**: 3 points  
**Status**: Not Started  

**User Story**:  
As a user, I want URL routing that reflects my current spawn profile and selected spawn, so that I can bookmark, share, and navigate back to specific states.

**Acceptance Criteria**:

- [ ] Route structure: `/profile/:profileId/spawn/:spawnId?`
- [ ] Default route redirects to active profile
- [ ] URL updates when profile or spawn selection changes
- [ ] Handle invalid profile/spawn IDs gracefully
- [ ] Browser back/forward button support
- [ ] URL reflects current application state
- [ ] Route protection for non-existent profiles/spawns

**Technical Notes**:

- Replace existing routing structure completely
- Use React Router v6 patterns
- Consider URL encoding for profile/spawn names vs IDs
- Integrate with panel state management system
- Handle edge cases (deleted profiles, empty profiles)

**Dependencies**: Epic 1 (SpawnProfileService, SpawnService)

---

## Story 5: Optimize Layout for Desktop Screen Variations

**Story ID**: MS-14  
**Priority**: Medium  
**Estimate**: 3 points  
**Status**: Not Started  

**User Story**:  
As a user, I want the layout to work well on different desktop screen sizes, so that I can manage spawns effectively on various desktop monitors and resolutions.

**Acceptance Criteria**:

- [ ] Support for common desktop resolutions (1280px, 1440px, 1920px+)
- [ ] Ultrawide monitor support (maintain panel proportions)
- [ ] Minimum window size handling (prevent unusable layouts)
- [ ] Panel content scaling for different screen densities
- [ ] Maintain 25%/50%/25% proportions across desktop sizes
- [ ] Test on common desktop screen sizes

**Technical Notes**:

- Use Tailwind responsive utilities for desktop breakpoints
- Focus on desktop-first approach (1280px minimum)
- Ensure text and UI elements scale appropriately
- Test with common desktop resolutions and browser zoom levels
- Consider high-DPI displays

**Dependencies**: Stories 1, 2, 3

---

## Story 6: Create Panel Placeholder Components

**Story ID**: MS-15  
**Priority**: Low  
**Estimate**: 2 points  
**Status**: Not Started  

**User Story**:  
As a developer, I want placeholder components for each panel, so that I can test the layout and demonstrate the structure before implementing full functionality.

**Acceptance Criteria**:

- [ ] Left panel placeholder: "Spawn List Coming Soon"
- [ ] Center panel placeholder: "Spawn Editor Coming Soon"  
- [ ] Right panel placeholder: "Asset Management Coming Soon"
- [ ] Placeholders show panel dimensions and boundaries
- [ ] Basic styling consistent with design vision
- [ ] Easy to replace with real components
- [ ] Props interface for future content injection

**Technical Notes**:

- Simple placeholder components with consistent styling
- Include panel titles and brief descriptions
- Use semantic HTML structure
- Prepare component slots for future real implementations
- Consider loading states or skeleton screens

**Dependencies**: Stories 1, 2, 3

---

## Story Dependencies

```text
Story 1 (Layout Component)
├── Story 2 (Header)
├── Story 3 (State Management)
│   ├── Story 4 (Routing)
│   └── Story 5 (Responsive Design)
└── Story 6 (Placeholders) [depends on all above]
```

## Definition of Done

Each story is complete when:

- [ ] Component implemented and peer reviewed
- [ ] Responsive design tested on multiple screen sizes
- [ ] TypeScript compilation clean (no errors)
- [ ] Integration with Epic 1 services works
- [ ] State management functions correctly
- [ ] URL routing works as expected
- [ ] Visual consistency with design vision
- [ ] Ready for panel content integration (Epics 3, 4, 5)

## Vision Validation Checklist

- [ ] Three-panel layout (25% / 50% / 25%) ✓ (Story 1)
- [ ] Header with spawn profile selector ✓ (Story 2)
- [ ] Panel state management for spawn selection ✓ (Story 3)
- [ ] Desktop-optimized design for practical use ✓ (Stories 1, 5)
- [ ] Routing supports spawn-centric workflow ✓ (Story 4)
- [ ] Foundation for future panel interactions ✓ (Stories 3, 6)
- [ ] Clean, uncluttered interface ✓ (All stories)

## Technical Standards

- **Layout**: CSS Grid or Flexbox, desktop-optimized design
- **State**: React Context + useReducer pattern
- **Routing**: React Router v6 with proper state integration
- **Styling**: Tailwind CSS, desktop-first approach
- **TypeScript**: Strict mode, proper interfaces for all props/state
- **Testing**: Desktop layout testing, state management validation

## Integration Points with Future Epics

- **Epic 3**: Left panel component slot ready
- **Epic 4**: Center panel component slot ready  
- **Epic 5**: Right panel component slot ready
- **Epic 6**: Header profile management integration ready

## Notes

- Focus on structural foundation over visual polish
- Ensure layout supports spawn-centric workflow from Epic 1
- Design state management to accommodate future bulk operations
- Keep routing simple but extensible for future features
- Test thoroughly on different desktop screen sizes for practical usability
