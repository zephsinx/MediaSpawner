# Epic 7: Legacy Cleanup & Terminology Updates - User Stories

## Epic Overview

**Epic**: Legacy Cleanup & Terminology Updates
**Priority**: 7
**Status**: Not Started

Remove legacy components and update terminology throughout the application from "Configuration/Asset Group" to "Spawn Profile/Spawn". Clean up unused code and ensure consistent spawn-centric terminology throughout the interface.

---

## Story 1: Remove Legacy Dashboard Page

**Story ID**: MS-64
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want the application to use the new spawn-centric interface, so that I can work with the updated workflow without confusion from old terminology and interfaces.

**Acceptance Criteria**:

- [ ] Dashboard page no longer appears in the application
- [ ] Application redirects to the new spawn workflow when I visit the root URL
- [ ] No broken links or references to the old dashboard exist
- [ ] All dashboard-related components are removed from the codebase
- [ ] Application starts smoothly without dashboard dependencies

**Technical Task MS-64-T1**: Remove Dashboard Component and References

- Delete DashboardPage.tsx component and related files
- Remove dashboard route from App.tsx routing structure
- Update root URL redirect to new spawn-centric workflow structure
- Remove any dashboard-related imports and dependencies
- Clean up any utility functions or hooks specific to dashboard
- Ensure no broken references remain in the codebase

**Dependencies**: Epic 2 (new routing structure), Epic 6 (profile management)

---

## Story 2: Remove Legacy Configuration Editor

**Story ID**: MS-65
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to use the new unified configuration workspace, so that I have a consistent editing experience without legacy interfaces.

**Acceptance Criteria**:

- [ ] Old configuration editor page no longer exists in the application
- [ ] Configuration editing happens through the new unified workspace
- [ ] No broken links or references to the old config editor exist
- [ ] All configuration editor components are removed from the codebase
- [ ] New spawn editing workflow handles all previous configuration editor functionality

**Technical Task MS-65-T1**: Remove ConfigEditor Component and References

- Delete ConfigEditorPage.tsx component and related files
- Remove config editor route from App.tsx routing structure
- Remove any config editor imports and dependencies
- Clean up configuration editor utility functions
- Ensure Epic 4's unified workspace replaces all config editor functionality
- Remove any references to /config route throughout codebase

**Dependencies**: Epic 4 (unified workspace functionality)

---

## Story 3: Replace Application Layout and Navigation

**Story ID**: MS-66
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want the new three-panel layout interface, so that I can work efficiently with the spawn-centric workflow design.

**Acceptance Criteria**:

- [ ] Application uses the new three-panel layout instead of sidebar navigation
- [ ] Old sidebar navigation is completely removed
- [ ] Header shows spawn profile selector as designed
- [ ] New layout integrates properly with all implemented epics
- [ ] Application maintains responsive design and usability
- [ ] All navigation flows work correctly with the new layout

**Technical Task MS-66-T1**: Replace Layout Component with Three-Panel Design

- Replace existing Layout.tsx with Epic 2's three-panel layout component
- Remove old sidebar navigation and related styling
- Integrate with Epic 2's header and panel state management
- Update App.tsx to use new layout structure
- Remove old navigation item definitions and routing logic
- Ensure proper integration with Epic 6's profile management
- Test layout responsiveness and panel interactions

**Dependencies**: Epic 2 (three-panel layout), Epic 6 (header profile management)

---

## Story 4: Remove ConfigurationService and Update Dependencies

**Story ID**: MS-67
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want consistent data management through the new spawn services, so that my data operations are reliable and follow the new architecture.

**Acceptance Criteria**:

- [ ] ConfigurationService no longer exists in the codebase
- [ ] All functionality is handled by SpawnProfileService and SpawnService
- [ ] No broken references or import errors exist
- [ ] Data operations work consistently through new services
- [ ] Application performance remains optimal
- [ ] No legacy configuration data structures remain

**Technical Task MS-67-T1**: Remove ConfigurationService and Update References

- Delete configurationService.ts file
- Update all imports to use SpawnProfileService and SpawnService from Epic 1
- Remove Configuration and AssetGroup type definitions
- Update any remaining components that reference old service methods
- Clean up any configuration-related utility functions
- Ensure all CRUD operations work through new service architecture
- Update any cache invalidation or storage logic

**Dependencies**: Epic 1 (SpawnProfileService, SpawnService)

---

## Story 5: Update Import/Export for Spawn Architecture

**Story ID**: MS-68
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to export and import my spawn profiles and configurations, so that I can backup and share my spawn setups using the new data structure.

