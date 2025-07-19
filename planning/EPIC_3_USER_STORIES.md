# Epic 3: Spawn List & Navigation - User Stories

## Epic Overview

**Epic ID**: MS-3
**Epic**: Spawn List & Navigation
**Priority**: 3 (Critical Path)
**Status**: Not Started

Build spawn list component with enable/disable functionality, search/filter capabilities, and efficient navigation for handling 100s of spawns in the left panel.

---

## Story 1: View All Spawns in My Profile

**Story ID**: MS-16
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to see a list of all spawns in my active profile, so that I can quickly navigate and select spawns to work with.

**Acceptance Criteria**:

- [ ] Can see all spawns in my current profile organized in a list
- [ ] Each spawn shows its name, number of assets, and enabled/disabled status
- [ ] List design is compact for efficient scanning
- [ ] Can identify which spawn is currently selected
- [ ] See clear message when no spawns exist in profile
- [ ] List shows loading state while spawns are being retrieved
- [ ] Spawn information updates when I make changes

**Technical Task MS-16-T1**: Implement Spawn List Component

- Build spawn list component that renders in left panel (25% width)
- Use SpawnService from Epic 1 to fetch spawns
- Integrate with panel state management from Epic 2 for selection
- Display spawn information: Name, Asset Count, Status (enabled/disabled)
- Implement compact list design for efficient scanning
- Add empty state when no spawns exist in profile
- Add loading state while spawns are being fetched
- Follow existing component patterns in codebase
- Consider virtualization for large lists (future optimization)

**Dependencies**: Epic 1 (SpawnService), Epic 2 (panel state management)

---

## Story 2: Control Spawn Availability Quickly

**Story ID**: MS-17
**Priority**: High
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to enable/disable spawns with toggle switches, so that I can quickly control which spawns are active without editing them.

**Acceptance Criteria**:

- [ ] Can toggle each spawn on/off with a switch control
- [ ] Enabled spawns appear normal, disabled spawns are grayed out
- [ ] Disabled spawns stay in the same list position (not moved to separate section)
- [ ] Toggle changes take effect immediately
- [ ] Can see visual feedback while toggle is processing
- [ ] Spawn list order stays the same regardless of enabled/disabled state
- [ ] Can use keyboard to operate toggles for accessibility

**Technical Task MS-17-T1**: Implement Enable/Disable Toggle System

- Add toggle switch for each spawn in the list
- Use SpawnService.enableSpawn() and disableSpawn() methods from Epic 1
- Implement visual states: enabled (normal text), disabled (grayed out)
- Ensure disabled spawns remain inline (not grouped separately)
- Add visual feedback during toggle operation
- Implement optimistic UI updates with error handling
- Add keyboard accessibility for toggles
- Consider subtle disabled badge/icon for additional clarity
- Ensure toggle switches are touch-friendly for desktop use

**Dependencies**: Epic 1 (SpawnService enable/disable methods), Story 1

---

## Story 3: Select Spawns for Editing

**Story ID**: MS-18
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to select spawns from the list to edit them, so that the spawn editor loads the selected spawn's configuration.

**Acceptance Criteria**:

- [ ] Can click on any spawn to select it
- [ ] Selected spawn is clearly highlighted with different background
- [ ] Selection updates the URL to reflect my current spawn
- [ ] Can navigate with keyboard (arrow keys, enter to select)
- [ ] My selection is maintained when switching between spawns
- [ ] System handles invalid selections gracefully with clear feedback
- [ ] Always know which spawn is currently selected

**Technical Task MS-18-T1**: Implement Spawn Selection and Navigation

- Implement click spawn to select with highlighted background
- Integrate with panel state management from Epic 2 for center panel communication
- Update URL routing to reflect selected spawn (/profile/:profileId/spawn/:spawnId)
- Add keyboard navigation (arrow keys, enter to select)
- Ensure selection is maintained when switching between spawns
- Handle invalid spawn selection gracefully
- Add clear visual indication of selected spawn
- Consider persisting last selected spawn per profile
- Implement keyboard event handlers for navigation

**Dependencies**: Epic 2 (panel state, routing), Stories 1, 2

---

## Story 4: Find Spawns Quickly

**Story ID**: MS-19
**Priority**: Medium
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to search and filter my spawns, so that I can quickly find specific spawns when I have many in my profile.

**Acceptance Criteria**:

