# MediaSpawner UI Redesign Vision

## Overview

MediaSpawner is being redesigned with a **Spawn-centric workflow** that focuses on practical functionality over visual appeal. The application manages media asset configurations for streaming/presentation purposes, where **Spawns** (formerly Asset Groups) are the primary unit of work.

## Core Concepts

### Terminology Changes

- **Asset Groups** → **Spawns**
- **Configurations** → **Spawn Profiles**

### Hierarchy

```text
Spawn Profile (organizational container)
├── Spawn 1 (set of assets that spawn together)
│   ├── Asset A (with spawn-specific settings)
│   ├── Asset B (with spawn-specific settings)
│   └── Asset C (with spawn-specific settings)
├── Spawn 2
└── Spawn N
```

### Key Principles

- **Spawns are the main focus** - primary unit users interact with
- **One Spawn Profile active at a time** - clear context
- **Practical over pretty** - ease of use trumps visual appeal
- **Experienced user friendly** - quick workflows without hand-holding
- **Manual save with warnings** - explicit control over changes

## Target UI Design: Three-Panel Layout

### Layout Structure

```text
┌─────────────────────────────────────────────────────────────────┐
│ Header: [Spawn Profile Selector] [Profile Actions] [App Actions] │
├─────────────────────────────────────────────────────────────────┤
│ Left Panel (25%)  │ Center Panel (50%)  │ Right Panel (25%)     │
│ ═════════════════ │ ══════════════════ │ ═══════════════════   │
│ Spawn List        │ Unified Config      │ Asset Management      │
│                   │ Workspace           │                       │
│ • Spawn A (5)     │ ┌─ Spawn Settings ─┐│ ┌─ Assets in Spawn ─┐ │
│ • Spawn B (3) ✓   │ │ Name: [____]     ││ │ (3) □ Asset A     │ │
│ • Spawn C (7)     │ │ Trigger: [____]  ││ │     □ Asset B     │ │
│ • Spawn D (2) ✗   │ │ Duration: [____] ││ │     □ Asset C     │ │
│                   │ │ [More settings]  ││ ╞═══════════════════╡ │
│ [+ New Spawn]     │ └─────────────────┘│ │ [Resizable Divider] │ │
│                   │  OR                 │ ╞═══════════════════╡ │
│ [Search: ____]    │ ┌─ Asset Settings ─┐│ │ Asset Library (127) │ │
│                   │ │ Dimensions: [__] ││ │ (Collapsible)     │ │
│                   │ │ Position: [____] ││ │ Available Assets  │ │
│                   │ │ Volume: [______] ││ │ [Search Filter]   │ │
│                   │ └─────────────────┘│ └─────────────────────┘ │
│                   │ [Save] [Cancel]     │                       │
└───────────────────┴─────────────────────┴───────────────────────┘
```

### Panel Details

#### Left Panel: Spawn List (25%)

**Purpose**: Quick navigation and overview of all Spawns in current profile

**Features**:

- Compact list showing: Name, Asset Count, Trigger (abbreviated), Status
- Enabled/Disabled states (grayed out inline, not grouped separately)
- Toggle switches for quick enable/disable
- Search/filter functionality
- "New Spawn" creation button
- Handles 100s of Spawns efficiently

**Visual Indicators**:

- Enabled spawns: Normal text with toggle switch on
- Disabled spawns: Grayed out with toggle switch off, maybe subtle "disabled" badge
- Selected spawn: Highlighted background

#### Center Panel: Spawn Editor (50%)

**Purpose**: Primary workspace for configuring individual Spawns and their assets

**States**:

- **No Selection**: Welcome state with "Select a spawn or create new"
- **Spawn Selected**: Full spawn configuration interface
- **Asset Settings**: Asset-specific configuration form (when configuring spawn-specific overrides)

**Spawn Settings**:

- Basic info: Name, Description
- Behavior: Trigger conditions, Duration
- Advanced settings: Will expand to include OBS-style media configuration options
- Clear save/cancel actions with unsaved changes warnings

**Asset Settings Integration**:

- Asset-specific configuration form appears in center panel when configuring overrides
- Unified configuration workspace for both spawn and asset settings
- Clear context switching between spawn settings and individual asset configuration
- Asset settings include dimensions, position, volume, and other spawn-specific overrides

**Asset Inheritance**:

- Assets inherit Spawn settings (like Duration) as defaults
- Individual assets can override inherited settings
- Asset-specific settings are tied to the Spawn instance

#### Right Panel: Asset Management (25%)

**Purpose**: Asset selection and assignment for current Spawn

**Dynamic Two-Section Layout**:

1. **Top Section**: Assets in Current Spawn
   - List of assets assigned to selected spawn
   - Drag to reorder assets
   - Click asset to configure spawn-specific settings (opens in center panel)
   - Remove assets from spawn
   - Asset counter badges for clear overview

2. **Bottom Section**: Asset Library (Collapsible)
   - Browsable list of all available assets
   - Add new assets to library
   - Drag assets from library to spawn
   - Search/filter functionality
   - Auto-expands when adding assets

**Dynamic Space Management**:

- **User-resizable divider** between sections for manual control
- **Smart defaults**: 30% top / 70% bottom split (optimal for typical 1-3 asset case)
- **Minimum heights**: Top section (80px), Bottom section (200px)
- **Auto-behaviors**:
  - Auto-expand library when spawn is empty or has few assets
  - Grow spawn section when spawn has 5+ assets
  - Collapse library completely when spawn section needs maximum space

**Visual Enhancements**:

- Asset counter badges on section headers ("Assets in Spawn (3)", "Asset Library (127)")
- Scroll indicators when sections have more content than visible
- Collapse/expand buttons for quick space management
- Clear drag & drop zones with visual feedback

