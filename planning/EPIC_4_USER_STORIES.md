# Epic 4: Spawn Editor & Settings - User Stories

## Epic Overview

**Epic**: Spawn Editor & Settings
**Priority**: 4 (Critical Path)
**Status**: Not Started

Build unified configuration workspace in center panel with comprehensive manual save/cancel functionality, unsaved changes warnings, and asset inheritance model. The center panel serves dual purposes: spawn settings configuration and individual asset settings configuration. This epic is critical to the "experienced user friendly" vision principle, providing explicit control over changes with clear feedback for streaming configuration management.

---

## Story 1: Use Unified Configuration Workspace

**Story ID**: MS-23
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want a unified configuration workspace in the center panel, so that I can configure both spawn settings and individual asset settings in a dedicated workspace with clear state management.

**Acceptance Criteria**:

- [ ] Can see a dedicated configuration workspace in the center of my screen
- [ ] Workspace shows helpful message when no spawn is selected
- [ ] Workspace displays spawn configuration form when I select a spawn
- [ ] Workspace can switch to show asset configuration form when needed
- [ ] Workspace responds when I select different spawns from the list
- [ ] Workspace responds when I choose to configure assets
- [ ] Interface has clean, practical styling that matches the overall design
- [ ] Workspace handles context switching smoothly

**Technical Task MS-23-T1**: Implement Unified Configuration Workspace Infrastructure

- Build unified configuration workspace component that renders in center panel (50% width)
- Create "No Selection" state: Welcome message with "Select a spawn or create new"
- Create "Spawn Selected" state: Spawn configuration interface
- Create "Asset Settings" state: Asset-specific configuration form
- Implement context switching between spawn settings and asset settings modes
- Integrate with panel state management from Epic 2
- Listen for spawn selection changes from Epic 3
- Listen for asset configuration requests from Epic 5
- Use proper TypeScript interfaces for all props and state
- Design state management for context switching between modes

**Dependencies**: Epic 1 (Spawn types), Epic 2 (panel state), Epic 3 (spawn selection), Epic 5 (asset requests)

---

## Story 2: Control When Changes Are Saved

**Story ID**: MS-24
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want explicit save and cancel controls for spawn editing, so that I have complete control over when changes are permanently saved.

**Acceptance Criteria**:

- [ ] Can see prominent "Save" and "Cancel" buttons when editing spawns
- [ ] Save button saves all my changes and gives clear confirmation
- [ ] Cancel button discards all changes and returns to the last saved state
- [ ] Save button is disabled when there are no changes or when there are errors
- [ ] Cancel button is always available when I'm editing
- [ ] Get clear error messages if saving fails for any reason
- [ ] Changes are never saved automatically without my explicit action

**Technical Task MS-24-T1**: Implement Basic Save/Cancel Controls

- Add prominent "Save" and "Cancel" buttons in spawn editor
- Connect save button to SpawnService.updateSpawn() from Epic 1 with current form data
- Implement cancel button that reverts form to last saved state
- Disable save button when no changes or validation errors exist
- Keep cancel button always enabled
- Build basic form state management with original vs current values
- Add proper error handling for save failures
- Focus on core save/cancel functionality

**Dependencies**: Epic 1 (SpawnService), Story 1

---

## Story 3: Get Feedback on Save and Cancel Actions

**Story ID**: MS-25
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want clear feedback and confirmation for save/cancel actions, so that I can confidently manage my spawn editing workflow.

**Acceptance Criteria**:

- [ ] See confirmation dialog before canceling when I have unsaved changes
- [ ] Get clear success message when changes are saved successfully
- [ ] Get clear error message when saving fails
- [ ] Dialog explains exactly what changes will be lost if I cancel
- [ ] Confirmation dialogs follow consistent patterns throughout the application
- [ ] Success feedback is visible but doesn't interrupt my workflow

**Technical Task MS-25-T1**: Implement Advanced Save/Cancel Features

