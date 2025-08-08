# Epic 3: Core Spawn Management - User Stories

## Epic Overview

**Epic ID**: MS-3
**Epic**: Core Spawn Management
**Priority**: 3 (Critical Path - HIGH VALUE)
**Status**: In Progress

**User Value**: ✨ **Users can create, read, update, and delete spawns with basic metadata and enable/disable functionality - the core workflow that makes the application immediately useful!**

Implement essential spawn management functionality including spawn list, creation, editing, and basic save controls.

---

## Story 1: View and Navigate Spawns

**Story ID**: MS-22
**Priority**: High
**Estimate**: 5 points
**Status**: Completed

**User Story**:
As a user, I want to see a list of all my spawns, so that I can quickly navigate and select spawns to work with.

**Acceptance Criteria**:

- [ ] Can see all spawns organized in a clear list
- [ ] Each spawn shows its name, enabled/disabled status, and basic info
- [ ] List design is compact for efficient scanning
- [ ] Can identify which spawn is currently selected
- [ ] See clear message when no spawns exist
- [ ] List shows loading state while spawns are being retrieved

**Technical Task MS-21-T1**: Implement Basic Spawn List Component

- Build spawn list component that renders in left panel (25% width)
- Use SpawnService from Epic 1 to fetch spawns
- Display spawn information: Name, Status (enabled/disabled)
- Implement compact list design for efficient scanning
- Add empty state when no spawns exist
- Add loading state while spawns are being fetched
- Follow existing component patterns in codebase

**Dependencies**: Epic 1 (SpawnService), Epic 2 (panel layout)

---

## Story 2: Enable and Disable Spawns

**Story ID**: MS-23
**Priority**: High
**Estimate**: 3 points
**Status**: In Progress

**User Story**:
As a user, I want to enable/disable spawns with toggle switches, so that I can quickly control which spawns are active without editing them.

**Acceptance Criteria**:

- [ ] Can toggle each spawn on/off with a switch control
- [ ] Enabled spawns appear normal, disabled spawns are grayed out
- [ ] Toggle changes take effect immediately
- [ ] Can see visual feedback while toggle is processing
- [ ] Can use keyboard to operate toggles for accessibility

**Technical Task MS-22-T1**: Implement Enable/Disable Toggle System

- Add toggle switch for each spawn in the list
- Use SpawnService.enableSpawn() and disableSpawn() methods from Epic 1
- Implement visual states: enabled (normal text), disabled (grayed out)
- Add visual feedback during toggle operation
- Implement optimistic UI updates with error handling
- Add keyboard accessibility for toggles

**Dependencies**: Epic 1 (SpawnService enable/disable methods), Story 1

---

## Story 3: Select Spawns for Editing

**Story ID**: MS-24
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to select spawns from the list to edit them, so that the spawn editor loads the selected spawn's configuration.

**Acceptance Criteria**:

- [ ] Can click on any spawn to select it
- [ ] Selected spawn is clearly highlighted with different background
- [ ] Selection updates the center panel to show spawn editor
- [ ] Can navigate with keyboard (arrow keys, enter to select)
- [ ] Always know which spawn is currently selected

**Technical Task MS-23-T1**: Implement Spawn Selection

- Implement click spawn to select with highlighted background
- Integrate with panel state management from Epic 2 for center panel communication
- Add keyboard navigation (arrow keys, enter to select)
- Add clear visual indication of selected spawn
- Handle selection state properly

**Dependencies**: Epic 2 (panel state), Stories 1, 2

---

## Story 4: Create New Spawns

**Story ID**: MS-25
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to create new spawns directly from the spawn list, so that I can quickly add spawns with sensible defaults.

**Acceptance Criteria**:

- [ ] Can see a "New Spawn" button in the spawn list area
- [ ] Button creates a new spawn with sensible default settings
- [ ] New spawn is automatically selected after creation
- [ ] Spawn editor opens immediately so I can configure the new spawn
- [ ] See clear error message if spawn creation fails
- [ ] New spawn appears in the list right away

**Technical Task MS-25-T1**: Implement New Spawn Creation Workflow

- Add "New Spawn" button prominently placed in spawn list
- Use SpawnService.createSpawn() from Epic 1 with sensible defaults
- Automatically select newly created spawn
- Navigate to spawn editor for immediate configuration
- Handle spawn creation errors gracefully
- Ensure new spawn appears in list immediately
- Assign default name (e.g., "New Spawn 1", "New Spawn 2")

**Dependencies**: Epic 1 (SpawnService), Stories 1, 3

---

## Story 5: Basic Spawn Editor Workspace

**Story ID**: MS-26
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want a dedicated workspace for configuring spawn settings, so that I can edit spawn properties in a clear, organized interface.

**Acceptance Criteria**:

- [ ] Can see a dedicated spawn editor in the center of my screen
- [ ] Editor shows helpful message when no spawn is selected
- [ ] Editor displays spawn configuration form when I select a spawn
- [ ] Editor responds when I select different spawns from the list
- [ ] Interface has clean, practical styling that matches the overall design

**Technical Task MS-28-T1**: Implement Basic Spawn Editor Infrastructure

- Build spawn editor component that renders in center panel (50% width)
- Create "No Selection" state: Welcome message with "Select a spawn or create new"
- Create "Spawn Selected" state: Spawn configuration interface
- Listen for spawn selection changes from spawn list
- Use proper TypeScript interfaces for all props and state
- Design clean, practical interface

**Dependencies**: Epic 1 (Spawn types), Epic 2 (panel state), Story 3

---

## Story 6: Manual Save and Cancel Controls