**Asset Settings Flow**:

- Click on spawn asset → opens asset settings form in center panel
- Configure asset-specific overrides (dimensions, position, volume, etc.)
- Return to spawn settings view when done

## User Workflows

### Primary Workflow: Creating/Editing a Spawn

1. **Select Spawn Profile** (header dropdown)
2. **Navigate to Spawn** (left panel list or create new)
3. **Configure Spawn Settings** (center panel)
4. **Add Assets** (drag from right panel or expand library)
5. **Configure Individual Assets** (click asset in right panel → opens settings in center panel)
6. **Save Changes** (explicit save button)

### Secondary Workflows

- **Profile Management**: Switch between profiles, create/delete profiles
- **Asset Library Management**: Add/remove assets, organize library
- **Bulk Operations**: Enable/disable multiple spawns (future enhancement)

## Data Architecture Considerations

### Current State

- **Storage**: Browser localStorage with JSON serialization
- **Assets**: File paths and URLs only (no file content stored)
- **Caching**: Service layer with cache invalidation

### Spawn Profile Management

- **Active Profile**: Single active profile setting
- **Profile Switching**: Resets to spawn list view
- **Cross-Profile Operations**: Moving/copying spawns (future consideration)

### Asset Settings Architecture

- **Global Assets**: Shared pool in asset library
- **Spawn-Specific Settings**: Asset configurations tied to specific spawn instances
- **Setting Inheritance**: Spawn defaults inherited by assets, with override capability

## Scale & Performance Targets

- **Spawn Profiles**: Dozens per user
- **Spawns per Profile**: Up to 100s
- **Assets per Spawn**: Typically 1-10, up to dozens
- **Total Assets in Library**: 100s to 1000s

## Future Enhancements (Not Current Scope)

- **Advanced Triggers**: Complex trigger conditions and timing
- **Spawn Location Settings**: Positioning and layout configuration
- **OBS Integration**: Direct integration with OBS Studio
- **Import/Export**: Enhanced configuration sharing
- **Bulk Operations**: Multi-select and batch editing
- **Cross-Profile Operations**: Move/copy spawns between profiles
- **Spawn Templates**: Reusable spawn configurations
- **Preview/Testing**: Live preview of spawn behavior

## Technical Implementation Notes

### Current Technology Stack

- **Frontend**: React 19 + TypeScript + Tailwind CSS
- **Build**: Vite
- **Routing**: React Router
- **State**: localStorage + caching layer
- **Media Preview**: Freezeframe for animated content

### Key Services to Modify

- **ConfigurationService** → **SpawnProfileService**
- **AssetService** (enhance for spawn-specific settings)
- New: **SpawnService** for spawn-specific operations
- Routing updates for new navigation structure

### Migration Considerations

- Rename existing Configuration data to SpawnProfile
- Asset Group data becomes Spawn data
- Maintain backward compatibility during transition
- Update all terminology in UI and code

## Key Design Decisions & Rationale

### Why Three-Panel Layout?

- **Left Panel**: Efficient navigation for up to 100s of spawns with search/filter
- **Center Panel**: Unified configuration workspace for both spawn and asset settings
- **Right Panel**: Streamlined asset selection and assignment without losing spawn focus

### Why Inline Disabled Spawns?

- Maintains consistent mental model of spawn organization
- Easier to re-enable without hunting through collapsed sections
- Search/filter friendly - disabled spawns still discoverable
- Less UI complexity than grouping/collapsing

### Why Manual Save?

- Explicit control over changes (important for streaming configurations)
- Clear indication of unsaved work
- Prevents accidental loss of complex configurations
- Familiar pattern for experienced users

### Why Spawn-Specific Asset Settings?

- Same asset can behave differently in different spawns
- Asset library remains clean and reusable
- Settings inheritance from spawn with override capability
- Supports complex streaming scenarios

### Why Center Panel Asset Configuration?

- **Proper space allocation**: Asset settings forms need adequate space for complex configurations
- **Unified workspace**: All configuration tasks happen in one dedicated area
- **Reduced cognitive load**: Right panel focuses purely on selection/assignment
- **Context preservation**: Asset settings appear in primary workspace with full context

### Why Dynamic Right Panel Sections?

- **Flexible space usage**: Adapts to different spawn sizes (1-3 typical assets vs 10+ edge cases)
- **User control**: Resizable divider allows manual adjustment for personal preference
- **Smart defaults**: 30/70 split optimized for typical usage patterns
- **Visual clarity**: Asset counter badges and scroll indicators provide clear feedback

## Current Application Context

### File Storage Approach

- **No file content stored** - only paths and URLs
- **localStorage for metadata** - configurations, asset references, settings
- **URL-based previews** - can preview web-hosted assets
- **Local file references** - stored as paths, resolved externally

### Existing Page Structure (Pre-Redesign)

- **Dashboard**: Configuration overview and management
- **Asset Library**: Central asset management with validation
- **Configuration Editor**: Current configuration editing interface
- **Settings**: Application preferences

### Data Model (Current)

```typescript
Configuration {
  id, name, description, groups[], lastModified
  └── AssetGroup {
      id, name, assets[], randomization, duration
      └── MediaAsset {
          id, type, name, path, isUrl, properties
      }
  }
}
```

## Design Validation Checklist

- [ ] Spawns are clearly the primary focus
- [ ] Quick navigation between spawns
- [ ] Efficient asset assignment workflow
- [ ] Clear indication of active profile and unsaved changes
- [ ] Scalable to 100s of spawns
- [ ] Practical, uncluttered interface
- [ ] Manual save with proper warnings
- [ ] Easy enable/disable of spawns
- [ ] Spawn-specific asset configuration
- [ ] Collapsible asset library to manage screen space
