# Epic 3: Spawn List & Navigation - User Stories

## Epic Overview

**Epic**: Spawn List & Navigation  
**Priority**: 3 (Critical Path)  
**Status**: Not Started  

Build spawn list component with enable/disable functionality, search/filter capabilities, and efficient navigation for handling 100s of spawns in the left panel.

---

## Story 1: Create Basic Spawn List Component

**Story ID**: MS-16  
**Priority**: High  
**Estimate**: 5 points  
**Status**: Not Started  

**User Story**:  
As a user, I want to see a list of all spawns in my active profile, so that I can quickly navigate and select spawns to work with.

**Acceptance Criteria**:

- [ ] Spawn list component renders in left panel (25% width)
- [ ] Displays spawn information: Name, Asset Count, Status (enabled/disabled)
- [ ] Compact list design for efficient scanning
- [ ] Spawn selection highlights the selected spawn
- [ ] Integrates with panel state management from Epic 2
- [ ] Empty state when no spawns exist in profile
- [ ] Loading state while spawns are being fetched

**Technical Notes**:

- Use SpawnService from Epic 1 to fetch spawns
- Integrate with panel state management for selection
- Follow existing component patterns in codebase
- Consider virtualization for large lists (future optimization)

**Dependencies**: Epic 1 (SpawnService), Epic 2 (panel state management)

---

## Story 2: Implement Enable/Disable Toggle Functionality

**Story ID**: MS-17  
**Priority**: High  
**Estimate**: 3 points  
**Status**: Not Started  

**User Story**:  
As a user, I want to enable/disable spawns with toggle switches, so that I can quickly control which spawns are active without editing them.

**Acceptance Criteria**:

- [ ] Toggle switch for each spawn in the list
- [ ] Visual states: enabled (normal text), disabled (grayed out)
- [ ] Disabled spawns remain inline (not grouped separately)
- [ ] Toggle immediately updates spawn status via SpawnService
- [ ] Visual feedback during toggle operation
- [ ] Maintains spawn list order regardless of enabled/disabled state
- [ ] Keyboard accessibility for toggles

**Technical Notes**:

- Use SpawnService.enableSpawn() and disableSpawn() methods
- Implement optimistic UI updates with error handling
- Consider subtle disabled badge/icon for additional clarity
- Ensure toggle switches are touch-friendly for desktop use

**Dependencies**: Epic 1 (SpawnService enable/disable methods), Story 1

---

## Story 3: Add Spawn Selection and Navigation

**Story ID**: MS-18  
**Priority**: High  
**Estimate**: 5 points  
**Status**: Not Started  

**User Story**:  
As a user, I want to select spawns from the list to edit them, so that the spawn editor loads the selected spawn's configuration.

**Acceptance Criteria**:

- [ ] Click spawn to select it (highlighted background)
- [ ] Selected spawn communicates to center panel via state management
- [ ] URL updates to reflect selected spawn (/profile/:profileId/spawn/:spawnId)
- [ ] Keyboard navigation (arrow keys, enter to select)
- [ ] Maintains selection when switching between spawns
- [ ] Handles invalid spawn selection gracefully
- [ ] Clear visual indication of selected spawn

**Technical Notes**:

- Integrate with panel state management from Epic 2
- Update URL routing to reflect selection
- Consider persisting last selected spawn per profile
- Implement keyboard event handlers for navigation

**Dependencies**: Epic 2 (panel state, routing), Stories 1, 2

---

## Story 4: Implement Search and Filter Functionality

**Story ID**: MS-19  
**Priority**: Medium  
**Estimate**: 5 points  
**Status**: Not Started  

**User Story**:  
As a user, I want to search and filter my spawns, so that I can quickly find specific spawns when I have many in my profile.

**Acceptance Criteria**:

- [ ] Search input at top of spawn list
- [ ] Real-time filtering as user types
- [ ] Search by spawn name (case-insensitive)
- [ ] Filter options: All, Enabled Only, Disabled Only
- [ ] Clear search functionality
- [ ] Maintains selection if selected spawn matches filter
- [ ] Shows result count or "no results" state
- [ ] Keyboard shortcuts (Ctrl+F to focus search)

**Technical Notes**:

- Implement client-side filtering for performance
- Use debounced search input to avoid excessive filtering
- Consider highlighting search terms in results
- Ensure search works with large spawn lists efficiently

**Dependencies**: Stories 1, 2, 3

---

## Story 5: Add "New Spawn" Creation Workflow

**Story ID**: MS-20  
**Priority**: Medium  
**Estimate**: 3 points  
**Status**: Not Started  

**User Story**:  
As a user, I want to create new spawns directly from the spawn list, so that I can quickly add spawns to my profile.

**Acceptance Criteria**:

- [ ] "New Spawn" button prominently placed in spawn list
- [ ] Creates new spawn with default settings via SpawnService
- [ ] Automatically selects newly created spawn
- [ ] Navigates to spawn editor for immediate configuration
- [ ] Handles spawn creation errors gracefully
- [ ] New spawn appears in list immediately
- [ ] Assigns default name (e.g., "New Spawn 1", "New Spawn 2")

**Technical Notes**:

- Use SpawnService.createSpawn() with sensible defaults
- Integrate with panel state to select new spawn
- Consider inline editing for spawn name after creation
- Ensure new spawn is visible (not filtered out by search)

**Dependencies**: Epic 1 (SpawnService), Stories 1, 3

---

## Story 6: Optimize Performance for Large Spawn Lists

**Story ID**: MS-21  
**Priority**: Medium  
**Estimate**: 5 points  
**Status**: Not Started  

**User Story**:  
As a user with many spawns, I want the spawn list to remain responsive and fast, so that I can efficiently navigate even with 100s of spawns.

**Acceptance Criteria**:

- [ ] Smooth scrolling with 100+ spawns
- [ ] Fast search/filter operations
- [ ] Efficient re-rendering when spawns change
- [ ] Minimal memory usage for large lists
- [ ] Quick spawn selection response
- [ ] Performance benchmarks: <100ms for search, <50ms for selection
- [ ] Handles spawn list updates without losing scroll position

**Technical Notes**:

- Consider React.memo for spawn list items
- Implement efficient filtering algorithms
- Use React keys properly for list rendering
- Consider virtual scrolling if needed (react-window)
- Profile performance with large datasets

**Dependencies**: Stories 1, 2, 3, 4

---

## Story 7: Add Spawn Information Display

**Story ID**: MS-22  
**Priority**: Low  
**Estimate**: 3 points  
**Status**: Not Started  

**User Story**:  
As a user, I want to see key information about each spawn in the list, so that I can quickly understand what each spawn contains without opening it.

**Acceptance Criteria**:

- [ ] Display asset count for each spawn
- [ ] Show abbreviated trigger information (if configured)
- [ ] Display last modified timestamp
- [ ] Compact format that doesn't clutter the list
- [ ] Tooltips for additional information on hover
- [ ] Consistent formatting across all spawn items
- [ ] Information updates when spawn is modified

**Technical Notes**:

- Design compact information layout
- Consider icons for different asset types
- Implement hover tooltips for detailed information
- Ensure information display doesn't impact performance

**Dependencies**: Stories 1, 2, 3

---

## Story Dependencies

```text
Story 1 (Basic List) 
├── Story 2 (Enable/Disable)
├── Story 3 (Selection/Navigation)
│   ├── Story 4 (Search/Filter)
│   ├── Story 5 (New Spawn)
│   └── Story 7 (Information Display)
└── Story 6 (Performance) [depends on stories 1-4]
```

## Definition of Done

Each story is complete when:

- [ ] Component implemented and peer reviewed
- [ ] Integration with Epic 1 services works correctly
- [ ] Panel state management integration functional
- [ ] Performance benchmarks met for large spawn lists
- [ ] Keyboard accessibility implemented
- [ ] Visual design matches practical, uncluttered vision
- [ ] Error handling and edge cases covered
- [ ] Ready for integration with spawn editor (Epic 4)

## Vision Validation Checklist

- [ ] Enable/disable toggle switches with visual states ✓ (Story 2)
- [ ] Compact list design for efficient scanning ✓ (Stories 1, 7)
- [ ] Disabled spawns grayed out inline (not grouped) ✓ (Story 2)
- [ ] Search/filter for large spawn lists ✓ (Story 4)
- [ ] Efficient navigation for 100s of spawns ✓ (Stories 3, 6)
- [ ] "New Spawn" creation workflow ✓ (Story 5)
- [ ] Selected spawn highlighting ✓ (Story 3)
- [ ] Practical, uncluttered interface ✓ (All stories)

## Technical Standards

- **Performance**: Handle 100s of spawns smoothly
- **Accessibility**: Keyboard navigation and screen reader support
- **State Management**: Proper integration with panel state from Epic 2
- **Service Integration**: Use SpawnService methods from Epic 1
- **Visual Design**: Clean, practical styling with Tailwind CSS
- **Error Handling**: Graceful handling of service failures and edge cases

## Integration Points with Other Epics

- **Epic 1**: Uses SpawnService for all spawn operations
- **Epic 2**: Integrates with panel state management and routing
- **Epic 4**: Provides spawn selection for spawn editor
- **Epic 6**: Will integrate with profile switching functionality

## Performance Targets

- **Search Response**: <100ms for filtering 100+ spawns
- **Selection Response**: <50ms for spawn selection
- **Scroll Performance**: Smooth scrolling with large lists
- **Memory Usage**: Efficient rendering without memory leaks

## Notes

- Focus on practical functionality over visual flourishes
- Design for desktop users managing streaming configurations
- Ensure scalability for power users with many spawns
- Maintain consistency with existing application patterns
- Consider future bulk operations in component design