**Story ID**: MS-27
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

**Technical Task MS-29-T1**: Implement Save/Cancel Controls

- Add prominent "Save" and "Cancel" buttons in spawn editor
- Connect save button to SpawnService.updateSpawn() from Epic 1
- Implement cancel button that reverts form to last saved state
- Disable save button when no changes or validation errors exist
- Keep cancel button always enabled
- Build basic form state management with original vs current values
- Add proper error handling for save failures

**Dependencies**: Epic 1 (SpawnService), Story 5

---

## Story 7: Save Operation Feedback

**Story ID**: MS-28
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want clear feedback and confirmation for save/cancel actions, so that I can confidently manage my spawn editing workflow.

**Acceptance Criteria**:

- [ ] See confirmation dialog before canceling when I have unsaved changes
- [ ] Get clear success message when changes are saved successfully
- [ ] Get clear error message when saving fails
- [ ] Success feedback is visible but doesn't interrupt my workflow

**Technical Task MS-30-T1**: Implement Save/Cancel Feedback

- Build confirmation dialog for cancel when unsaved changes exist
- Add success/error feedback messaging for save operations
- Create clear messaging about what changes will be lost
- Add visual feedback for successful save operations
- Design confirmation dialogs for cancel operations

**Dependencies**: Story 6

---

## Story 8: Detect Unsaved Changes

**Story ID**: MS-29
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

**Technical Task MS-31-T1**: Build Unsaved Changes Detection

- Implement unsaved changes detection across all form fields
- Add deep comparison between original and current spawn state
- Integrate with form state management from Story 6
- Add basic dirty state tracking
- Optimize change detection for performance
- Handle proper state management for complex form data

**Dependencies**: Epic 1 (Spawn types), Stories 5, 6

---

## Story 9: Basic Spawn Properties Form

**Story ID**: MS-30
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

**Technical Task MS-33-T1**: Create Basic Spawn Settings Form

- Add spawn name field with required validation and uniqueness checking
- Add spawn description field (optional)
- Add enable/disable toggle for spawn
- Design basic form structure and layout
- Implement proper input types and basic validation
- Add clear form organization and styling
- Include proper TypeScript types for all form fields

**Dependencies**: Epic 1 (Spawn types, SpawnService), Stories 5, 6

---

## Story 10: Delete Spawns

**Story ID**: MS-31
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to delete spawns I no longer need, so that I can keep my spawn list clean and organized.

**Acceptance Criteria**:

- [ ] Can delete spawns from the spawn editor or spawn list
- [ ] Get confirmation dialog before deleting with clear warning
- [ ] Deleted spawn is removed from list immediately
- [ ] Can see clear feedback when deletion succeeds or fails
- [ ] Cannot accidentally delete spawns without confirmation

**Technical Task MS-34-T1**: Implement Spawn Deletion

- Add delete button in spawn editor
- Use SpawnService.deleteSpawn() from Epic 1
- Add confirmation dialog with clear messaging about permanent deletion
- Handle deletion errors gracefully
- Remove spawn from list after successful deletion
- Handle selection state when deleting currently selected spawn

**Dependencies**: Epic 1 (SpawnService), Stories 3, 5

---

## Story Dependencies

```text
Story 1 (Basic Spawn List)
├── Story 2 (Enable/Disable Toggles)
├── Story 3 (Spawn Selection)
│   ├── Story 4 (Create New Spawns)
│   └── Story 5 (Basic Editor Workspace)
│       ├── Story 6 (Save/Cancel Controls)
│       │   ├── Story 7 (Save Feedback)
│       │   └── Story 8 (Unsaved Changes Detection)
│       ├── Story 9 (Basic Properties Form)
│       └── Story 10 (Delete Spawns)
```

## Definition of Done

Each story is complete when:

- [ ] Component implemented and peer reviewed
- [ ] Integration with Epic 1 services works correctly
- [ ] Panel state management integration functional
- [ ] Manual save philosophy properly implemented
- [ ] Error handling and edge cases covered
- [ ] Visual design matches practical, uncluttered vision
- [ ] Ready for integration with asset management (Epic 4)

## Vision Validation Checklist

- [ ] Spawn CRUD operations implemented ✓ (Stories 1, 3, 4, 5, 9, 10)
- [ ] Enable/disable functionality ✓ (Story 2)
- [ ] Manual save with explicit user control ✓ (Stories 6, 7)
- [ ] Unsaved changes detection ✓ (Story 8)
- [ ] Basic spawn metadata (name, description) ✓ (Story 9)
- [ ] Practical, uncluttered interface ✓ (All stories)
- [ ] Desktop-optimized design ✓ (All stories)

## Critical Success Factors

- **Immediate User Value**: Users can create and manage spawns after this epic
- **Manual Save Philosophy**: Explicit control over all save operations
- **Solid Foundation**: Proper CRUD operations for spawns
- **Clean Interface**: Practical design focused on functionality
- **Error Handling**: Graceful handling of all failure scenarios

## Integration Points with Other Epics

- **Epic 1**: Uses SpawnService for all spawn operations
- **Epic 2**: Integrates with three-panel layout and panel state management
- **Epic 4**: Provides spawn foundation for asset assignment
- **Epic 5**: Provides spawn settings foundation for asset configuration
- **Epic 6**: Provides spawn foundation for trigger configuration

## Notes

- This epic delivers the first real user value - working spawn management
- Focus on core CRUD operations and manual save workflow
- Keep interface practical and uncluttered
- Build solid foundation for asset management in Epic 4
- Ensure scalability for 100s of spawns
- Manual save approach is critical for streaming configuration use case
