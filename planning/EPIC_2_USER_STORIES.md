# Epic 2: Three-Panel Layout System - User Stories

## Epic Overview

**Epic**: Three-Panel Layout System
**Priority**: 2 (Critical Path)
**Status**: Not Started

Build the core three-panel layout infrastructure with responsive design, panel state management, and header integration for spawn profile management.

---

## Story 1: Navigate with Three-Panel Workspace

**Story ID**: MS-10
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want a three-panel workspace layout, so that I can see my spawn list, configuration workspace, and asset management in organized sections.

**Acceptance Criteria**:

- [ ] Can see three distinct workspace areas side by side
- [ ] Left area shows spawn navigation (25% width)
- [ ] Center area provides configuration workspace (50% width)
- [ ] Right area handles asset management (25% width)
- [ ] Layout works well on different desktop screen sizes
- [ ] Panels maintain usable proportions and don't become too narrow
- [ ] Interface has clean, practical styling without visual clutter

**Technical Task MS-10-T1**: Implement Three-Panel Layout Infrastructure

- Create three-panel layout: Left (25%), Center (50%), Right (25%)
- Use CSS Grid or Flexbox for precise panel control
- Target desktop resolutions: 1280px, 1440px, 1920px, ultrawide
- Implement minimum and maximum panel widths
- Prepare center panel for unified configuration workspace (dual-mode capability)
- Prepare right panel for dynamic two-section layout
- Integrate Tailwind CSS with proper TypeScript props interface
- Plan infrastructure for future panel resizing

**Dependencies**: Epic 1 (types for routing context)

---

## Story 2: Switch Between Spawn Profiles

**Story ID**: MS-11
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want a header with spawn profile selector and context indicators, so that I always know which profile I'm working in and can switch profiles easily.

**Acceptance Criteria**:

- [ ] Can see which spawn profile is currently active
- [ ] Can switch between different spawn profiles from dropdown
- [ ] Header shows profile name and description clearly
- [ ] Can access profile management actions (create, edit, delete)
- [ ] Application title and branding are visible
- [ ] Header layout works well on desktop screens
- [ ] Profile switching updates my workspace context appropriately

**Technical Task MS-11-T1**: Implement Profile Header Component

- Create header component with spawn profile selector dropdown
- Integrate with SpawnProfileService for active profile management
- Add profile actions: Create, Edit, Delete (placeholder buttons)
- Use existing dropdown patterns from current app
- Implement SpawnProfileService.setActiveProfile() calls
- Optimize header layout for desktop screens with clear visual hierarchy
- Consider breadcrumb space for future navigation context

**Dependencies**: Epic 1 (SpawnProfileService)

---

## Story 3: Maintain Context Across Panels

**Story ID**: MS-12
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want my selections and context maintained across the workspace, so that panels stay coordinated when I switch profiles, select spawns, or make changes.

**Acceptance Criteria**:

- [ ] Selected spawn stays consistent across all panels
- [ ] Profile switching resets context appropriately
- [ ] Unsaved changes are tracked across the workspace
- [ ] Panel coordination works smoothly (spawn selection affects other panels)
- [ ] My last selected spawn is remembered for each profile
- [ ] Context switching feels responsive and predictable
- [ ] Workspace handles invalid selections gracefully

**Technical Task MS-12-T1**: Implement Panel State Management System

- Create React Context for panel state (selected spawn, active profile, etc.)
- Implement panel communication system (spawn selection, profile changes)
- Add state persistence for selected spawn per profile using localStorage
- Build unsaved changes tracking across panels
- Create center panel mode state management (spawn settings vs asset settings modes)
- Ensure clear state transitions when switching profiles
- Add TypeScript interfaces for all state objects including center panel modes
- Include error handling for invalid state
- Design state to support future features (multiple selection, etc.)
- Prepare state structure for future right panel dynamic sections

**Dependencies**: Epic 1 (Spawn/SpawnProfile types)

---

## Story 4: Navigate with Bookmarkable URLs

**Story ID**: MS-13
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want URL routing that reflects my current spawn profile and selected spawn, so that I can bookmark, share, and navigate back to specific states.

**Acceptance Criteria**:

- [ ] URL shows which profile and spawn I'm currently viewing
- [ ] Can bookmark specific spawn configurations and return to them
- [ ] Browser back/forward buttons work as expected
- [ ] URL updates automatically when I change profiles or select spawns
- [ ] Invalid URLs redirect gracefully to valid states
- [ ] URL reflects my current application state accurately

**Technical Task MS-13-T1**: Implement URL Routing System

- Create route structure: `/profile/:profileId/spawn/:spawnId?`
- Set up default route redirects to active profile
- Implement URL updates when profile or spawn selection changes
- Handle invalid profile/spawn IDs gracefully
- Add browser back/forward button support
- Replace existing routing structure completely
- Use React Router v6 patterns
- Consider URL encoding for profile/spawn names vs IDs
- Integrate with panel state management system
- Handle edge cases (deleted profiles, empty profiles)

**Dependencies**: Epic 1 (SpawnProfileService, SpawnService)

---

## Story 5: Work on Different Desktop Screens

**Story ID**: MS-14
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want the layout to work well on different desktop screen sizes, so that I can manage spawns effectively on various desktop monitors and resolutions.

**Acceptance Criteria**:

- [ ] Layout works well on standard desktop resolutions (1280px, 1440px, 1920px+)
- [ ] Ultrawide monitors maintain good panel proportions
- [ ] Minimum window size still provides usable workspace
- [ ] Text and UI elements scale appropriately for different screen densities
- [ ] Panel proportions remain consistent across desktop sizes
- [ ] Interface is tested and functional on common desktop configurations

**Technical Task MS-14-T1**: Optimize Desktop Layout Responsiveness

- Support common desktop resolutions (1280px, 1440px, 1920px+)
- Implement ultrawide monitor support (maintain panel proportions)
- Add minimum window size handling (prevent unusable layouts)
- Ensure panel content scaling for different screen densities
- Maintain 25%/50%/25% proportions across desktop sizes
- Use Tailwind responsive utilities for desktop breakpoints
- Focus on desktop-first approach (1280px minimum)
- Test with common desktop resolutions and browser zoom levels
- Consider high-DPI displays

**Dependencies**: Stories 1, 2, 3

---

## Story 6: See Layout Structure During Development

**Story ID**: MS-15
**Priority**: Low
**Estimate**: 2 points
**Status**: Not Started

**User Story**:
As a user, I want to see the workspace structure while features are being developed, so that I can understand the layout and provide feedback before full functionality is ready.

**Acceptance Criteria**:

- [ ] Can see placeholders for spawn list area
- [ ] Can see placeholder for configuration workspace area
- [ ] Can see placeholder for asset management area
- [ ] Placeholders show clear boundaries and dimensions
- [ ] Placeholder styling matches the intended design direction
- [ ] Placeholders indicate what functionality will be available
- [ ] Easy to understand the intended workspace flow

**Technical Task MS-15-T1**: Create Panel Placeholder Components

- Create left panel placeholder: "Spawn List Coming Soon"
- Create center panel placeholder: "Unified Configuration Workspace Coming Soon"
- Create right panel placeholder: "Dynamic Asset Management Coming Soon"
- Show panel dimensions and boundaries clearly
- Apply basic styling consistent with design vision
- Design components to be easily replaced with real implementations
- Create props interface for future content injection
- Include panel titles and brief descriptions
- Use semantic HTML structure
- Consider loading states or skeleton screens
- Center panel placeholder should hint at unified workspace concept
- Right panel placeholder should hint at dynamic sections concept

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
- [ ] Foundation for unified configuration workspace ✓ (Stories 1, 3, 6)
- [ ] Foundation for dynamic asset management ✓ (Stories 1, 3, 6)
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
- **Epic 4**: Center panel unified configuration workspace infrastructure ready
- **Epic 5**: Right panel dynamic asset management infrastructure ready
- **Epic 6**: Header profile management integration ready

## Notes

- Focus on structural foundation over visual polish
- Ensure layout supports spawn-centric workflow from Epic 1
- Design state management to accommodate future bulk operations
- Keep routing simple but extensible for future features
- Test thoroughly on different desktop screen sizes for practical usability