- Build confirmation dialog for cancel when unsaved changes exist
- Add success/error feedback messaging for save operations
- Create clear messaging about what changes will be lost
- Implement proper dialog patterns for confirmation
- Add visual feedback for successful save operations
- Build on basic save/cancel functionality from Story 2
- Design confirmation dialogs for cancel operations
- Include user feedback patterns

**Dependencies**: Story 2

---

## Story 4: Know When I Have Unsaved Changes

**Story ID**: MS-26
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want the system to detect when I have unsaved changes, so that I always know when my work needs to be saved.

**Acceptance Criteria**:

- [ ] System tracks changes across all form fields accurately
- [ ] Can tell the difference between my current changes and last saved state
- [ ] Change detection works properly with complex form data
- [ ] Change tracking performs well even with many form fields
- [ ] Change detection integrates smoothly with the save/cancel system
- [ ] System handles complex data changes correctly

**Technical Task MS-26-T1**: Build Core Unsaved Changes Detection

- Implement unsaved changes detection across all form fields
- Add deep comparison between original and current spawn state
- Integrate with form state management from Story 2
- Add basic dirty state tracking
- Optimize change detection for performance
- Handle proper state management for complex form data
- Focus on core detection logic without UI warnings
- Prepare foundation for warning dialogs

**Dependencies**: Epic 1 (Spawn types), Stories 1, 2

---

## Story 5: Avoid Losing Work When Navigating

**Story ID**: MS-27
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want warnings before navigating away from unsaved changes, so that I never accidentally lose work when switching contexts.

**Acceptance Criteria**:

- [ ] Get warning dialog before selecting a different spawn with unsaved changes
- [ ] Get warning dialog before switching to a different profile with unsaved changes
- [ ] Get warning dialog before refreshing or closing the browser with unsaved changes
- [ ] Can choose to save, discard changes, or cancel the navigation
- [ ] My work is temporarily preserved while I decide what to do
- [ ] Warnings disappear automatically when I save my changes

**Technical Task MS-27-T1**: Implement Navigation Warning Dialogs

- Add warning dialog before spawn selection changes
- Add warning dialog before profile switching
- Add warning dialog before browser navigation/refresh using beforeunload event
- Provide options to save, discard, or cancel navigation
- Implement temporary state preservation during warnings
- Add proper cleanup of warnings when changes are saved
- Integrate with panel state management for context switching
- Build on unsaved changes detection from Story 4

**Dependencies**: Epic 2 (panel state), Stories 2, 3, 4

---

## Story 6: Configure Basic Spawn Properties

**Story ID**: MS-28
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want a form to configure essential spawn properties, so that I can set up the basic information for my spawns.

**Acceptance Criteria**:

- [ ] Can enter and edit spawn name with validation that prevents duplicates
- [ ] Can add optional description to document what the spawn is for
- [ ] Can enable or disable the spawn with a toggle switch
- [ ] Form has clear structure and organization that's easy to understand
- [ ] Get immediate feedback when I enter invalid information
- [ ] Form styling is clean and matches the overall application design

**Technical Task MS-28-T1**: Create Basic Spawn Settings Form

- Add spawn name field with required validation and uniqueness checking using SpawnService
- Add spawn description field (optional)
- Add enable/disable toggle for spawn
- Design basic form structure and layout
- Implement proper input types and basic validation
- Add clear form organization and styling
- Include proper TypeScript types for all form fields
- Prepare structure for advanced settings

**Dependencies**: Epic 1 (Spawn types, SpawnService), Stories 1, 2

---

## Story 7: Configure Advanced Spawn Behavior

**Story ID**: MS-29
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to configure advanced spawn behavior like triggers and timing, so that I can set up complex spawn functionality.

**Acceptance Criteria**:

- [ ] Can configure trigger conditions for when spawn should activate
- [ ] Can set duration for how long spawn should run
- [ ] Form sections are organized logically (Basic Info, Behavior, Advanced)
- [ ] Advanced settings have proper validation and sensible defaults
- [ ] Field groups are clearly organized and easy to understand

