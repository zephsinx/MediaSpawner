# Epic 4: Asset Assignment - User Stories

## Epic Overview

**Epic ID**: MS-4
**Epic**: Asset Assignment  
**Priority**: 4 (Critical Path - HIGH VALUE)
**Status**: Not Started

**User Value**: ✨ **Spawns become functional containers for media assets with support for local files and URLs - making spawns actually useful for media management!**

Enable users to assign assets to spawns, supporting both local file paths and URLs. Start with a simple "Add to Spawn" button workflow, then add drag & drop later.

---

## Story 1: Set Up Asset Management Panel

**Story ID**: MS-32
**Priority**: High
**Estimate**: 3 points
**Status**: Completed

**User Story**:
As a user, I want the right panel to display asset management, so that I can see spawn assets and available library assets in organized areas.

**Acceptance Criteria**:

- [ ] Right panel renders with two distinct sections
- [ ] Top section shows "Assets in Current Spawn"
- [ ] Bottom section shows "Asset Library"
- [ ] Sections have clear visual separation
- [ ] Panel works within 25% width constraints
- [ ] Layout adapts to different screen heights

**Technical Tasks**: Create Right Panel Asset Management Structure

- Build component within Epic 2's panel layout constraints
- Create section containers with proper CSS structure
- Integrate with Epic 2's panel state management context
- Set up dynamic section content architecture
- Add basic styling consistent with application design

**Dependencies**: Epic 2 (panel layout, state management)

---

## Story 2: Display Assets in Current Spawn

**Story ID**: MS-33
**Priority**: High
**Estimate**: 3 points
**Status**: Completed

**User Story**:
As a user, I want to see which assets are assigned to my current spawn, so that I understand what will appear when I trigger this spawn.

**Acceptance Criteria**:

- [ ] Section displays assets assigned to selected spawn
- [ ] Each asset shows name, type, and preview thumbnail
- [ ] Asset counter shows total count in section header
- [ ] Empty state appears when no assets are assigned
- [ ] List updates when selecting different spawns
- [ ] Assets display in their spawn order

**Technical Tasks**: Integrate Spawn Asset Display

- Listen for spawn selection changes from Epic 3 via Epic 2's panel state
- Use Epic 1's SpawnService to retrieve spawn assets
- Display asset information with thumbnails and type indicators
- Handle empty spawns and loading states
- Show asset count in section header
- Support asset ordering within spawn

**Dependencies**: Epic 1 (SpawnService), Epic 2 (panel state), Epic 3 (spawn selection), Story 1

---

## Story 3: Display Asset Library

**Story ID**: MS-34
**Priority**: High
**Estimate**: 3 points
**Status**: Completed

**User Story**:
As a user, I want to see all available assets in the library section, so that I can choose assets to add to my spawn.

**Acceptance Criteria**:

- [ ] Library section shows all available assets
- [ ] Assets display with thumbnails and names
- [ ] Asset counter shows total library size
- [ ] Assets scroll when they exceed section height
- [ ] Asset types are clearly indicated (image, video, audio)
- [ ] Library updates when assets are added/removed

**Technical Tasks**: Implement Asset Library Display

- Use Epic 1's AssetService for library operations
- Implement asset thumbnails and type indicators
- Handle large asset libraries with scroll
- Show asset count in section header
- Add type-based visual indicators
- Ensure smooth scrolling performance

**Dependencies**: Epic 1 (AssetService), Story 1

---

## Story 4: Add URL Assets to Library

**Story ID**: MS-35
**Priority**: High
**Estimate**: 4 points
**Status**: Completed

**User Story**:
As a user, I want to add assets using URLs, so that I can include web-hosted media in my spawns without downloading files locally.

**Acceptance Criteria**:

- [ ] Can add assets to library using URLs (http/https)
- [ ] URL validation ensures proper format and accessibility
- [ ] URL assets display with appropriate thumbnails/previews
- [ ] Can distinguish between local file and URL assets
- [ ] URL assets work the same as local assets in spawns
- [ ] Clear error messages for invalid or inaccessible URLs

