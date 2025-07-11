# MediaSpawner UI Redesign - Project Epics

## Project Overview

MediaSpawner UI redesign to implement a spawn-centric workflow with three-panel layout, focusing on practical functionality and efficient spawn management.

---

## Epic 1: Data Model & Services Foundation

**Priority**: 1 (Critical Path)  
**Status**: Not Started  
**Estimated Effort**: Medium  

**Summary**: Implement new data structures and services for Spawns and Spawn Profiles

**Description**: Create type definitions and services to support the new spawn-centric architecture. This includes defining Spawn and SpawnProfile interfaces with enabled/disabled states, implementing SpawnService and SpawnProfileService with active profile management, and extending AssetService for spawn-specific asset settings with inheritance model.

**Key Deliverables**:

- New TypeScript type definitions for Spawns and Spawn Profiles
- Spawn interface with enabled/disabled state and trigger configuration
- SpawnProfile interface with active profile tracking
- SpawnService for spawn CRUD operations and enable/disable functionality
- SpawnProfileService for profile management with active profile setting
- Extended AssetService for spawn-specific asset settings with inheritance/override model

**Dependencies**: None  
**Blocks**: All other epics

---

## Epic 2: Three-Panel Layout System

**Priority**: 2 (Critical Path)  
**Status**: Not Started  
**Estimated Effort**: Medium  

**Summary**: Build the core three-panel layout infrastructure

**Description**: Implement the main layout component with left spawn list panel (25%), center spawn editor panel (50%), and right asset management panel (25%). Includes responsive design considerations and panel state management.

**Key Deliverables**:

- Three-panel layout component
- Panel resizing and responsive behavior
- Header with spawn profile selector
- Basic panel state management
- Updated routing structure

**Dependencies**: Epic 1  
**Blocks**: Epic 3, 4, 5

---

## Epic 3: Spawn List & Navigation

**Priority**: 3 (Critical Path)  
**Status**: Not Started  
**Estimated Effort**: Medium  

**Summary**: Implement spawn list with enable/disable, search, and navigation

**Description**: Build spawn list component with toggle switches for enable/disable, search/filter functionality, visual indicators for enabled/disabled states, and efficient navigation for handling 100s of spawns. Includes compact list design and spawn selection handling.

**Key Deliverables**:

- Spawn list component for left panel
- Enable/disable toggle switches with visual states
- Search and filter functionality
- Spawn selection and navigation
- "New Spawn" creation workflow
- Efficient rendering for large spawn lists

**Dependencies**: Epic 1, 2  
**Blocks**: Epic 4

---

## Epic 4: Spawn Editor & Settings

**Priority**: 4 (Critical Path)  
**Status**: Not Started  
**Estimated Effort**: Large  

**Summary**: Implement spawn creation, editing, and configuration with explicit manual save workflows

**Description**: Build spawn editor with comprehensive manual save/cancel functionality, unsaved changes warnings, and asset inheritance model. This epic is critical to the "experienced user friendly" vision principle, providing explicit control over changes with clear feedback for streaming configuration management.

**Key Deliverables**:

- Spawn editor component for center panel with manual save workflow
- Comprehensive unsaved changes detection and warning system
- Spawn settings form (name, trigger, duration, etc.) with real-time validation
- Asset inheritance UI showing spawn defaults and override capabilities
- Explicit save/cancel controls with confirmation dialogs
- Form validation and error handling with clear user feedback
- Dirty state indicators and navigation warnings
- Auto-save prevention with user control emphasis

**Dependencies**: Epic 1, 2, 3  
**Blocks**: Epic 5

---

## Epic 5: Asset Integration & Spawn-Specific Settings

**Priority**: 5 (Critical Path)  
**Status**: Not Started  
**Estimated Effort**: Large  

**Summary**: Integrate asset library with comprehensive drag & drop workflows and spawn-specific asset configuration

**Description**: Adapt existing asset components for the right panel with detailed collapsible asset library functionality, comprehensive drag & drop workflows, and spawn-specific asset settings with clear inheritance/override model. Includes seamless asset assignment workflows and individual asset configuration within spawn context.