**Acceptance Criteria**:

- [ ] Can export spawn profiles in the new SpawnProfile/Spawn format
- [ ] Can import spawn profiles that use the new data structure
- [ ] Export includes all spawn-specific asset settings and inheritance
- [ ] Import properly validates and creates spawn profiles and spawns
- [ ] Legacy configuration imports are handled or clearly unsupported
- [ ] Import/export integrates with new profile management workflow

**Technical Task MS-68-T1**: Update ImportExportService for New Architecture

- Update ImportExportService to use SpawnProfileService instead of ConfigurationService
- Implement export functionality for SpawnProfile and Spawn data structures
- Implement import functionality with proper validation for new data format
- Add data migration support for any existing configuration data if needed
- Update export format to include spawn-specific asset settings
- Update import validation to handle new SpawnProfile/Spawn structure
- Integrate with Epic 6's profile management for import workflow
- Handle edge cases and provide clear error messaging

**Dependencies**: Epic 1 (SpawnProfileService, Spawn types), Epic 6 (profile management)

---

## Story 6: Integrate Asset Library with Spawn Workflow

**Story ID**: MS-69
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want the asset library to work seamlessly with the spawn workflow, so that I can manage assets within the new application structure.

**Acceptance Criteria**:

- [ ] Asset library integrates with the new spawn-centric workflow
- [ ] Asset library works within the new layout structure
- [ ] Asset operations are consistent with spawn asset management
- [ ] No terminology conflicts between asset library and spawn workflow exist
- [ ] Asset library maintains its functionality while supporting new architecture

**Technical Task MS-69-T1**: Update Asset Library Integration

- Update AssetLibraryPage.tsx to work with new layout structure if needed
- Ensure asset library operations work with Epic 5's asset management
- Update any asset library references to use new service architecture
- Remove any configuration-related references from asset library
- Ensure asset library integrates properly with spawn asset workflows
- Update asset library to work within Epic 2's routing structure
- Consider whether asset library needs dedicated route or integration with main workflow

**Dependencies**: Epic 2 (layout, routing), Epic 5 (asset management)

---

## Story 7: Update Routing to Spawn-Centric Structure

**Story ID**: MS-70
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want URLs that reflect the spawn-centric workflow, so that I can bookmark and navigate to specific spawn profiles and spawns.

**Acceptance Criteria**:

- [ ] Application uses the new `/profile/:profileId/spawn/:spawnId?` URL structure
- [ ] Old routes no longer exist or redirect appropriately
- [ ] URL navigation works correctly with browser back/forward buttons
- [ ] Bookmarked URLs work correctly with the new structure
- [ ] Invalid URLs redirect gracefully to valid spawn workflow states
- [ ] Settings page remains accessible with appropriate routing

**Technical Task MS-70-T1**: Implement New Routing Structure

- Update App.tsx to use Epic 2's new routing structure completely
- Remove old routes: `/`, `/assets`, `/config`
- Implement new route structure: `/profile/:profileId/spawn/:spawnId?`
- Add route for settings page: `/settings`
- Implement proper redirects from old URLs to new structure
- Set up default route handling for new profile workflow
- Integrate with Epic 2's routing and Epic 6's profile management
- Test all navigation scenarios and URL edge cases

**Dependencies**: Epic 2 (routing system), Epic 6 (profile management)

---

## Story 8: Remove Legacy Type Definitions

**Story ID**: MS-71
**Priority**: Low
**Estimate**: 2 points
**Status**: Not Started

**User Story**:
As a user, I want a clean and consistent application, so that the underlying code reflects the new spawn-centric architecture without legacy remnants.

**Acceptance Criteria**:

- [ ] No Configuration or AssetGroup types exist in the codebase
- [ ] All type definitions use the new Spawn and SpawnProfile architecture
- [ ] TypeScript compilation is clean with no legacy type references
- [ ] Import statements are clean and consistent
- [ ] No unused type definitions remain

**Technical Task MS-71-T1**: Clean Up Legacy Type Definitions

- Remove Configuration interface and related types from types/media.ts
- Remove AssetGroup interface and related types
- Update any remaining type imports throughout codebase
- Clean up any utility types related to legacy configuration structure
- Ensure all type definitions align with Epic 1's new architecture
- Remove any unused type definitions or imports
- Verify TypeScript compilation is clean

**Dependencies**: Epic 1 (new type definitions)

---

## Story 9: Validate Complete Integration

**Story ID**: MS-72
**Priority**: Medium
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want a fully functional spawn-centric application, so that I can complete all spawn management workflows without encountering legacy components or broken functionality.