**Technical Tasks**: Implement URL Asset Support

- Extend AssetService from Epic 1 to support URL assets
- Add URL validation (format, accessibility checks)
- Implement URL asset preview generation
- Add visual indicators to distinguish URL vs local file assets
- Handle URL validation errors gracefully
- Ensure URL assets integrate with existing asset workflows

**Dependencies**: Epic 1 (AssetService), Story 3

---

## Story 5: Assign Assets to Spawns via Drag & Drop

**Story ID**: MS-36
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started (Deferred)

**User Story**:
As a user, I want to drag assets from the library to my spawn, so that I can quickly build my spawn configuration.

**Acceptance Criteria**:

- [ ] Can drag assets from library to spawn section
- [ ] Drop zone is clearly indicated when dragging
- [ ] Asset appears in spawn list immediately after drop
- [ ] Prevents adding duplicate assets to same spawn
- [ ] Shows success feedback after assignment
- [ ] Works with both local file and URL assets

**Technical Tasks**: Implement Asset Assignment Drag & Drop

- Use Epic 1's SpawnService to assign assets to spawns
- Implement drag previews and drop zone indicators
- Handle assignment errors and duplicate prevention
- Provide clear success/error feedback
- Support both local file and URL asset assignment
- Add visual feedback during drag operations

**Dependencies**: Epic 1 (SpawnService), Stories 2, 3, 4

---

## Story 5a: Assign Assets to Spawns via Click-to-Add (Initial)

**Story ID**: MS-37
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to add assets to a spawn using a clear button, so that I can build spawns without relying on drag & drop.

**Acceptance Criteria**:

- [ ] Each library asset has an "Add to Spawn" control
- [ ] Clicking the control adds the asset to the selected spawn immediately
- [ ] Prevents duplicate assignments to the same spawn
- [ ] Shows success feedback after assignment
- [ ] Works for both local file and URL assets

**Technical Tasks**: Implement Click-to-Add Assignment

- Add action control to each library item
- Use SpawnService to assign assets to the selected spawn
- Handle duplicate prevention and errors gracefully
- Provide clear success/error feedback
- Integrate with panel state to target the current spawn

**Dependencies**: Epic 1 (SpawnService), Stories 2, 3

---

## Story 6: Remove Assets from Spawns

**Story ID**: MS-38
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

**Technical Tasks**: Implement Asset Removal

- Use Epic 1's SpawnService to remove assets from spawns
- Add confirmation dialog with clear messaging
- Handle removal errors gracefully
- Ensure asset remains in library after removal
- Provide clear success feedback

**Dependencies**: Epic 1 (SpawnService), Story 2

---

## Story 7: Reorder Assets Within Spawn

**Story ID**: MS-39
**Priority**: Medium
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

**Technical Tasks**: Implement Asset Reordering

- Use drag & drop library for asset reordering within spawn
- Call Epic 1's SpawnService to save new asset order
- Include visual feedback for drag operations
- Handle reordering errors gracefully
- Ensure order persists across spawn selection changes

**Dependencies**: Epic 1 (SpawnService), Story 2

---

## Story 8: Add Basic Asset Validation

**Story ID**: MS-40
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want clear validation when adding assets, so that I know immediately if an asset input looks valid.

**Acceptance Criteria**:

- [ ] Local file paths are validated for format only (no existence checks)
- [ ] URLs are validated for proper format only (no fetch/accessibility checks required)
- [ ] Asset types are detected automatically (image, video, audio)
- [ ] Clear error messages explain validation failures
- [ ] Invalid assets cannot be added to library or spawns
- [ ] Validation happens before assets are added to library

**Technical Tasks**: Implement Asset Validation System

- Add file path format validation for local assets
- Add URL format validation (no network checks)
- Implement automatic asset type detection
- Create clear error messaging for validation failures
- Prevent invalid assets from being added to library or spawns
- Use existing asset validation patterns from codebase