**Key Deliverables**:

- Asset management component for right panel with two-section layout
- Detailed collapsible asset library with auto-expand/collapse functionality
- Comprehensive drag & drop workflows (library to spawn, reordering within spawn)
- Spawn-specific asset settings with clear inheritance/override visualization
- Asset reordering within spawns with visual feedback
- Asset settings overlay/modal for individual spawn-specific configuration
- Integration with existing asset validation and preview components
- Asset assignment workflows with immediate visual feedback
- Clear indication of inherited vs overridden asset properties

**Dependencies**: Epic 1, 2, 4  
**Blocks**: Epic 6

---

## Epic 6: Spawn Profile Management

**Priority**: 6  
**Status**: Not Started  
**Estimated Effort**: Medium  

**Summary**: Implement active spawn profile management and switching

**Description**: Create spawn profile switching with active profile tracking, profile creation/management, and proper context handling. Only one spawn profile should be active at a time, with clear indication of current active profile.

**Key Deliverables**:

- Spawn profile selector in header
- Active profile tracking and indication
- Profile creation, editing, and deletion
- Profile switching with context reset
- Profile management interface
- Settings integration for active profile

**Dependencies**: Epic 1, 2, 5  
**Blocks**: Epic 7

---

## Epic 7: Data Migration & Legacy Cleanup

**Priority**: 7  
**Status**: Not Started  
**Estimated Effort**: Medium  

**Summary**: Migrate existing data and remove legacy components

**Description**: Convert existing Configuration data to Spawn Profiles, remove old components and pages, update routing structure, and update all terminology throughout the application from "Configuration/Asset Group" to "Spawn Profile/Spawn".

**Key Deliverables**:

- Data migration scripts/utilities
- Remove legacy components (Dashboard, ConfigEditor, etc.)
- Update routing to new structure
- Terminology updates throughout codebase
- Clean up unused services and utilities
- Update import/export functionality

**Dependencies**: Epic 1, 2, 3, 4, 5, 6  
**Blocks**: Epic 8

---

## Epic 8: Polish & User Experience

**Priority**: 8  
**Status**: Not Started  
**Estimated Effort**: Small  

**Summary**: Add final UX enhancements and optimizations

**Description**: Performance optimizations for large spawn lists, keyboard shortcuts, foundation for future bulk operations, and final UI polish. Includes accessibility improvements and user experience refinements.

**Key Deliverables**:

- Performance optimizations for large data sets
- Keyboard shortcuts for common actions
- Accessibility improvements
- Final UI polish and consistency
- Foundation for bulk operations (future)
- User experience testing and refinements
- Documentation updates

**Dependencies**: Epic 7  
**Blocks**: None

---

## Epic Dependencies Visualization

```text
Epic 1 (Foundation)
├── Epic 2 (Layout)
│   ├── Epic 3 (Spawn List)
│   │   └── Epic 4 (Spawn Editor)
│   │       └── Epic 5 (Asset Integration)
│   │           └── Epic 6 (Profile Management)
│   │               └── Epic 7 (Migration & Cleanup)
│   │                   └── Epic 8 (Polish)
```

## Success Criteria

- [ ] Spawn-centric workflow implemented
- [ ] Three-panel layout functional and responsive
- [ ] Efficient navigation for 100s of spawns
- [ ] Manual save with unsaved changes warnings
- [ ] Enable/disable spawn functionality
- [ ] Spawn-specific asset settings with inheritance
- [ ] Active spawn profile management
- [ ] All legacy components removed
- [ ] Data successfully migrated
- [ ] Performance targets met

## Notes

- **No backwards compatibility required** - MediaSpawner is in active development
- **Focus on practical functionality** over visual appeal
- **Manual save approach** - explicit user control over changes
- **Scalability target** - Support for 100s of spawns per profile
- **Asset inheritance model** - Spawn settings inherited by assets with override capability
