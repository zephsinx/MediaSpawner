# Epic 4: Spawn Editor & Settings - User Stories

## Epic Overview

**Epic**: Spawn Editor & Settings
**Priority**: 4 (Critical Path)
**Status**: Not Started

Build unified configuration workspace in center panel with comprehensive manual save/cancel functionality, unsaved changes warnings, and asset inheritance model. The center panel serves dual purposes: spawn settings configuration and individual asset settings configuration. This epic is critical to the "experienced user friendly" vision principle, providing explicit control over changes with clear feedback for streaming configuration management.

---

## Story 1: Create Unified Configuration Workspace Component

**Story ID**: MS-23
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want a unified configuration workspace in the center panel, so that I can configure both spawn settings and individual asset settings in a dedicated workspace with clear state management.

**Acceptance Criteria**:

- [ ] Unified configuration workspace component renders in center panel (50% width)
- [ ] "No Selection" state: Welcome message with "Select a spawn or create new"
- [ ] "Spawn Selected" state: Spawn configuration interface
- [ ] "Asset Settings" state: Asset-specific configuration form
- [ ] Context switching between spawn settings and asset settings modes
- [ ] Integrates with panel state management from Epic 2
- [ ] Responds to spawn selection from Epic 3 spawn list
- [ ] Responds to asset configuration requests from Epic 5 asset management
- [ ] Clean, practical styling consistent with design vision
- [ ] Proper TypeScript interfaces for all props and state

**Technical Notes**:

- Component should be responsive within the 50% center panel
- Use panel state management context from Epic 2
- Listen for spawn selection changes from Epic 3
- Listen for asset configuration requests from Epic 5
- Prepare component structure for dual-mode operation (spawn/asset settings)
- Design state management for context switching between modes

**Dependencies**: Epic 1 (Spawn types), Epic 2 (panel state), Epic 3 (spawn selection), Epic 5 (asset requests)

---

## Story 2: Implement Basic Save/Cancel Controls

**Story ID**: MS-24
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want basic save and cancel controls for spawn editing, so that I have explicit control over when changes are persisted.

**Acceptance Criteria**:

- [ ] Prominent "Save" and "Cancel" buttons in spawn editor
- [ ] Save button calls SpawnService.updateSpawn() with current form data
- [ ] Cancel button reverts form to last saved state
- [ ] Save button disabled when no changes or validation errors exist
- [ ] Cancel button always enabled
- [ ] Basic form state management with original vs current values
- [ ] Proper error handling for save failures

**Technical Notes**:

- Use SpawnService.updateSpawn() from Epic 1
- Implement form state management with original vs current values
- Include basic error handling for save failures
- Focus on core save/cancel functionality

**Dependencies**: Epic 1 (SpawnService), Story 1

---

## Story 3: Add Advanced Save/Cancel Features

**Story ID**: MS-25
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want advanced save/cancel features like confirmation dialogs and feedback messaging, so that I can efficiently manage my spawn editing workflow.

**Acceptance Criteria**:

- [ ] Confirmation dialog for cancel when unsaved changes exist
- [ ] Success/error feedback messaging for save operations
- [ ] Clear messaging about what changes will be lost
- [ ] Proper dialog patterns for confirmation
- [ ] Visual feedback for successful save operations

**Technical Notes**:

- Build on basic save/cancel functionality from Story 2
- Design confirmation dialogs for cancel operations
- Include user feedback patterns
- Implement success/error messaging system

**Dependencies**: Story 2

---

## Story 4: Build Core Unsaved Changes Detection

**Story ID**: MS-26
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want the system to detect when I have unsaved changes, so that I know when my work needs to be saved.

**Acceptance Criteria**:

- [ ] Unsaved changes detection across all form fields
- [ ] Deep comparison between original and current spawn state
- [ ] Integration with form state management
- [ ] Basic dirty state tracking
- [ ] Performance-optimized change detection
- [ ] Proper state management for complex form data

**Technical Notes**:

- Implement deep comparison between original and current spawn state
- Focus on core detection logic without UI warnings
- Integrate with form state management from Story 2
- Prepare foundation for warning dialogs

**Dependencies**: Epic 1 (Spawn types), Stories 1, 2

---

## Story 5: Implement Navigation Warning Dialogs

**Story ID**: MS-27
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want warnings before navigating away from unsaved changes, so that I never accidentally lose work when switching contexts.

**Acceptance Criteria**:

- [ ] Warning dialog before spawn selection changes
- [ ] Warning dialog before profile switching
- [ ] Warning dialog before browser navigation/refresh
- [ ] Options to save, discard, or cancel navigation
- [ ] Temporary state preservation during warnings
- [ ] Proper cleanup of warnings when changes are saved