**Technical Task MS-29-T1**: Add Advanced Spawn Settings

- Add trigger configuration field with placeholder for future expansion
- Add duration field with numeric validation and sensible defaults
- Organize form sections logically (Basic Info, Behavior, Advanced)
- Implement advanced input constraints and validation
- Add proper field grouping and organization
- Build on basic form structure from Story 6
- Design trigger field to be flexible for future OBS-style triggers
- Consider form field grouping for better organization

**Dependencies**: Story 6

---

## Story 8: Set Defaults That Assets Will Inherit

**Story ID**: MS-30
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to configure default settings that my assets will inherit, so that I can set common properties once and override them per asset as needed.

**Acceptance Criteria**:

- [ ] Can configure default settings that will apply to all assets in this spawn
- [ ] Can set default duration, position, dimensions, and volume settings
- [ ] Can clearly see which settings are spawn defaults vs individual asset overrides
- [ ] Can see visual distinction between inherited and customized properties
- [ ] Get helpful explanations of how the inheritance system works
- [ ] Can preview how settings will apply to my assets

**Technical Task MS-30-T1**: Implement Asset Inheritance Model UI

- Add asset defaults section in spawn settings form
- Include default duration setting that assets inherit
- Add default position, dimensions, and volume settings
- Create clear indication of which settings are inherited vs overridden
- Add visual distinction between spawn defaults and asset-specific overrides
- Include help text explaining inheritance model
- Add preview of how settings will apply to assets
- Design inheritance model data structure in spawn settings
- Create clear visual indicators for inherited vs overridden properties
- Prepare for integration with Epic 5 asset management

**Dependencies**: Epic 1 (Spawn types), Stories 1, 6

---

## Story 9: Configure Individual Asset Settings

**Story ID**: MS-38
**Priority**: High
**Estimate**: 4 points
**Status**: Not Started

**User Story**:
As a user, I want to configure settings for individual assets in my spawn, so that I can customize how each asset behaves while keeping spawn-wide defaults.

**Acceptance Criteria**:

- [ ] Can configure individual asset properties like dimensions, position, and volume
- [ ] Can see which settings are inherited from spawn defaults vs customized for this asset
- [ ] Can reset individual properties back to spawn defaults easily
- [ ] Settings form has the same save and cancel behavior as spawn settings
- [ ] Form validation helps me enter correct values for all asset properties

**Technical Task MS-38-T1**: Create Asset Settings Form Component

- Build asset settings form component for center panel
- Add form fields for all configurable asset properties (dimensions, position, volume, etc.)
- Show clear indication of inherited vs overridden values
- Add reset to spawn defaults functionality
- Integrate with unified configuration workspace from Story 1
- Implement proper form validation for all asset setting inputs
- Reuse form patterns and validation from spawn settings
- Include comprehensive form validation and error handling

**Dependencies**: Epic 1 (MediaAsset types), Stories 1, 2, 8

---

## Story 10: Reset Asset Settings to Spawn Defaults

**Story ID**: MS-39
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to easily reset asset settings back to spawn defaults, so that I can quickly undo customizations and return to inherited behavior.

**Acceptance Criteria**:

- [ ] Can reset individual asset properties to spawn default values with one click
- [ ] Can reset all asset properties to spawn defaults with one action
- [ ] Asset settings update immediately when spawn defaults change
- [ ] Can see inheritance status throughout the asset settings form
- [ ] Get helpful explanations about inheritance and override behavior

**Technical Task MS-39-T1**: Build Asset Settings Integration with Spawn Defaults

- Connect asset settings form with spawn defaults from Story 8
- Add one-click reset individual properties to spawn defaults
- Add one-click reset all properties to spawn defaults
- Implement dynamic updates when spawn defaults change
- Add inheritance status indicators throughout the form
- Include help text explaining inheritance model and override behavior
- Design inheritance visualization patterns
- Create reusable inheritance indicator components

