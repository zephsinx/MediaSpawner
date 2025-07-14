# Epic 1: Data Model & Services Foundation - User Stories

## Epic Overview

**Epic**: Data Model & Services Foundation
**Priority**: 1 (Critical Path)
**Status**: Not Started

Create type definitions and services to support the new spawn-centric architecture with enabled/disabled states, active profile management, and spawn-specific asset settings.

---

## Story 1: Define Spawn Data Structure

**Story ID**: MS-9
**Priority**: High
**Estimate**: 2 points
**Status**: Not Started

**User Story**:
As a developer, I want to define the Spawn interface with all required properties, so that I can represent spawns with enabled/disabled states and trigger configuration.

**Acceptance Criteria**:

- [ ] Spawn interface includes: id, name, enabled, trigger, duration, assets[]
- [ ] Spawn supports asset inheritance settings (default properties)
- [ ] SpawnAsset interface for spawn-specific asset instances with settings inheritance
- [ ] TypeScript compilation passes without errors
- [ ] Interface designed for future OBS-style settings expansion
- [ ] Proper JSDoc documentation added

**Technical Notes**:

- Create SpawnAsset interface extending MediaAsset with spawn-specific overrides
- Include enabled boolean for toggle functionality
- Trigger field should be flexible string/object for future expansion
- Design inheritance model: Spawn defaults → SpawnAsset overrides

**Dependencies**: None

---

## Story 2: Define SpawnProfile Data Structure

**Story ID**: MS-2
**Priority**: High
**Estimate**: 2 points
**Status**: Not Started

**User Story**:
As a developer, I want to define the SpawnProfile interface with active profile tracking, so that I can manage collections of spawns with one active profile at a time.

**Acceptance Criteria**:

- [ ] SpawnProfile interface includes: id, name, description, spawns[], lastModified
- [ ] Interface supports active profile identification
- [ ] Maintains proper relationship to spawns array
- [ ] Compatible with localStorage JSON serialization
- [ ] Proper JSDoc documentation added

**Technical Notes**:

- Replace existing Configuration interface
- Consider settings for active profile tracking (separate from profile data)
- Ensure spawns array properly typed with Spawn interface

**Dependencies**: Story 1 (Spawn interface)

---

## Story 3: Implement SpawnService CRUD Operations

**Story ID**: MS-3
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a developer, I want basic spawn CRUD operations, so that I can create, read, update, and delete spawns within profiles with enable/disable functionality.

**Acceptance Criteria**:

- [ ] Implement createSpawn(), getSpawn(), updateSpawn(), deleteSpawn()
- [ ] Implement enableSpawn(), disableSpawn() methods
- [ ] Proper localStorage persistence with error handling
- [ ] Cache integration for performance (using existing CacheService)
- [ ] Unit tests with >90% coverage
- [ ] Handles edge cases (empty profiles, invalid IDs)

**Technical Notes**:

- Follow existing service patterns (AssetService structure)
- Integrate with CacheService for performance
- Include spawn validation logic
- Consider batch operations for future bulk actions

**Dependencies**: Stories 1, 2

---

## Story 4: Implement SpawnProfileService with Active Profile Management

**Story ID**: MS-4
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a developer, I want spawn profile management with active profile tracking, so that only one profile is active at a time with proper context switching.

**Acceptance Criteria**:

- [ ] Profile CRUD operations: create, read, update, delete
- [ ] setActiveProfile() and getActiveProfile() methods
- [ ] Profile switching behavior (context reset)
- [ ] Active profile persisted in application settings
- [ ] Unit tests with >90% coverage
- [ ] Error handling for invalid profiles

**Technical Notes**:

- Replace existing ConfigurationService
- Integrate with SettingsService for active profile persistence
- Ensure proper cache invalidation on profile switches
- Consider profile validation and name uniqueness

**Dependencies**: Stories 1, 2

---

## Story 5: Extend AssetService for Spawn-Specific Settings

**Story ID**: MS-5
**Priority**: High
**Estimate**: 8 points
**Status**: Not Started

**User Story**:
As a developer, I want spawn-specific asset settings with inheritance, so that assets can have different configurations per spawn while inheriting defaults.

**Acceptance Criteria**:

- [ ] getSpawnAssetSettings(spawnId, assetId) method
- [ ] setSpawnAssetSettings(spawnId, assetId, settings) method
- [ ] Asset settings inherit from spawn defaults
- [ ] Override capability for individual assets per spawn
- [ ] Settings tied to specific spawn instances (not global)
- [ ] Proper data structure for spawn-asset relationships
- [ ] Unit tests with >90% coverage
- [ ] Performance optimized for large asset lists

**Technical Notes**:

- Extend existing AssetService without breaking current functionality
- Implement data structure for SpawnAsset instances (not just MediaAsset references)
- Design inheritance model: Spawn defaults → SpawnAsset overrides → final rendered settings
- Consider storage structure for spawn-asset settings relationships
- Maintain backward compatibility with existing asset operations

**Dependencies**: Stories 1, 2, 3, 4

---

## Story Dependencies

```text
Story 1 (Spawn Interface)
├── Story 2 (SpawnProfile Interface)
├── Story 3 (SpawnService)
│   └── Story 4 (SpawnProfileService)
└── Story 5 (Asset Settings) [depends on all above]
```

## Definition of Done

Each story is complete when:

- [ ] Code implemented and peer reviewed
- [ ] Unit tests pass with >90% coverage
- [ ] TypeScript compilation clean (no errors, minimal warnings)
- [ ] Integration with existing services works
- [ ] Performance benchmarks met (localStorage operations cached)
- [ ] Documentation updated (JSDoc comments)
- [ ] Vision alignment validated against checklist

## Vision Validation Checklist

- [ ] Supports spawn enable/disable functionality ✓ (Stories 1, 3)
- [ ] Includes trigger configuration for future expansion ✓ (Story 1)
- [ ] Supports one active profile at a time ✓ (Stories 2, 4)
- [ ] Scalable to 100s of spawns per profile ✓ (All stories)
- [ ] Asset inheritance model implemented correctly ✓ (Stories 1, 5)
- [ ] Maintains clean, reusable asset library ✓ (Story 5)
- [ ] SpawnAsset data structure for inheritance ✓ (Stories 1, 5)

## Technical Standards

- **TypeScript**: Strict mode, no `any` types
- **Testing**: Jest unit tests, >90% coverage
- **Performance**: All localStorage operations cached
- **Documentation**: JSDoc for all public methods
- **Error Handling**: Proper try/catch with meaningful errors

## Notes

- Build incrementally - each story should be functional independently
- Follow existing service patterns in codebase
- Keep interfaces flexible for future OBS integration
- No data migration required - fresh start approach
