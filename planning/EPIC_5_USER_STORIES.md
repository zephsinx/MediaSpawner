# Epic 5: Asset Integration & Spawn-Specific Settings - User Stories

## Epic Overview

**Epic**: Asset Integration & Spawn-Specific Settings
**Priority**: 5 (Critical Path)
**Status**: Not Started

Implement right panel asset management with dynamic two-section layout, drag & drop workflows, and asset library integration. Focus on asset selection and assignment with spawn-specific settings configuration.

---

## Story 1: Set Up Right Panel Infrastructure

**Story ID**: MS-41
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want the right panel to display asset management sections, so that I can see spawn assets and available library assets in organized areas.

**Acceptance Criteria**:

- [ ] Right panel renders with two distinct sections
- [ ] Top section shows "Assets in Current Spawn"
- [ ] Bottom section shows "Asset Library"
- [ ] Sections have clear visual separation
- [ ] Panel works within 25% width constraints
- [ ] Layout adapts to different screen heights

**Technical Task MS-41-T1**: Create Right Panel Component Structure

- Build component within Epic 2's panel layout constraints
- Create section containers with proper CSS structure
- Integrate with Epic 2's panel state management context
- Set up dynamic section content architecture

**Dependencies**: Epic 2 (panel layout, state management)

---

## Story 2: Show Assets in Current Spawn

**Story ID**: MS-42
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to see which assets are assigned to my current spawn, so that I understand what will appear when I trigger this spawn.

**Acceptance Criteria**:

- [ ] Section displays assets assigned to selected spawn
- [ ] Each asset shows name, type, and preview thumbnail
- [ ] Asset counter shows total count in section header
- [ ] Empty state appears when no assets are assigned
- [ ] List updates when selecting different spawns
- [ ] Assets display in their spawn order

**Technical Task MS-42-T1**: Integrate with Spawn Selection

- Listen for spawn selection changes from Epic 3 via Epic 2's panel state
- Use Epic 1's SpawnService to retrieve spawn assets
- Handle empty spawns and loading states

**Dependencies**: Epic 1 (SpawnService), Epic 2 (panel state), Epic 3 (spawn selection), Story 1

---

## Story 3: Reorder Assets Within Spawn

**Story ID**: MS-43
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to reorder assets within my spawn, so that I can control the sequence they appear in.

**Acceptance Criteria**:

- [ ] Can drag assets to reorder within spawn list
- [ ] Visual feedback shows where asset will be placed
- [ ] Asset order updates immediately after drop
- [ ] Reordering persists when switching spawns
- [ ] Cannot drag assets outside the spawn section

**Technical Task MS-43-T1**: Implement Drag & Drop Reordering

- Use drag & drop library (react-beautiful-dnd or similar)
- Call Epic 1's SpawnService to save new order
- Include visual feedback for drag operations
- Handle reordering errors gracefully

**Dependencies**: Epic 1 (SpawnService), Story 2

---

## Story 4: Display Asset Library

**Story ID**: MS-44
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to see all available assets in the library section, so that I can choose assets to add to my spawn.

**Acceptance Criteria**:

- [ ] Library section shows all available assets
- [ ] Assets display with thumbnails and names
- [ ] Asset counter shows total library size
- [ ] Assets scroll when they exceed section height
- [ ] Asset types are clearly indicated
- [ ] Library updates when assets are added/removed

**Technical Task MS-44-T1**: Integrate Asset Library Display

- Use Epic 1's AssetService for library operations
- Implement asset thumbnails and type indicators
- Handle large asset libraries with scroll

**Dependencies**: Epic 1 (AssetService), Story 1

---

## Story 5: Make Asset Library Collapsible

**Story ID**: MS-45
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to collapse the asset library when I don't need it, so that I can focus more space on my spawn assets.

**Acceptance Criteria**:

- [ ] Library section has expand/collapse control
- [ ] Collapsing gives more space to spawn assets
- [ ] Expand/collapse state is remembered
- [ ] Smooth animation when expanding/collapsing
- [ ] Clear visual indicator of collapsed state