**Acceptance Criteria**:

- [ ] Can complete full spawn workflow from profile creation to spawn configuration
- [ ] All panel interactions work correctly across the application
- [ ] Profile switching resets context appropriately
- [ ] Asset management integrates properly with spawn workflow
- [ ] Import/export works with new data structures
- [ ] No legacy terminology appears anywhere in the interface
- [ ] Application performance meets expectations for target data volumes

**Technical Task MS-72-T1**: Conduct End-to-End Integration Testing

- Test complete spawn workflow from profile creation through spawn configuration
- Verify all Epic 1-6 integrations work correctly after cleanup
- Test profile switching and context reset functionality
- Verify asset management workflow integration
- Test import/export functionality with new data structures
- Check for any remaining legacy terminology in UI
- Performance test with target data volumes (100s of spawns, 1000s of assets)
- Validate all acceptance criteria from previous epics still work
- Test edge cases and error scenarios

**Dependencies**: All previous stories in Epic 7

---

## Story Dependencies

```text
Story 1 (Remove Dashboard) [Epic 2, 6]
├── Story 2 (Remove ConfigEditor) [Epic 4]
├── Story 3 (Replace Layout) [Epic 2, 6]
├── Story 4 (Remove ConfigurationService) [Epic 1]
├── Story 5 (Update Import/Export) [Epic 1, 6]
├── Story 6 (Update Asset Library) [Epic 2, 5]
├── Story 7 (Update Routing) [Epic 2, 6]
├── Story 8 (Remove Legacy Types) [Epic 1]
└── Story 9 (Integration Validation) [All previous stories]
```

## Definition of Done

Each story is complete when:

- [ ] User story acceptance criteria are met
- [ ] Technical tasks are implemented and tested
- [ ] No legacy components or references remain
- [ ] TypeScript compilation clean with no errors
- [ ] Integration with all previous epics works correctly
- [ ] All spawn-centric workflows function properly
- [ ] No broken links or navigation issues exist
- [ ] Performance meets expectations
- [ ] Code is reviewed and follows project standards
- [ ] Ready for Epic 8 polish and optimization

## Vision Validation Checklist

- [ ] Spawn-centric terminology used consistently throughout ✓ (All stories)
- [ ] Legacy components completely removed ✓ (Stories 1, 2, 4, 8)
- [ ] Three-panel layout replaces old navigation ✓ (Story 3)
- [ ] New routing structure implemented ✓ (Story 7)
- [ ] Import/export supports new architecture ✓ (Story 5)
- [ ] Asset library integrates with spawn workflow ✓ (Story 6)
- [ ] Clean, updated application with consistent functionality ✓ (Story 9)
- [ ] No backwards compatibility issues ✓ (All stories)

## Technical Standards

- **Clean Removal**: Complete removal of legacy components without broken references
- **Service Integration**: All functionality uses Epic 1's new services exclusively
- **Type Safety**: Clean TypeScript compilation with proper type definitions
- **Routing**: New URL structure properly implemented and tested
- **Data Migration**: Import/export handles new data structures correctly
- **Performance**: No performance degradation from cleanup operations
- **Integration Testing**: End-to-end workflow validation

## Integration Points with Other Epics

- **Epic 1**: Uses new service architecture exclusively, removes old type definitions
- **Epic 2**: Implements new layout and routing structure, removes old navigation
- **Epic 3**: Maintains spawn list functionality after layout changes
- **Epic 4**: Ensures unified workspace remains functional after service cleanup
- **Epic 5**: Integrates asset management with updated architecture
- **Epic 6**: Ensures profile management works after layout and routing updates
- **Epic 8**: Provides clean foundation for final polish and optimization

## Critical Success Factors

- **Complete Legacy Removal**: No old components or services remain (Stories 1, 2, 4, 8)
- **Layout Transition**: Smooth transition to three-panel layout (Story 3)
- **Service Architecture**: Clean transition to new services without data loss (Story 4)
- **Import/Export Functionality**: Data portability with new structure (Story 5)
- **Routing Implementation**: New URL structure works correctly (Story 7)
- **End-to-End Validation**: Complete workflow verification (Story 9)

## Notes

- No backwards compatibility required - clean slate approach
- Focus on complete removal rather than gradual migration
- Ensure no broken references or imports after cleanup
- Validate all Epic 1-6 functionality remains intact after cleanup
- Test thoroughly with target data volumes
- Prepare foundation for Epic 8 polish and optimization
- Clean codebase should reflect spawn-centric architecture completely
