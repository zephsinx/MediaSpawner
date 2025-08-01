# MediaSpawner UI Redesign - Project Epics

## Project Overview

MediaSpawner UI redesign to implement a spawn-centric workflow with three-panel layout, focusing on delivering core user value early with incremental enhancements.

---

## Epic 1: Spawn Management Foundation

**Story ID**: MS-1
**Priority**: 1 (Critical Path)
**Status**: Completed ✅
**Estimated Effort**: Medium

**User Value**: Technical foundation that enables all spawn functionality.

**Summary**: Establish core data structures and services that enable users to work with spawns effectively.

**Technical Deliverables**:

- Spawn and SpawnProfile TypeScript interfaces
- SpawnService for spawn CRUD operations
- SpawnProfileService for profile management
- AssetService extensions for spawn-specific settings

**Dependencies**: None
**Blocks**: All other epics

---

## Epic 2: Three-Panel Layout System

**Story ID**: MS-2
**Priority**: 2 (Critical Path)
**Status**: In Progress 🔄
**Estimated Effort**: Medium

**User Value**: Organized workspace that separates spawn navigation, configuration, and asset management into clear, dedicated areas.

**Summary**: Build the core three-panel layout infrastructure with responsive design and state management.

**Technical Deliverables**:

- Three-panel layout component (25% / 50% / 25%)
- Header with spawn profile selector
- Panel state management and routing
- Responsive design for desktop screens

**Dependencies**: Epic 1
**Blocks**: Epic 3, 4

---

## Epic 3: Core Spawn Management

**Story ID**: MS-3
**Priority**: 3 (Critical Path - HIGH VALUE)
**Status**: Not Started
**Estimated Effort**: Medium

**User Value**: ✨ **Users can create, read, update, and delete spawns with basic metadata and enable/disable functionality - the core workflow!**

**Summary**: Implement essential spawn management functionality that makes the application immediately useful.

**Technical Deliverables**:

- Basic spawn list with selection and enable/disable toggles
- Spawn creation workflow with default settings
- Basic spawn editor with name, description, enabled state
- Manual save/cancel workflow with change detection
- Spawn deletion with confirmation

**Key User Features**:

- Create spawns with names and descriptions
- Enable/disable spawns with toggle switches
- Edit spawn properties with manual save controls
- View all spawns in organized list

**Dependencies**: Epic 1, 2
**Blocks**: Epic 4

---

## Epic 4: Asset Assignment

**Story ID**: MS-4
**Priority**: 4 (Critical Path - HIGH VALUE)
**Status**: Not Started
**Estimated Effort**: Medium

**User Value**: ✨ **Spawns become functional containers for media assets with support for local files and URLs.**

**Summary**: Enable users to assign assets to spawns, making spawns actually useful for media management.

**Technical Deliverables**:

- Asset library display in right panel
- Drag & drop assignment from library to spawns
- Support for local file paths and URLs
- Basic asset validation and type detection
- Asset removal from spawns

**Key User Features**:

- Add assets to spawns via drag & drop
- Support both local paths and URLs
- View assets assigned to each spawn
- Remove assets from spawns

**Dependencies**: Epic 1, 2, 3
**Blocks**: Epic 5

---

## Epic 5: Asset Configuration

**Story ID**: MS-5
**Priority**: 5 (Critical Path - HIGH VALUE)
**Status**: Not Started
**Estimated Effort**: Large

**User Value**: ✨ **Fine-grained control over asset behavior with type-specific settings (volume, dimensions, coordinates, etc.).**

**Summary**: Implement comprehensive asset configuration with inheritance model and type-specific settings.

**Technical Deliverables**:

- Type-specific asset settings forms (volume for audio/video, dimensions/coordinates for visual)
- Asset inheritance model (spawn defaults with per-asset overrides)
- Asset settings editor in center panel
- Reset to defaults functionality

**Key User Features**:

- Configure volume for audio and video files
- Set dimensions, scale, and coordinates for visual files
- Per-asset settings that override spawn defaults
- Reset individual assets to spawn defaults

**Dependencies**: Epic 1, 2, 3, 4
**Blocks**: Epic 6

---

## Epic 6: Trigger System

**Story ID**: MS-6
**Priority**: 6 (Critical Path - HIGH VALUE)
**Status**: Not Started
**Estimated Effort**: Medium

**User Value**: ✨ **Spawns become actionable with configurable triggers (commands, channel points, time-based, etc.).**

**Summary**: Implement trigger selection and configuration that makes spawns responsive to external events.

**Technical Deliverables**:

- Trigger type selection UI (Command, Channel Point, Time/Date, Subscription, Cheer, etc.)
- Trigger-specific configuration forms
- Trigger validation and testing
- Integration with spawn settings

**Key User Features**:

- Select trigger types from comprehensive list
- Configure trigger-specific settings (chat commands, channel point rewards, etc.)
- Time-based triggers (date/time scheduling)
- Event-based triggers (subscriptions, cheers)

**Dependencies**: Epic 1, 2, 3
**Blocks**: Epic 7

---

## Epic 7: Export/Import System