**Technical Task MS-45-T1**: Implement Collapsible Library

- Add expand/collapse controls with smooth animations
- Manage collapsed state in Epic 2's panel state
- Implement space reallocation for spawn section

**Dependencies**: Epic 2 (panel state), Story 4

---

## Story 6: Add Space Control Between Sections

**Story ID**: MS-46
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to adjust the space between spawn assets and library sections, so that I can optimize the layout for my current task.

**Acceptance Criteria**:

- [ ] Can drag divider to resize sections
- [ ] Sections maintain usable minimum sizes
- [ ] Divider position is remembered
- [ ] Visual feedback during resize
- [ ] Sections start with sensible default split

**Technical Task MS-46-T1**: Create Resizable Divider

- Implement draggable divider with mouse/touch support
- Set minimum heights: 80px spawn section, 200px library section
- Use Epic 2's panel state for position persistence
- Add keyboard accessibility for divider control

**Dependencies**: Epic 2 (panel state), Stories 2, 4

---

## Story 7: Assign Assets to Spawn

**Story ID**: MS-47
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to drag assets from the library to my spawn, so that I can quickly build my spawn configuration.

**Acceptance Criteria**:

- [ ] Can drag assets from library to spawn section
- [ ] Drop zone is clearly indicated when dragging
- [ ] Asset appears in spawn list immediately after drop
- [ ] Prevents adding duplicate assets
- [ ] Shows success feedback after assignment

**Technical Task MS-47-T1**: Implement Asset Assignment Drag & Drop

- Use Epic 1's SpawnService.assignAssetToSpawn() method
- Implement drag previews and drop zone indicators
- Handle assignment errors and duplicate prevention
- Provide clear success/error feedback

**Dependencies**: Epic 1 (SpawnService), Stories 2, 4

---

## Story 8: Remove Assets from Spawn

**Story ID**: MS-48
**Priority**: Medium
**Estimate**: 2 points
**Status**: Not Started

**User Story**:
As a user, I want to remove assets from my spawn, so that I can clean up my spawn configuration.

**Acceptance Criteria**:

- [ ] Remove button appears on each spawn asset
- [ ] Confirmation dialog appears before removal
- [ ] Asset is immediately removed from spawn list
- [ ] Asset remains available in library
- [ ] Clear feedback about removal success

**Technical Task MS-48-T1**: Implement Asset Removal

- Use Epic 1's SpawnService.removeAssetFromSpawn() method
- Add confirmation dialog with clear messaging
- Handle removal errors gracefully

**Dependencies**: Epic 1 (SpawnService), Story 2

---

## Story 9: Configure Individual Asset Settings

**Story ID**: MS-49
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to configure individual asset settings within my spawn, so that I can customize how each asset behaves.

**Acceptance Criteria**:

- [ ] Clicking spawn asset opens its configuration
- [ ] Configuration opens in center panel
- [ ] Selected asset is clearly highlighted
- [ ] Can return to spawn view when finished
- [ ] Asset context is properly passed to editor

**Technical Task MS-49-T1**: Integrate with Epic 4 Configuration Workspace

- Send asset configuration requests to Epic 4's unified workspace
- Pass spawn ID, asset ID, and current settings as context
- Use Epic 2's panel state for cross-panel communication
- Handle configuration completion and return to spawn view

**Dependencies**: Epic 1 (SpawnAsset types), Epic 2 (panel state), Epic 4 (unified workspace), Story 2

---

## Story 10: Add Asset Library Search

**Story ID**: MS-50
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to search my asset library, so that I can quickly find specific assets in large libraries.

**Acceptance Criteria**:

- [ ] Search input appears in library section
- [ ] Results update as I type
- [ ] Can search by asset name
- [ ] Clear search results easily
- [ ] Search works with large libraries

**Technical Task MS-50-T1**: Implement Asset Search

- Use Epic 1's AssetService for search operations
- Implement debounced search input for performance
- Include search result highlighting and clear controls

**Dependencies**: Epic 1 (AssetService), Story 4

