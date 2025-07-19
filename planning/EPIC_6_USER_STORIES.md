# Epic 6: Spawn Profile Management - User Stories

## Epic Overview

**Epic ID**: MS-6
**Epic**: Spawn Profile Management
**Priority**: 6
**Status**: Not Started

Implement active spawn profile management and switching with profile creation, editing, deletion, and proper context handling. Only one spawn profile should be active at a time, with clear indication of current active profile and context reset when switching profiles.

---

## Story 1: Switch Between Spawn Profiles

**Story ID**: MS-56
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to switch between different spawn profiles using the header dropdown, so that I can work with different collections of spawns for different projects or contexts.

**Acceptance Criteria**:

- [ ] Can see current active profile name in header dropdown
- [ ] Can select different profiles from dropdown list
- [ ] Profile switching updates the workspace to show new profile's spawns
- [ ] Workspace resets to "no spawn selected" state after switching
- [ ] URL updates to reflect the new active profile
- [ ] Profile switch completes smoothly without errors
- [ ] Can see confirmation that profile switch was successful

**Technical Task MS-56-T1**: Make Profile Selector Functional

- Connect Epic 2's profile selector dropdown to SpawnProfileService from Epic 1
- Implement profile switching using setActiveProfile() method
- Integrate with panel state management to reset workspace context
- Update URL routing to reflect new active profile (/profile/:newProfileId)
- Clear spawn selection state when switching profiles
- Add success feedback for profile switching
- Handle profile switching errors gracefully

**Dependencies**: Epic 1 (SpawnProfileService), Epic 2 (header selector, panel state, routing)

---

## Story 2: See Clear Active Profile Indication

**Story ID**: MS-57
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to always know which spawn profile is currently active, so that I understand the context of my current work and spawns.

**Acceptance Criteria**:

- [ ] Header clearly shows current active profile name
- [ ] Active profile is visually distinct in dropdown (checkmark, highlight, etc.)
- [ ] Profile name appears in page title or browser tab
- [ ] Can see profile description or metadata when helpful
- [ ] Active profile indication updates immediately when switching
- [ ] Visual styling is consistent with overall application design

**Technical Task MS-57-T1**: Implement Active Profile Indicators

- Display active profile name prominently in header
- Add visual indicators in dropdown for active profile
- Update browser title to include active profile name
- Integrate with SpawnProfileService.getActiveProfile() from Epic 1
- Add profile description display when available
- Ensure consistent styling with application design
- Update indicators immediately on profile changes

**Dependencies**: Epic 1 (SpawnProfileService), Story 1

---

## Story 3: Create and Manage Profiles

**Story ID**: MS-58
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to create, edit, and delete spawn profiles, so that I can organize my spawns into different collections for different purposes.

**Acceptance Criteria**:

- [ ] Can access profile management from header "Profile Actions" dropdown
- [ ] Can create new profiles with name and description
- [ ] Can edit existing profile names and descriptions
- [ ] Can delete profiles I no longer need
- [ ] Get confirmation dialogs before deleting profiles
- [ ] Profile management interface is clear and easy to use
- [ ] Changes take effect immediately and persist correctly

**Technical Task MS-58-T1**: Build Profile Management Modal

- Create modal dialog for profile management accessed from header
- Implement create profile form with name and description fields
- Add edit profile functionality with pre-populated forms
- Add delete profile with confirmation dialog
- Use SpawnProfileService CRUD operations from Epic 1
- Include proper form validation and error handling
- Design modal to not interfere with main workflow
- Handle modal state management and cleanup

**Dependencies**: Epic 1 (SpawnProfileService), Stories 1, 2

---

## Story 4: Start with Default Profile

**Story ID**: MS-59
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a new user, I want to have an initial "Default" profile ready to use, so that I can start creating spawns immediately without setup overhead.

**Acceptance Criteria**:

- [ ] Application creates "Default" profile automatically on first use
- [ ] Default profile is set as active automatically
- [ ] Can rename "Default" profile to something more meaningful
- [ ] Default profile behaves exactly like manually created profiles
- [ ] Setup happens transparently without user intervention
- [ ] Default profile persists and can be managed like other profiles

**Technical Task MS-59-T1**: Implement Default Profile Creation