**Story ID**: MS-7
**Priority**: 7 (Critical Path - HIGH VALUE)
**Status**: Not Started
**Estimated Effort**: Medium

**User Value**: ✨ **Configuration portability with JSON export/import for integration with external systems (OBS, etc.).**

**Summary**: Enable configuration sharing and backup through standardized JSON format.

**Technical Deliverables**:

- JSON export functionality for spawns and profiles
- JSON import with validation and error handling
- Configuration file format specification
- Backup/restore workflow

**Key User Features**:

- Export spawn configurations as JSON files
- Import configurations from JSON files
- Validate imported configurations
- Integration-ready format for external tools

**Dependencies**: Epic 1, 2, 3, 4, 5, 6
**Blocks**: Epic 8

---

## Epic 8: Spawn Profiles (Enhancement)

**Story ID**: MS-8
**Priority**: 8 (Enhancement)
**Status**: Not Started
**Estimated Effort**: Medium

**User Value**: 🎁 **Nice-to-have organization for managing multiple projects with profile switching and context management.**

**Summary**: Add profile management for organizing spawns into different projects or contexts.

**Technical Deliverables**:

- Profile creation, editing, and deletion
- Profile switching with context reset
- Active profile tracking and persistence
- Profile-specific settings (working directory)

**Key User Features**:

- Create profiles for different projects
- Switch between profiles with context reset
- Profile-specific configuration and settings
- Remember active profile between sessions

**Dependencies**: Epic 1, 2, 7
**Blocks**: Epic 9

---

## Epic 9: Enhanced UX & Polish

**Story ID**: MS-9
**Priority**: 9 (Polish)
**Status**: Not Started
**Estimated Effort**: Large

**User Value**: 🎨 **Enhanced workflow efficiency with search, filters, keyboard shortcuts, and performance optimizations.**

**Summary**: Add advanced UX features and optimizations for power users.

**Technical Deliverables**:

- Search and filtering for spawns and assets
- Keyboard shortcuts for common actions
- Performance optimizations for large datasets
- Accessibility improvements
- Advanced UI features (collapsible panels, etc.)

**Key User Features**:

- Search spawns and assets by name
- Filter by type, status, and other criteria
- Keyboard shortcuts for efficient workflow
- Smooth performance with large configurations

**Dependencies**: Epic 7, 8
**Blocks**: None

## Epic Dependencies Visualization

```text
Epic 1 (Foundation) ✅
├── Epic 2 (Layout) 🔄
│   ├── Epic 3 (Core Spawn Management) → HIGH VALUE
│   │   ├── Epic 4 (Asset Assignment) → HIGH VALUE
│   │   │   ├── Epic 5 (Asset Configuration) → HIGH VALUE
│   │   │   └── Epic 6 (Trigger System) → HIGH VALUE
│   │   │       └── Epic 7 (Export/Import) → HIGH VALUE
│   │   │           ├── Epic 8 (Spawn Profiles) → Enhancement
│   │   │           └── Epic 9 (Enhanced UX) → Polish
```

## Early Value Delivery Timeline

- **After Epic 3**: 🎯 **Core spawn management** - Users can create, edit, and organize spawns
- **After Epic 4**: 🎯 **Functional spawns** - Users can add assets to spawns (local files + URLs)
- **After Epic 5**: 🎯 **Powerful spawns** - Users can configure asset behavior (volume, dimensions, etc.)
- **After Epic 6**: 🎯 **Actionable spawns** - Users can set triggers for spawn activation
- **After Epic 7**: 🎯 **Exportable spawns** - Users can integrate with external systems via JSON
- **After Epic 8**: 🎁 **Multi-project support** - Users can organize spawns into profiles
- **After Epic 9**: 🎨 **Enhanced experience** - Power user features and polish

## Success Criteria

### Core Functionality (Epics 3-7)

- [ ] Complete spawn CRUD operations with manual save controls
- [ ] Asset assignment with local file and URL support
- [ ] Type-specific asset configuration (volume, dimensions, coordinates)
- [ ] Comprehensive trigger system (commands, channel points, time-based, events)
- [ ] JSON export/import for external integration
- [ ] Three-panel layout functional and responsive
- [ ] Enable/disable spawn functionality

### Enhancement Features (Epics 8-9)

- [ ] Multi-profile organization and switching
- [ ] Search and filtering for spawns and assets
- [ ] Performance optimization for large datasets
- [ ] Keyboard shortcuts and accessibility improvements
- [ ] Professional UI polish and user experience

### Technical Quality

- [ ] Manual save approach with unsaved changes protection
- [ ] Asset inheritance model working correctly
- [ ] Scalability target: 100s of spawns, 1000s of assets
- [ ] Clean architecture with legacy components removed

## Key Design Principles

- **User Value First** - Each epic delivers immediately useful functionality
- **Incremental Enhancement** - Core features first, nice-to-haves later
- **Manual Save Philosophy** - Explicit user control over changes
- **Spawn-Centric Workflow** - Spawns are the primary focus, profiles are organization
- **Practical over Pretty** - Functionality and usability over visual flourishes
- **Desktop-Optimized** - Designed for content creators managing streaming setups