---

## Story 11: Filter Assets by Type

**Story ID**: MS-51
**Priority**: Medium
**Estimate**: 2 points
**Status**: Not Started

**User Story**:
As a user, I want to filter assets by type, so that I can focus on specific kinds of assets when building my spawn.

**Acceptance Criteria**:

- [ ] Filter controls appear in library section
- [ ] Can filter by image, video, audio types
- [ ] Filter state is clearly indicated
- [ ] Can clear filters easily
- [ ] Filters work with search

**Technical Task MS-51-T1**: Add Asset Type Filtering

- Use Epic 1's AssetService for filtering operations
- Implement filter UI with clear state indication
- Combine with search functionality

**Dependencies**: Epic 1 (AssetService), Story 10

---

## Story 12: Add New Assets to Library

**Story ID**: MS-52
**Priority**: Medium
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to add new assets to my library, so that I can expand my available assets for spawns.

**Acceptance Criteria**:

- [ ] "Add Asset" button appears in library section
- [ ] File upload dialog supports drag & drop
- [ ] Asset validation shows clear error messages
- [ ] New assets appear in library immediately
- [ ] Upload progress is shown for large files

**Technical Task MS-52-T1**: Implement Asset Upload

- Use Epic 1's AssetService for library operations
- Integrate with existing asset validation components
- Include preview generation for new assets
- Handle upload errors with clear feedback

**Dependencies**: Epic 1 (AssetService), Story 4

---

## Story 13A: Add Hover and Click Feedback

**Story ID**: MS-53A
**Priority**: Low
**Estimate**: 2 points
**Status**: Not Started

**User Story**:
As a user, I want clear feedback when I interact with assets, so that I understand what actions are available.

**Acceptance Criteria**:

- [ ] Assets highlight when hovered
- [ ] Buttons show hover states
- [ ] Click feedback is immediate
- [ ] Interactive elements are clearly indicated
- [ ] Consistent feedback across all assets

**Technical Task MS-53A-T1**: Implement Interactive Feedback

- Add hover effects on all interactive elements
- Implement consistent click feedback
- Use consistent styling with Epic 2's layout

**Dependencies**: Stories 2, 4

---

## Story 13B: Add Drag & Drop Visual Feedback

**Story ID**: MS-53B
**Priority**: Low
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want clear visual feedback during drag operations, so that I understand where I can drop assets.

**Acceptance Criteria**:

- [ ] Drag preview shows what is being dragged
- [ ] Valid drop zones are highlighted
- [ ] Invalid drop areas are clearly indicated
- [ ] Drop feedback is immediate and clear
- [ ] Drag cancellation is visually obvious

**Technical Task MS-53B-T1**: Enhance Drag & Drop Feedback

- Implement drag previews and drop zone highlighting
- Add visual feedback for valid/invalid drop zones
- Include drag cancellation support

**Dependencies**: Stories 3, 7

---

## Story 14: Add Loading and Success States

**Story ID**: MS-54
**Priority**: Low
**Estimate**: 2 points
**Status**: Not Started

**User Story**:
As a user, I want to see when operations are in progress, so that I know the system is working.

**Acceptance Criteria**:

- [ ] Loading indicators appear during operations
- [ ] Success messages confirm completed actions
- [ ] Error messages explain what went wrong
- [ ] Loading states don't block other interactions
- [ ] Feedback timing feels natural

**Technical Task MS-54-T1**: Implement Operation Feedback

- Add loading states for all async operations
- Implement success/error messaging system
- Ensure feedback doesn't interfere with workflow

**Dependencies**: Stories 2, 4, 7, 8, 12

---

## Story 15: Optimize for Large Libraries

**Story ID**: MS-55
**Priority**: Low
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want smooth performance with large asset libraries, so that the interface remains responsive.

**Acceptance Criteria**:

- [ ] Smooth scrolling with 1000+ assets
- [ ] Search and filter remain fast
- [ ] Drag operations don't lag
- [ ] Memory usage stays reasonable
- [ ] Initial load time is acceptable