**Technical Notes**:

- Use browser beforeunload event for navigation warnings
- Integrate with panel state management for context switching
- Store temporary state during warning dialogs
- Build on unsaved changes detection from Story 4

**Dependencies**: Epic 2 (panel state), Stories 2, 3, 4

---

## Story 6: Create Basic Spawn Settings Form

**Story ID**: MS-28
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want a basic spawn settings form with essential fields, so that I can configure the core properties of my spawns.

**Acceptance Criteria**:

- [ ] Spawn name field with required validation and uniqueness checking
- [ ] Spawn description field (optional)
- [ ] Enable/disable toggle for spawn
- [ ] Basic form structure and layout
- [ ] Proper input types and basic validation
- [ ] Clear form organization and styling

**Technical Notes**:

- Use SpawnService for name uniqueness validation
- Focus on core form fields without advanced features
- Include proper TypeScript types for all form fields
- Prepare structure for advanced settings

**Dependencies**: Epic 1 (Spawn types, SpawnService), Stories 1, 2

---

## Story 7: Add Advanced Spawn Settings

**Story ID**: MS-29
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want advanced spawn settings like triggers and duration, so that I can configure complex spawn behavior.

**Acceptance Criteria**:

- [ ] Trigger configuration field with placeholder for future expansion
- [ ] Duration field with numeric validation and sensible defaults
- [ ] Form sections organized logically (Basic Info, Behavior, Advanced)
- [ ] Advanced input constraints and validation
- [ ] Proper field grouping and organization

**Technical Notes**:

- Build on basic form structure from Story 6
- Design trigger field to be flexible for future OBS-style triggers
- Implement advanced validation patterns
- Consider form field grouping for better organization

**Dependencies**: Story 6

---

## Story 8: Implement Asset Inheritance Model UI

**Story ID**: MS-30
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to see and configure spawn default settings that will be inherited by assets, so that I can set common properties once and override them per asset as needed.

**Acceptance Criteria**:

- [ ] Asset defaults section in spawn settings form
- [ ] Default duration setting that assets inherit
- [ ] Default position, dimensions, and volume settings
- [ ] Clear indication of which settings are inherited vs overridden
- [ ] Visual distinction between spawn defaults and asset-specific overrides
- [ ] Help text explaining inheritance model
- [ ] Preview of how settings will apply to assets

**Technical Notes**:

- Design inheritance model data structure in spawn settings
- Create clear visual indicators for inherited vs overridden properties
- Prepare for integration with Epic 5 asset management
- Use consistent styling for inheritance indicators

**Dependencies**: Epic 1 (Spawn types), Stories 1, 6

---

## Story 9: Create Asset Settings Form Component

**Story ID**: MS-38
**Priority**: High
**Estimate**: 8 points
**Status**: Not Started

**User Story**:
As a user, I want an asset settings form in the center panel, so that I can configure spawn-specific asset overrides with proper space allocation and clear inheritance indication.

**Acceptance Criteria**:

- [ ] Asset settings form component for center panel
- [ ] Form fields for all configurable asset properties (dimensions, position, volume, etc.)
- [ ] Clear indication of inherited vs overridden values
- [ ] Reset to spawn defaults functionality
- [ ] Integration with unified configuration workspace
- [ ] Proper form validation for all asset setting inputs
- [ ] Save and cancel controls consistent with spawn settings
- [ ] Real-time preview of setting changes where applicable

**Technical Notes**:

- Reuse form patterns and validation from spawn settings
- Design form to show inherited values with visual distinction
- Include comprehensive form validation and error handling
- Integrate with manual save workflow from Stories 2, 3

**Dependencies**: Epic 1 (MediaAsset types), Stories 1, 2, 8

---

## Story 10: Implement Context Switching Between Modes

**Story ID**: MS-39
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want smooth context switching between spawn settings and asset settings, so that I can efficiently configure both spawn defaults and individual asset overrides in the same workspace.

**Acceptance Criteria**:

- [ ] Smooth transition between spawn settings and asset settings modes
- [ ] Context preservation during mode switching
- [ ] Clear visual indication of current mode (spawn vs asset settings)
- [ ] Breadcrumb or header indicating current configuration context
- [ ] Unsaved changes warnings when switching between modes
- [ ] Back/return functionality to previous mode
- [ ] Integration with panel state management for mode tracking

**Technical Notes**:

- Design state management for mode switching
- Preserve form state during context transitions
- Include proper unsaved changes handling for mode switches
- Integrate with navigation warnings from Story 5