**Dependencies**: Stories 8, 9

---

## Story 11: Switch Between Spawn and Asset Configuration

**Story ID**: MS-40
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to smoothly switch between configuring spawn settings and individual asset settings, so that I can efficiently manage both types of configuration in the same workspace.

**Acceptance Criteria**:

- [ ] Can transition smoothly between spawn settings and asset settings modes
- [ ] My work is preserved when switching between different configuration modes
- [ ] Can clearly see whether I'm configuring spawn settings or asset settings
- [ ] Can see breadcrumbs or header showing what I'm currently configuring
- [ ] Get unsaved changes warnings when switching between modes
- [ ] Can easily return to the previous configuration mode

**Technical Task MS-40-T1**: Implement Context Switching Between Modes

- Enable smooth transition between spawn settings and asset settings modes
- Add context preservation during mode switching
- Create clear visual indication of current mode (spawn vs asset settings)
- Add breadcrumb or header indicating current configuration context
- Include unsaved changes warnings when switching between modes
- Add back/return functionality to previous mode
- Integrate with panel state management for mode tracking
- Design state management for mode switching
- Include proper unsaved changes handling for mode switches

**Dependencies**: Stories 1, 4, 5, 9

---

## Story 12: Get Clear Validation and Error Guidance

**Story ID**: MS-31
**Priority**: Medium
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want clear validation and error messages throughout the spawn editor, so that I understand exactly what needs to be corrected before saving.

**Acceptance Criteria**:

- [ ] Get immediate visual feedback when I enter invalid information
- [ ] Error messages clearly explain what's wrong and how to fix it
- [ ] Can see which specific fields have errors with visual indicators
- [ ] Can see a summary of all validation issues at the form level
- [ ] Cannot save when there are validation errors
- [ ] Error handling works with keyboard navigation and screen readers
- [ ] All validation rules are clear: required fields, data types, ranges, uniqueness

**Technical Task MS-31-T1**: Add Form Validation and Error Handling

- Implement real-time field validation with immediate visual feedback
- Create clear error messages for each validation rule
- Add field-level error indicators (red borders, error text)
- Add form-level validation summary
- Prevent save when validation errors exist
- Implement accessible error handling (screen readers, keyboard navigation)
- Add validation rules: required fields, data types, ranges, uniqueness
- Integrate with save/cancel workflow from Story 2
- Consider validation library for complex rules

**Dependencies**: Stories 1, 2, 6

---

## Story 13: See Visual Indicators for Unsaved Changes

**Story ID**: MS-32
**Priority**: Medium
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want clear visual indicators of unsaved changes, so that I always know which fields have been modified and need to be saved.

**Acceptance Criteria**:

- [ ] Can see indicators on fields that have been changed (asterisks, colored borders, etc.)
- [ ] Can see indicator in the spawn editor header when there are unsaved changes
- [ ] Can see unsaved changes status in browser title or tab
- [ ] Visual distinction between clean and modified states is clear
- [ ] Indicators disappear after successfully saving changes
- [ ] Indicators persist when navigating within the form
- [ ] All dirty state indicators follow consistent styling

**Technical Task MS-32-T1**: Create Dirty State Indicators

- Add dirty field indicators (asterisks, colored borders, etc.)
- Add dirty form indicator in spawn editor header
- Add dirty state in browser title or tab
- Create visual distinction between clean and dirty states
- Clear dirty indicators after successful save
- Maintain dirty indicators across form navigation
- Use consistent styling for all dirty state indicators
- Implement field-level dirty state tracking
- Integrate with unsaved changes detection from Story 4

**Dependencies**: Stories 1, 2, 4

---

## Story 14: Prevent Accidental Loss of Work

**Story ID**: MS-33
**Priority**: Medium
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want comprehensive protection against accidentally losing my work, so that I don't lose configuration changes when switching spawns, profiles, or browser contexts.

**Acceptance Criteria**:

- [ ] Get warning before browser refresh or close when I have unsaved changes
- [ ] Get warning before selecting a different spawn when I have unsaved changes
- [ ] Get warning before switching profiles when I have unsaved changes
- [ ] Get warning before using browser navigation when I have unsaved changes
- [ ] Can choose to save and continue, discard changes, or cancel the action
- [ ] My work is temporarily preserved while I decide what to do
- [ ] Warnings are cleaned up automatically when I save my changes

**Technical Task MS-33-T1**: Add Navigation Warnings and Protection

- Implement browser refresh/close warnings using beforeunload event when unsaved changes exist
- Add spawn selection warnings before switching to different spawn
- Add profile switching warnings before context changes
- Add route change warnings for browser navigation with React Router integration
- Provide clear options: Save & Continue, Discard Changes, Cancel
- Implement temporary state preservation during warning dialogs
- Add proper cleanup of warnings when changes are saved
- Coordinate with panel state management for context switching

**Dependencies**: Epic 2 (routing, panel state), Stories 1, 2, 4

---

## Story 15: Maintain Manual Control Over Saves

**Story ID**: MS-34
**Priority**: Low
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want complete control over when my changes are saved, so that I can experiment with settings without fear of accidentally persisting incomplete configurations.

**Acceptance Criteria**:

- [ ] Nothing saves automatically anywhere in the spawn editor
- [ ] Get clear messaging about the manual save requirement
- [ ] Can experiment with settings during long editing sessions without auto-saves
- [ ] Can work with draft configurations safely
- [ ] Have explicit control over all save operations
- [ ] Get helpful information about the manual save approach

**Technical Task MS-34-T1**: Implement Auto-save Prevention Controls

- Ensure no auto-save functionality exists anywhere in the spawn editor
- Add clear messaging about manual save requirement
- Prevent auto-save even during long editing sessions
- Implement draft state management for experimentation
- Maintain explicit user control over all save operations
- Add settings to confirm manual save preference
- Include help text explaining manual save philosophy

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
│   │   │   ├── Story 10 (Asset Settings Integration)
│   │   │   └── Story 11 (Context Switching) [also depends on Story 5]
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
- [ ] Unified configuration workspace with dual-mode operation ✓ (Stories 1, 9, 11)
- [ ] Asset inheritance model implemented ✓ (Stories 8, 10)
- [ ] Asset settings integration in center panel ✓ (Stories 9, 10, 11)
- [ ] Context switching between spawn and asset settings ✓ (Story 11)
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
- **Epic 5**: Receives asset configuration requests from right panel asset management (Stories 1, 9, 11); Provides spawn configuration for asset inheritance (Stories 8, 10)
- **Epic 6**: Will work with profile management for context switching (Story 5)

## Critical Success Factors

- **Manual Save Philosophy**: Must implement explicit user control over saves (Stories 2, 3, 15)
- **Unsaved Changes Protection**: Comprehensive warnings prevent data loss (Stories 4, 5, 13, 14)
- **Unified Configuration Workspace**: Seamless dual-mode operation for spawn and asset settings (Stories 1, 9, 11)
- **Asset Settings Integration**: Asset configuration in center panel with proper inheritance (Stories 9, 10, 11)
- **Asset Inheritance**: Clear representation of spawn defaults and overrides (Stories 8, 10)
- **Form Validation**: Real-time feedback guides users to correct configurations (Stories 6, 7, 12)
- **Context Switching**: Smooth transitions between spawn and asset configuration modes (Story 11)

## Notes

- Focus on practical functionality over visual polish
- Manual save approach is non-negotiable for experienced users
- Design for users managing streaming configurations where accidental saves are costly
- Prepare for future OBS-style trigger configuration expansion
- Consider unified configuration workspace as the primary workspace in the application
- Build foundation for complex spawn configuration without overwhelming the UI
- Asset settings integration provides proper space allocation and unified experience
- Context switching between spawn and asset settings should be seamless and intuitive