- Create "Default" profile automatically on application first run
- Set Default profile as active using SpawnProfileService.setActiveProfile()
- Ensure Default profile is editable and renameable
- Handle profile initialization in application startup sequence
- Store Default profile using same persistence as manual profiles
- Include proper error handling for profile creation failures
- Consider migration scenario for existing users

**Dependencies**: Epic 1 (SpawnProfileService), Story 3

---

## Story 5: Configure Profile Working Directory

**Story ID**: MS-60
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to set a working directory for each profile, so that the applications consuming my spawn configurations can find assets relative to the correct base path for each project.

**Acceptance Criteria**:

- [ ] Can set optional working directory path for each profile
- [ ] Profile working directory overrides global Settings working directory
- [ ] Can see when profile uses custom working directory vs Settings default
- [ ] Can clear profile working directory to fall back to Settings default
- [ ] Working directory setting is included in profile management interface
- [ ] Setting validates directory paths appropriately

**Technical Task MS-60-T1**: Add Working Directory Profile Setting

- Add workingDirectory field to SpawnProfile interface in Epic 1
- Include working directory in profile creation and editing forms
- Add validation for directory path format
- Implement inheritance logic: Profile setting overrides Settings default
- Add clear indication when using custom vs default working directory
- Integrate with SettingsService for default value fallback
- Include working directory in profile management modal
- Handle empty/null values to indicate Settings inheritance

**Dependencies**: Epic 1 (SpawnProfile types), Story 3

---

## Story 6: Validate Profile Information

**Story ID**: MS-61
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want clear validation when creating or editing profiles, so that I can quickly fix any issues and create valid profile configurations.

**Acceptance Criteria**:

- [ ] Get immediate feedback when profile names are invalid or duplicated
- [ ] Cannot save profiles with empty or invalid names
- [ ] Working directory paths are validated for proper format
- [ ] Error messages clearly explain what needs to be fixed
- [ ] Can see which fields have validation errors
- [ ] Validation works consistently across create and edit operations

**Technical Task MS-61-T1**: Implement Profile Validation

- Add profile name validation: required, non-empty, unique across profiles
- Add working directory path validation with clear error messages
- Implement real-time validation feedback in profile forms
- Prevent save when validation errors exist
- Add field-level error indicators and form-level validation summary
- Integrate validation with SpawnProfileService operations
- Handle validation consistently across create/edit/rename operations
- Include accessible error handling for screen readers

**Dependencies**: Epic 1 (SpawnProfileService validation), Stories 3, 5

---

## Story 7: Remember Active Profile Between Sessions

**Story ID**: MS-62
**Priority**: Medium
**Estimate**: 2 points
**Status**: Not Started

**User Story**:
As a user, I want my active profile remembered when I restart the application, so that I can continue working where I left off without losing context.

**Acceptance Criteria**:

- [ ] Active profile is restored when I reload or restart the application
- [ ] If my last active profile was deleted, application handles this gracefully
- [ ] Profile restoration works correctly with URL routing
- [ ] Fallback behavior is clear when active profile cannot be restored
- [ ] Profile persistence works reliably across browser sessions

**Technical Task MS-62-T1**: Integrate with Settings Service

- Store active profile ID in SettingsService for persistence
- Restore active profile on application startup
- Handle cases where stored active profile no longer exists (deleted)
- Integrate with Epic 2's routing to restore correct URL state
- Implement fallback to Default profile when restoration fails
- Add proper error handling for storage/retrieval failures
- Ensure smooth startup experience with profile restoration

**Dependencies**: Epic 1 (SpawnProfileService, SettingsService), Stories 1, 4

---

## Story 8: Handle Profile Edge Cases

**Story ID**: MS-63
**Priority**: Low
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want the application to handle unusual profile situations gracefully, so that I can work confidently even when profiles are deleted or become corrupted.

**Acceptance Criteria**:

- [ ] Cannot delete the last remaining profile (always have at least one)
- [ ] Get clear warning when deleting active profile with option to switch first
- [ ] Application handles corrupted profile data without crashing
- [ ] Empty profiles display appropriate messaging and guidance
- [ ] Can recover from profile-related errors with helpful instructions
- [ ] Profile operations remain stable with large numbers of spawns