**Dependencies**: Stories 1, 4, 5, 9

---

## Story 11: Build Asset Settings Integration with Spawn Defaults

**Story ID**: MS-40
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want asset settings to integrate seamlessly with spawn defaults, so that I can see inherited values and understand which properties come from the spawn vs asset-specific overrides.

**Acceptance Criteria**:

- [ ] Asset settings form displays spawn default values as inherited baseline
- [ ] Clear visual distinction between inherited and overridden properties
- [ ] One-click reset individual properties to spawn defaults
- [ ] One-click reset all properties to spawn defaults
- [ ] Dynamic updates when spawn defaults change
- [ ] Inheritance status indicators throughout the form
- [ ] Help text explaining inheritance model and override behavior

**Technical Notes**:

- Connect asset settings form with spawn defaults from Story 8
- Design inheritance visualization patterns
- Include real-time synchronization with spawn default changes
- Create reusable inheritance indicator components

**Dependencies**: Stories 8, 9

---

## Story 12: Add Form Validation and Error Handling

**Story ID**: MS-31
**Priority**: Medium
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want clear validation and error handling throughout the spawn editor, so that I understand what needs to be corrected before saving.

**Acceptance Criteria**:

- [ ] Real-time field validation with immediate visual feedback
- [ ] Clear error messages for each validation rule
- [ ] Field-level error indicators (red borders, error text)
- [ ] Form-level validation summary
- [ ] Prevent save when validation errors exist
- [ ] Accessible error handling (screen readers, keyboard navigation)
- [ ] Validation rules: required fields, data types, ranges, uniqueness

**Technical Notes**:

- Implement comprehensive validation rules for all form fields
- Use accessible error handling patterns
- Integrate with save/cancel workflow from Story 2
- Consider validation library for complex rules

**Dependencies**: Stories 1, 2, 6

---

## Story 13: Create Dirty State Indicators

**Story ID**: MS-32
**Priority**: Medium
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want clear visual indicators of unsaved changes, so that I always know which fields have been modified and need to be saved.

**Acceptance Criteria**:

- [ ] Dirty field indicators (asterisks, colored borders, etc.)
- [ ] Dirty form indicator in spawn editor header
- [ ] Dirty state in browser title or tab
- [ ] Visual distinction between clean and dirty states
- [ ] Dirty indicators clear after successful save
- [ ] Dirty indicators persist across form navigation
- [ ] Consistent styling for all dirty state indicators

**Technical Notes**:

- Implement field-level dirty state tracking
- Use consistent visual language for dirty indicators
- Integrate with unsaved changes detection from Story 4
- Consider browser title updates for dirty state

**Dependencies**: Stories 1, 2, 4

---

## Story 14: Add Navigation Warnings and Protection

**Story ID**: MS-33
**Priority**: Medium
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want protection against accidental navigation away from unsaved changes, so that I don't lose work when switching spawns, profiles, or browser contexts.

**Acceptance Criteria**:

- [ ] Browser refresh/close warnings when unsaved changes exist
- [ ] Spawn selection warnings before switching to different spawn
- [ ] Profile switching warnings before context changes
- [ ] Route change warnings for browser navigation
- [ ] Clear options: Save & Continue, Discard Changes, Cancel
- [ ] Temporary state preservation during warning dialogs
- [ ] Proper cleanup of warnings when changes are saved

**Technical Notes**:

- Use browser beforeunload event for navigation protection
- Integrate with React Router for route change warnings
- Coordinate with panel state management for context switching
- Implement proper warning dialog patterns

**Dependencies**: Epic 2 (routing, panel state), Stories 1, 2, 4

---

## Story 15: Implement Auto-save Prevention Controls

**Story ID**: MS-34
**Priority**: Low
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want explicit control over when my changes are saved, so that I can experiment with settings without fear of accidentally persisting incomplete configurations.

**Acceptance Criteria**:

- [ ] No auto-save functionality anywhere in the spawn editor
- [ ] Clear messaging about manual save requirement
- [ ] Auto-save prevention even during long editing sessions
- [ ] Draft state management for experimentation
- [ ] Explicit user control over all save operations
- [ ] Settings to confirm manual save preference
- [ ] Help text explaining manual save philosophy

**Technical Notes**:

- Ensure no automatic save triggers exist in the component
- Implement draft state management for experimentation
- Add user education about manual save approach

**Dependencies**: Stories 1, 2

---

## Story Dependencies