**Dependencies**: Epic 1 (AssetService), Stories 3, 4

---

## Story 9: Add Upload Assets to Library

**Story ID**: MS-41
**Priority**: Low
**Estimate**: 4 points
**Status**: Not Started

**User Story**:
As a user, I want to add new assets to my library by uploading or selecting files, so that I can expand my available assets for spawns.

**Acceptance Criteria**:

- [ ] "Add Asset" button appears in library section
- [ ] File selection dialog supports common media formats
- [ ] Can add multiple assets at once
- [ ] Asset validation shows clear error messages
- [ ] New assets appear in library immediately
- [ ] Can add both file paths and URLs through the interface

**Technical Tasks**: Implement Asset Upload Interface

- Add "Add Asset" button to library section
- Create file selection dialog for local assets
- Add URL input option for web assets
- Integrate with asset validation from Story 8
- Handle multiple asset addition
- Provide clear feedback for successful additions

**Dependencies**: Epic 1 (AssetService), Stories 3, 4, 8

---

## Story Dependencies

```text
Story 1 (Right Panel Infrastructure)
├── Story 2 (Show Assets in Spawn)
│   ├── Story 6 (Remove Assets)
│   └── Story 7 (Reorder Assets)
├── Story 3 (Display Asset Library)
│   ├── Story 4 (URL Asset Support)
│   ├── Story 8 (Asset Validation)
│   └── Story 9 (Add Assets to Library)
├── Story 5a (Click-to-Add Assignment) [depends on Stories 2, 3]
└── Story 5 (Drag & Drop Assignment) [depends on Stories 2, 3, 4]
```

## Definition of Done

Each story is complete when:

- [ ] Component implemented and peer reviewed
- [ ] Integration with Epic 1 services works correctly
- [ ] Drag & drop functionality works smoothly
- [ ] Both local file and URL assets supported
- [ ] Asset validation provides clear feedback
- [ ] Error handling covers all edge cases
- [ ] Visual design matches practical application style
- [ ] Ready for asset configuration in Epic 5

## Vision Validation Checklist

- [ ] Asset assignment with drag & drop workflow ✓ (Story 5)
- [ ] Support for local file paths ✓ (Stories 3, 8, 9)
- [ ] Support for URLs ✓ (Stories 4, 8)
- [ ] Asset library display and management ✓ (Stories 3, 9)
- [ ] Asset removal and reordering ✓ (Stories 6, 7)
- [ ] Asset validation for both types ✓ (Story 8)
- [ ] Right panel asset management focus ✓ (Story 1)

## Critical Success Factors

- **Functional Spawns**: After this epic, spawns actually contain media assets
- **Dual Asset Support**: Both local files and URLs work seamlessly
- **Intuitive Assignment**: Drag & drop makes asset assignment natural
- **Proper Validation**: Clear feedback prevents invalid asset addition
- **Clean Interface**: Asset management doesn't clutter the spawn workflow

## Integration Points with Other Epics

- **Epic 1**: Uses SpawnService and AssetService for all asset operations
- **Epic 2**: Renders within right panel constraints, uses panel state management
- **Epic 3**: Responds to spawn selection changes to show relevant assets
- **Epic 5**: Provides asset assignment foundation for detailed configuration
- **Epic 6**: Assets will be configurable with trigger-specific settings

## User Value Delivered

After Epic 4, users can:

- ✅ Create and manage spawns (Epic 3)
- ✅ Add local files and URLs to spawns
- ✅ Organize assets within spawns
- ✅ Build functional media collections

This makes spawns genuinely useful for media management, delivering core value that justifies the application's existence.

## Notes

- Focus on making spawns functional containers for media assets
- Support both local files and URLs as specified in user requirements
- Keep drag & drop interface intuitive and responsive
- Build foundation for detailed asset configuration in Epic 5
- Ensure asset validation prevents common errors
- Design for scalability with large asset libraries