- [ ] Can type in search box to find spawns by name
- [ ] Search results appear instantly as I type
- [ ] Can filter to show only enabled spawns, only disabled spawns, or all spawns
- [ ] Can clear my search to see all spawns again
- [ ] My selected spawn stays selected if it matches the current filter
- [ ] Can see how many spawns match my search/filter
- [ ] Can use keyboard shortcut (Ctrl+F) to jump to search box

**Technical Task MS-19-T1**: Implement Search and Filter System

- Add search input at top of spawn list
- Implement real-time filtering as user types
- Add search by spawn name (case-insensitive)
- Create filter options: All, Enabled Only, Disabled Only
- Add clear search functionality
- Maintain selection if selected spawn matches filter
- Show result count or "no results" state
- Add keyboard shortcuts (Ctrl+F to focus search)
- Implement client-side filtering for performance
- Use debounced search input to avoid excessive filtering
- Consider highlighting search terms in results
- Ensure search works with large spawn lists efficiently

**Dependencies**: Stories 1, 2, 3

---

## Story 5: Create New Spawns Easily

**Story ID**: MS-20
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to create new spawns directly from the spawn list, so that I can quickly add spawns to my profile.

**Acceptance Criteria**:

- [ ] Can see a "New Spawn" button in the spawn list area
- [ ] Button creates a new spawn with sensible default settings
- [ ] New spawn is automatically selected after creation
- [ ] Spawn editor opens immediately so I can configure the new spawn
- [ ] See clear error message if spawn creation fails
- [ ] New spawn appears in the list right away
- [ ] New spawn gets a useful default name like "New Spawn 1"

**Technical Task MS-20-T1**: Implement New Spawn Creation Workflow

- Add "New Spawn" button prominently placed in spawn list
- Use SpawnService.createSpawn() from Epic 1 with sensible defaults
- Automatically select newly created spawn
- Navigate to spawn editor for immediate configuration
- Handle spawn creation errors gracefully
- Ensure new spawn appears in list immediately
- Assign default name (e.g., "New Spawn 1", "New Spawn 2")
- Integrate with panel state to select new spawn
- Consider inline editing for spawn name after creation
- Ensure new spawn is visible (not filtered out by search)

**Dependencies**: Epic 1 (SpawnService), Stories 1, 3

---

## Story 6: Work Efficiently with Many Spawns

**Story ID**: MS-21
**Priority**: Medium
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user with many spawns, I want the spawn list to remain responsive and fast, so that I can efficiently navigate even with 100s of spawns.

**Acceptance Criteria**:

- [ ] List scrolls smoothly even with 100+ spawns
- [ ] Search and filtering feel instant
- [ ] Clicking on spawns responds immediately
- [ ] Application doesn't slow down or freeze with large spawn lists
- [ ] List position is maintained when spawns are updated
- [ ] No noticeable delays when working with spawn configurations

**Technical Task MS-21-T1**: Optimize Large Spawn List Performance

- Ensure smooth scrolling with 100+ spawns
- Optimize search/filter operations for fast response
- Implement efficient re-rendering when spawns change
- Minimize memory usage for large lists
- Ensure quick spawn selection response
- Meet performance benchmarks: <100ms for search, <50ms for selection
- Handle spawn list updates without losing scroll position
- Consider React.memo for spawn list items
- Implement efficient filtering algorithms
- Use React keys properly for list rendering
- Consider virtual scrolling if needed (react-window)
- Profile performance with large datasets

**Dependencies**: Stories 1, 2, 3, 4

---

## Story 7: See Spawn Details at a Glance

**Story ID**: MS-22
**Priority**: Low
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to see key information about each spawn in the list, so that I can quickly understand what each spawn contains without opening it.

**Acceptance Criteria**:

- [ ] Can see how many assets each spawn contains
- [ ] Can see basic trigger information if configured
- [ ] Can see when each spawn was last modified
- [ ] Information is displayed compactly without cluttering the list
- [ ] Can hover over spawns to see additional details in tooltips
- [ ] All spawn information follows consistent formatting
- [ ] Information updates immediately when I modify spawns

**Technical Task MS-22-T1**: Implement Spawn Information Display

- Display asset count for each spawn
- Show abbreviated trigger information (if configured)
- Display last modified timestamp
- Design compact format that doesn't clutter the list
- Implement hover tooltips for additional information
- Ensure consistent formatting across all spawn items
- Update information when spawn is modified
- Design compact information layout
- Consider icons for different asset types
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