```text
Story 1 (Unified Workspace)
├── Story 2 (Basic Save/Cancel)
│   ├── Story 3 (Advanced Save/Cancel)
│   ├── Story 4 (Core Unsaved Changes)
│   │   ├── Story 5 (Navigation Warning Dialogs)
│   │   ├── Story 13 (Dirty Indicators)
│   │   └── Story 14 (Navigation Protection)
│   └── Story 15 (Auto-save Prevention)
├── Story 6 (Basic Settings Form)
│   ├── Story 7 (Advanced Settings)
│   ├── Story 8 (Inheritance Model)
│   │   ├── Story 9 (Asset Settings Form)
│   │   │   ├── Story 10 (Context Switching) [also depends on Story 5]
│   │   │   └── Story 11 (Asset Settings Integration)
│   │   └── Story 12 (Validation)
```

## Definition of Done

Each story is complete when:

- [ ] Component implemented and peer reviewed
- [ ] Manual save workflow functions correctly for both spawn and asset settings
- [ ] Unsaved changes detection works across all scenarios and modes
- [ ] Form validation provides clear user feedback for all forms
- [ ] Asset inheritance model is clearly represented in both spawn and asset settings
- [ ] Context switching between spawn and asset settings works smoothly
- [ ] Asset settings integration provides proper space allocation and inheritance
- [ ] Integration with Epic 1 services works correctly
- [ ] Integration with Epic 2 panel state management works
- [ ] Integration with Epic 3 spawn selection works
- [ ] Integration with Epic 5 asset configuration requests works
- [ ] TypeScript compilation clean (no errors)
- [ ] Accessibility requirements met
- [ ] Ready for full integration with Epic 5 asset management

## Vision Validation Checklist

- [ ] Manual save with explicit user control ✓ (Stories 2, 3, 15)
- [ ] Comprehensive unsaved changes warnings ✓ (Stories 4, 5, 13, 14)
- [ ] Unified configuration workspace with dual-mode operation ✓ (Stories 1, 9, 10)
- [ ] Asset inheritance model implemented ✓ (Stories 8, 11)
- [ ] Asset settings integration in center panel ✓ (Stories 9, 10, 11)
- [ ] Context switching between spawn and asset settings ✓ (Story 10)
- [ ] Experienced user friendly approach ✓ (All stories)
- [ ] Practical functionality over visual appeal ✓ (All stories)
- [ ] Clear feedback for streaming configuration management ✓ (Stories 12, 13)
- [ ] Explicit control over changes ✓ (Stories 2, 3, 14, 15)

## Technical Standards

- **Manual Save**: No auto-save anywhere, explicit user control
- **Validation**: Real-time validation with clear error messages
- **State Management**: Proper integration with panel state from Epic 2
- **Service Integration**: Use SpawnService methods from Epic 1
- **Error Handling**: Comprehensive error handling with user feedback
- **Accessibility**: Keyboard navigation, screen reader support
- **Performance**: Efficient form updates and validation
- **TypeScript**: Strict mode, proper interfaces for all props/state

## Integration Points with Other Epics

- **Epic 1**: Uses Spawn data types and SpawnService for CRUD operations (Stories 2, 4, 6, 8)
- **Epic 2**: Integrates with three-panel layout and panel state management (Stories 1, 5, 14)
- **Epic 3**: Receives spawn selection from spawn list navigation (Story 1)
- **Epic 5**: Receives asset configuration requests from right panel asset management (Stories 1, 9, 10); Provides spawn configuration for asset inheritance (Stories 8, 11)
- **Epic 6**: Will work with profile management for context switching (Story 5)

## Critical Success Factors

- **Manual Save Philosophy**: Must implement explicit user control over saves (Stories 2, 3, 15)
- **Unsaved Changes Protection**: Comprehensive warnings prevent data loss (Stories 4, 5, 13, 14)
- **Unified Configuration Workspace**: Seamless dual-mode operation for spawn and asset settings (Stories 1, 9, 10)
- **Asset Settings Integration**: Asset configuration in center panel with proper inheritance (Stories 9, 10, 11)
- **Asset Inheritance**: Clear representation of spawn defaults and overrides (Stories 8, 11)
- **Form Validation**: Real-time feedback guides users to correct configurations (Stories 6, 7, 12)
- **Context Switching**: Smooth transitions between spawn and asset configuration modes (Story 10)

## Notes

- Focus on practical functionality over visual polish
- Manual save approach is non-negotiable for experienced users
- Design for users managing streaming configurations where accidental saves are costly
- Prepare for future OBS-style trigger configuration expansion
- Consider unified configuration workspace as the primary workspace in the application
- Build foundation for complex spawn configuration without overwhelming the UI
- Asset settings integration provides proper space allocation and unified experience
- Context switching between spawn and asset settings should be seamless and intuitive