**Technical Task MS-63-T1**: Implement Edge Case Handling

- Prevent deletion of last remaining profile with clear messaging
- Add warning dialog when deleting active profile with switch-first option
- Implement profile data validation and corruption recovery
- Add empty profile state handling with helpful guidance
- Include error recovery mechanisms for profile operations
- Test profile operations with large spawn collections
- Add comprehensive error logging for debugging profile issues
- Handle concurrent profile operations safely

**Dependencies**: Epic 1 (SpawnProfileService), Stories 1, 3, 7

---

## Story Dependencies

```text
Story 1 (Profile Switching)
├── Story 2 (Active Profile Indication)
├── Story 3 (Profile Management)
│   ├── Story 4 (Default Profile)
│   ├── Story 5 (Working Directory)
│   └── Story 6 (Profile Validation)
├── Story 7 (Profile Persistence) [depends on Stories 1, 4]
└── Story 8 (Edge Cases) [depends on Stories 1, 3, 7]
```

## Definition of Done

Each story is complete when:

- [ ] User story acceptance criteria are met
- [ ] Technical tasks are implemented and tested
- [ ] Integration with Epic 1 SpawnProfileService works correctly
- [ ] Integration with Epic 2 header and panel state works
- [ ] Profile switching properly resets workspace context
- [ ] Settings integration functions correctly
- [ ] Profile validation provides clear user feedback
- [ ] Edge cases are handled gracefully
- [ ] TypeScript compilation clean (no errors)
- [ ] Code is reviewed and follows project standards
- [ ] Ready for Epic 7 legacy cleanup integration

## Vision Validation Checklist

- [ ] Active spawn profile management with clear indication ✓ (Stories 1, 2)
- [ ] Only one profile active at a time ✓ (Stories 1, 2, 7)
- [ ] Profile switching resets to spawn list view ✓ (Story 1)
- [ ] Profile creation, editing, and deletion ✓ (Stories 3, 4, 6)
- [ ] Settings integration for active profile ✓ (Stories 5, 7)
- [ ] Practical, uncluttered interface ✓ (All stories)
- [ ] Manual save philosophy maintained ✓ (Stories 3, 6)
- [ ] Experienced user friendly approach ✓ (All stories)

## Technical Standards

- **Service Integration**: Use Epic 1's SpawnProfileService for all profile operations
- **State Management**: Integrate with Epic 2's panel state for context reset
- **Persistence**: Use SettingsService for active profile storage
- **Validation**: Real-time validation with clear error messages
- **Error Handling**: Comprehensive error handling with user-friendly feedback
- **TypeScript**: Strict mode with proper interfaces for all profile data
- **Modal Design**: Non-intrusive profile management that doesn't disrupt workflow

## Integration Points with Other Epics

- **Epic 1**: Uses SpawnProfileService for all profile CRUD operations and active profile management
- **Epic 2**: Integrates with header selector, panel state management, and routing system
- **Epic 3**: Profile switching resets spawn list to "no selection" state
- **Epic 4**: Profile switching clears unified configuration workspace
- **Epic 5**: Profile switching resets asset management panel context
- **Epic 7**: Provides profile management foundation for legacy cleanup

## Critical Success Factors

- **Active Profile Tracking**: Clear indication of current active profile (Stories 1, 2)
- **Context Reset**: Proper workspace reset when switching profiles (Story 1)
- **Profile Management Interface**: Non-intrusive modal for profile operations (Story 3)
- **Default Profile Experience**: Seamless initial user experience (Story 4)
- **Working Directory Integration**: Profile-level settings override with Settings inheritance (Story 5)
- **Profile Persistence**: Reliable active profile restoration between sessions (Story 7)
- **Edge Case Handling**: Graceful handling of unusual profile situations (Story 8)

## Notes

- Profile management interface should not interfere with main spawn workflow
- Working directory setting follows inheritance pattern: Profile overrides Settings default
- Context reset on profile switching is critical for user understanding
- Default profile provides immediate usability for new users
- Profile validation prevents common configuration errors
- Edge case handling ensures application stability with profile operations
- All profile operations integrate with existing caching and persistence layers
