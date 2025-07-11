# Epic 4: Spawn Editor & Settings - User Stories

## Epic Overview

**Epic**: Spawn Editor & Settings  
**Priority**: 4 (Critical Path)  
**Status**: Not Started  

Build spawn editor with comprehensive manual save/cancel functionality, unsaved changes warnings, and asset inheritance model. This epic is critical to the "experienced user friendly" vision principle, providing explicit control over changes with clear feedback for streaming configuration management.

---

## Story 1: Create Basic Spawn Editor Component

**Story ID**: MS-23  
**Priority**: High  
**Estimate**: 5 points  
**Status**: Not Started  

**User Story**:  
As a user, I want a spawn editor component in the center panel, so that I can configure individual spawns with clear states for no selection and spawn selected.

**Acceptance Criteria**:

- [ ] Spawn editor component renders in center panel (50% width)
- [ ] "No Selection" state: Welcome message with "Select a spawn or create new"
- [ ] "Spawn Selected" state: Full spawn configuration interface
- [ ] Integrates with panel state management from Epic 2
- [ ] Responds to spawn selection from Epic 3 spawn list
- [ ] Clean, practical styling consistent with design vision
- [ ] Proper TypeScript interfaces for all props and state

**Technical Notes**:

- Component should be responsive within the 50% center panel
- Use panel state management context from Epic 2
- Listen for spawn selection changes from Epic 3
- Prepare component structure for form sections

**Dependencies**: Epic 1 (Spawn types), Epic 2 (panel state), Epic 3 (spawn selection)

---

## Story 2: Implement Manual Save/Cancel Workflow

**Story ID**: MS-24  
**Priority**: High  
**Estimate**: 8 points  
**Status**: Not Started  

**User Story**:  
As a user, I want explicit save and cancel controls for spawn editing, so that I have full control over when changes are persisted without auto-save interference.

**Acceptance Criteria**:

- [ ] Prominent "Save" and "Cancel" buttons in spawn editor
- [ ] Save button calls SpawnService.updateSpawn() with current form data
- [ ] Cancel button reverts form to last saved state
- [ ] Confirmation dialog for cancel when unsaved changes exist
- [ ] Success/error feedback for save operations
- [ ] Save button disabled when no changes or validation errors exist
- [ ] Cancel button always enabled
- [ ] Keyboard shortcuts: Ctrl+S for save, Escape for cancel

**Technical Notes**:

- Use SpawnService.updateSpawn() from Epic 1
- Implement form state management with original vs current values
- Include proper error handling for save failures
- Design confirmation dialogs for cancel operations

**Dependencies**: Epic 1 (SpawnService), Story 1

---

## Story 3: Build Comprehensive Unsaved Changes Detection

**Story ID**: MS-25  
**Priority**: High  
**Estimate**: 8 points  
**Status**: Not Started  

**User Story**:  
As a user, I want comprehensive warnings about unsaved changes, so that I never accidentally lose work when navigating away or switching contexts.

**Acceptance Criteria**:

- [ ] Unsaved changes detection across all form fields
- [ ] Warning dialog before spawn selection changes
- [ ] Warning dialog before profile switching
- [ ] Warning dialog before browser navigation/refresh
- [ ] "Dirty" state indicators throughout the form
- [ ] Clear messaging about what changes will be lost
- [ ] Options to save, discard, or cancel navigation
- [ ] Persist unsaved changes temporarily during warnings

**Technical Notes**:

- Implement deep comparison between original and current spawn state
- Use browser beforeunload event for navigation warnings
- Integrate with panel state management for context switching
- Store temporary state during warning dialogs

**Dependencies**: Epic 1 (Spawn types), Epic 2 (panel state), Stories 1, 2

---

## Story 4: Create Spawn Settings Form with Validation

**Story ID**: MS-26  
**Priority**: High  
**Estimate**: 8 points  
**Status**: Not Started  

**User Story**:  
As a user, I want a comprehensive spawn settings form with real-time validation, so that I can configure all spawn properties with immediate feedback on errors.

**Acceptance Criteria**:

- [ ] Spawn name field with required validation and uniqueness checking
- [ ] Spawn description field (optional)
- [ ] Trigger configuration field with placeholder for future expansion
- [ ] Duration field with numeric validation and sensible defaults
- [ ] Enable/disable toggle for spawn
- [ ] Real-time validation with clear error messages
- [ ] Form sections organized logically (Basic Info, Behavior, Advanced)
- [ ] Proper input types and validation constraints

**Technical Notes**:

- Use SpawnService for name uniqueness validation
- Implement form validation library or custom validation
- Design trigger field to be flexible for future OBS-style triggers
- Include proper TypeScript types for all form fields
- Consider form field grouping for better organization

**Dependencies**: Epic 1 (Spawn types, SpawnService), Stories 1, 2

---

## Story 5: Implement Asset Inheritance Model UI

**Story ID**: MS-27  
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

**Dependencies**: Epic 1 (Spawn types), Stories 1, 4

---

## Story 6: Add Form Validation and Error Handling

**Story ID**: MS-28  
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

**Dependencies**: Stories 1, 2, 4

---

## Story 7: Create Dirty State Indicators

**Story ID**: MS-29  
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
- Integrate with unsaved changes detection from Story 3
- Consider browser title updates for dirty state

**Dependencies**: Stories 1, 2, 3

---

## Story 8: Add Navigation Warnings and Protection

**Story ID**: MS-30  
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

**Dependencies**: Epic 2 (routing, panel state), Stories 1, 2, 3

---

## Story 9: Implement Auto-save Prevention Controls

**Story ID**: MS-31  
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
- Consider settings for users who prefer auto-save (future)

**Dependencies**: Stories 1, 2

---

## Story Dependencies

```text
Story 1 (Basic Component)
├── Story 2 (Save/Cancel)
│   ├── Story 3 (Unsaved Changes)
│   │   ├── Story 7 (Dirty Indicators)
│   │   └── Story 8 (Navigation Warnings)
│   └── Story 9 (Auto-save Prevention)
├── Story 4 (Settings Form)
│   ├── Story 5 (Inheritance Model)
│   └── Story 6 (Validation)
```

## Definition of Done

Each story is complete when:

- [ ] Component implemented and peer reviewed
- [ ] Manual save workflow functions correctly
- [ ] Unsaved changes detection works across all scenarios
- [ ] Form validation provides clear user feedback
- [ ] Asset inheritance model is clearly represented
- [ ] Integration with Epic 1 services works correctly
- [ ] Integration with Epic 2 panel state management works
- [ ] Integration with Epic 3 spawn selection works
- [ ] TypeScript compilation clean (no errors)
- [ ] Accessibility requirements met
- [ ] Ready for integration with Epic 5 asset management

## Vision Validation Checklist

- [ ] Manual save with explicit user control ✓ (Stories 2, 9)
- [ ] Comprehensive unsaved changes warnings ✓ (Stories 3, 7, 8)
- [ ] Spawn-centric workflow with center panel focus ✓ (Story 1)
- [ ] Asset inheritance model implemented ✓ (Story 5)
- [ ] Experienced user friendly approach ✓ (All stories)
- [ ] Practical functionality over visual appeal ✓ (All stories)
- [ ] Clear feedback for streaming configuration management ✓ (Stories 6, 7)
- [ ] Explicit control over changes ✓ (Stories 2, 8, 9)

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

- **Epic 1**: Uses Spawn data types and SpawnService for CRUD operations
- **Epic 2**: Integrates with three-panel layout and panel state management
- **Epic 3**: Receives spawn selection from spawn list navigation
- **Epic 5**: Provides spawn configuration for asset management integration
- **Epic 6**: Will work with profile management for context switching

## Critical Success Factors

- **Manual Save Philosophy**: Must implement explicit user control over saves
- **Unsaved Changes Protection**: Comprehensive warnings prevent data loss
- **Asset Inheritance**: Clear representation of spawn defaults and overrides
- **Form Validation**: Real-time feedback guides users to correct configurations
- **Integration**: Seamless integration with spawn list and asset management

## Notes

- Focus on practical functionality over visual polish
- Manual save approach is non-negotiable for experienced users
- Design for users managing streaming configurations where accidental saves are costly
- Prepare for future OBS-style trigger configuration expansion
- Consider spawn editor as the primary workspace in the application
- Build foundation for complex spawn configuration without overwhelming the UI 