**Technical Task MS-55-T1**: Implement Performance Optimizations

- Add virtualization for large asset lists
- Implement lazy loading for asset previews
- Optimize drag & drop performance
- Use React.memo and useMemo for efficiency

**Dependencies**: Stories 4, 10, 11

---

## Story Dependencies

```text
Story 1 (Right Panel Infrastructure)
├── Story 2 (Show Assets in Spawn)
│   ├── Story 3 (Reorder Assets)
│   ├── Story 8 (Remove Assets)
│   └── Story 9 (Configure Asset Settings)
├── Story 4 (Display Asset Library)
│   ├── Story 5 (Collapsible Library)
│   ├── Story 7 (Assign Assets) [also depends on Story 2]
│   ├── Story 10 (Library Search)
│   │   └── Story 11 (Filter by Type)
│   └── Story 12 (Add New Assets)
├── Story 6 (Space Control) [depends on Stories 2, 4]
├── Story 13A (Hover/Click Feedback) [depends on Stories 2, 4]
├── Story 13B (Drag Feedback) [depends on Stories 3, 7]
├── Story 14 (Loading/Success States) [depends on Stories 2, 4, 7, 8, 12]
└── Story 15 (Performance) [depends on Stories 4, 10, 11]
```

## Definition of Done

Each story is complete when:

- [ ] User story acceptance criteria are met
- [ ] Technical tasks are implemented and tested
- [ ] Integration with other epics works correctly
- [ ] Performance meets expectations for intended use
- [ ] Code is reviewed and follows project standards
- [ ] No TypeScript errors or warnings
- [ ] Basic accessibility requirements are met

## Vision Validation Checklist

- [ ] Right panel focuses on asset selection and assignment ✓
- [ ] Asset configuration happens in center panel ✓ (Story 9)
- [ ] Dynamic two-section layout with user control ✓ (Stories 1, 5, 6)
- [ ] Asset counter badges for clear overview ✓ (Stories 2, 4)
- [ ] Drag & drop workflows are comprehensive ✓ (Stories 3, 7, 13B)
- [ ] Asset library is searchable and manageable ✓ (Stories 10, 11, 12)
- [ ] Performance optimized for large libraries ✓ (Story 15)
- [ ] Clear visual feedback for all interactions ✓ (Stories 13A, 13B, 14)

## Technical Standards

- **Integration**: Seamless integration with Epic 1 services and Epic 2 panel state
- **Performance**: Smooth performance with 1000+ assets and 100+ spawns
- **Accessibility**: Keyboard navigation and screen reader support
- **Visual Feedback**: Clear feedback for all user interactions
- **Error Handling**: Comprehensive error handling with user-friendly messages
- **TypeScript**: Strict mode with proper interfaces
- **Responsive Design**: Works within Epic 2's 25% panel width constraints

## Integration Points with Other Epics

- **Epic 1**: Uses SpawnService and AssetService for all data operations
- **Epic 2**: Renders within right panel constraints, uses panel state management
- **Epic 3**: Responds to spawn selection changes
- **Epic 4**: Sends asset configuration requests to unified workspace
- **Epic 6**: Will integrate with profile management for context switching

## Critical Success Factors

- **Asset Configuration Integration**: Seamless integration with Epic 4's unified workspace (Story 9)
- **Cross-Panel Communication**: Proper integration with Epic 2's panel state management
- **Dynamic Space Management**: Smart space allocation with user control (Stories 5, 6)
- **Drag & Drop Workflows**: Comprehensive drag & drop with clear feedback (Stories 3, 7, 13B)
- **Performance Optimization**: Smooth performance with large datasets (Story 15)
- **User-Focused Design**: Clear, practical interface focused on asset management workflow

## Notes

- Epic 5 connects spawn workflow end-to-end
- Right panel is primary asset management interface
- Asset configuration happens in center panel (Epic 4 integration)
- Focus on practical functionality over visual flourishes
- Design for scalability (100s of spawns, 1000s of assets)
- Build foundation for future bulk operations and advanced features
