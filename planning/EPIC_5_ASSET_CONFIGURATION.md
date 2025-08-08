# Epic 5: Asset Configuration - User Stories

## Epic Overview

**Epic ID**: MS-5
**Epic**: Asset Configuration
**Priority**: 5 (Critical Path - HIGH VALUE)
**Status**: Not Started

**User Value**: ✨ **Fine-grained control over asset behavior with type-specific settings (volume, dimensions, coordinates, etc.) and inheritance model.**

Implement comprehensive asset configuration with spawn defaults and per-asset overrides, enabling precise control over how assets behave in spawns.

---

## Story 1: Configure Audio and Video Settings

**Story ID**: MS-51
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to configure volume and playback settings for audio and video assets, so that I can control how media plays in my spawns.

**Acceptance Criteria**:

- [ ] Can set volume levels for audio and video assets (0-100%)
- [ ] Can configure playback settings (loop, autoplay, etc.)
- [ ] Volume controls are intuitive with sliders and numeric input
- [ ] Settings apply to both local files and URL assets
- [ ] Can preview volume changes before saving
- [ ] Settings persist when switching between spawns

**Technical Task MS-51-T1**: Implement Audio/Video Settings Forms

- Create audio/video settings form component for center panel
- Add volume slider with numeric input (0-100%)
- Add playback option controls (loop, autoplay, mute)
- Implement real-time preview capabilities
- Integrate with Epic 1's AssetService for settings persistence
- Support both local file and URL audio/video assets

**Dependencies**: Epic 1 (AssetService), Epic 2 (center panel), Epic 4 (asset assignment)

---

## Story 2: Configure Visual Asset Settings

**Story ID**: MS-52
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to configure dimensions, scale, and positioning for visual assets, so that I can control how images and videos appear in my spawns.

**Acceptance Criteria**:

- [ ] Can set width and height dimensions for visual assets
- [ ] Can configure scale/zoom percentages
- [ ] Can set X/Y coordinates for positioning
- [ ] Can choose positioning modes (absolute, relative, centered)
- [ ] Can preview positioning changes visually
- [ ] Settings work for both images and videos

**Technical Task MS-52-T1**: Implement Visual Asset Settings Forms

- Create visual asset settings form component for center panel
- Add dimension inputs (width, height) with validation
- Add scale/zoom percentage controls
- Add X/Y coordinate inputs for positioning
- Add positioning mode selection (absolute, relative, centered, etc.)
- Implement visual preview capabilities
- Support both image and video assets

**Dependencies**: Epic 1 (AssetService), Epic 2 (center panel), Epic 4 (asset assignment)

---

## Story 3: Set Spawn Default Asset Settings

**Story ID**: MS-35
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to configure default settings that my assets will inherit, so that I can set common properties once and override them per asset as needed.

**Acceptance Criteria**:

- [ ] Can configure default settings that apply to all assets in spawn
- [ ] Can set default volume, dimensions, positioning, and scale settings
- [ ] Can clearly see which settings are spawn defaults vs individual asset overrides
- [ ] Can see visual distinction between inherited and customized properties
- [ ] Get helpful explanations of how the inheritance system works
- [ ] Can preview how settings will apply to assets

**Technical Task MS-35-T1**: Implement Asset Inheritance Model UI

- Add asset defaults section in spawn settings form (Epic 3)
- Include default volume setting that assets inherit
- Add default dimensions, positioning, and scale settings
- Create clear indication of which settings are inherited vs overridden
- Add visual distinction between spawn defaults and asset-specific overrides
- Include help text explaining inheritance model
- Add preview of how settings will apply to assets

**Dependencies**: Epic 1 (Spawn types), Epic 3 (spawn editor), Stories 1, 2

---

## Story 4: Configure Individual Asset Settings

**Story ID**: MS-36
**Priority**: High
**Estimate**: 4 points
**Status**: Not Started

**User Story**:
As a user, I want to configure settings for individual assets in my spawn, so that I can customize how each asset behaves while keeping spawn-wide defaults.

**Acceptance Criteria**:

- [ ] Can click spawn asset to open its configuration
- [ ] Configuration opens in center panel with type-specific settings
- [ ] Can see which settings are inherited from spawn defaults vs customized
- [ ] Can override individual properties like volume, dimensions, positioning
- [ ] Settings form shows the same save and cancel behavior as spawn settings
- [ ] Form validation helps me enter correct values for all asset properties

**Technical Task MS-36-T1**: Create Individual Asset Configuration Workflow

- Integrate asset configuration trigger from Epic 4's asset display
- Build asset settings form component for center panel
- Add form fields for all configurable asset properties based on type
- Show clear indication of inherited vs overridden values
- Implement context switching from spawn settings to asset settings
- Reuse save/cancel patterns from Epic 3's spawn editor

**Dependencies**: Epic 1 (MediaAsset types), Epic 3 (spawn editor), Epic 4 (asset display), Stories 1, 2, 3

---

## Story 5: Reset Asset Settings to Spawn Defaults

**Story ID**: MS-37
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want to easily reset asset settings back to spawn defaults, so that I can quickly undo customizations and return to inherited behavior.

**Acceptance Criteria**:

- [ ] Can reset individual asset properties to spawn default values with one click
- [ ] Can reset all asset properties to spawn defaults with one action
- [ ] Asset settings update immediately when spawn defaults change
- [ ] Can see inheritance status throughout the asset settings form
- [ ] Get helpful explanations about inheritance and override behavior
- [ ] Clear visual distinction shows inherited (grayed/italic) vs overridden (normal/bold) properties
- [ ] Can see preview of "what this asset will use" combining spawn defaults + overrides
- [ ] Inheritance indicators update in real-time as I modify spawn defaults

**Technical Task MS-37-T1**: Build Asset Settings Integration with Spawn Defaults

- Connect asset settings form with spawn defaults from Story 3
- Add one-click reset individual properties to spawn defaults
- Add one-click reset all properties to spawn defaults
- Implement dynamic updates when spawn defaults change
- Add inheritance status indicators throughout the form
- Include help text explaining inheritance model and override behavior

**Dependencies**: Stories 3, 4

---

## Story 6: Switch Between Spawn and Asset Configuration

**Story ID**: MS-38
**Priority**: High
**Estimate**: 5 points
**Status**: Not Started

**User Story**:
As a user, I want to smoothly switch between configuring spawn settings and individual asset settings, so that I can efficiently manage both types of configuration in the same workspace.

**Acceptance Criteria**:

- [ ] Can transition smoothly between spawn settings and asset settings modes
- [ ] My work is preserved when switching between different configuration modes
- [ ] Can clearly see whether I'm configuring spawn settings or asset settings
- [ ] Can see breadcrumbs or header showing what I'm currently configuring
- [ ] Get comprehensive unsaved changes warnings when switching between modes
- [ ] Can easily return to the previous configuration mode
- [ ] Unsaved changes detection works across both spawn and asset configuration contexts
- [ ] Warning dialogs clearly explain what changes will be lost if I switch modes

**Technical Task MS-38-T1**: Implement Context Switching Between Configuration Modes

- Enable smooth transition between spawn settings and asset settings modes
- Add context preservation during mode switching
- Create clear visual indication of current mode (spawn vs asset settings)
- Add breadcrumb or header indicating current configuration context
- Include unsaved changes warnings when switching between modes
- Add back/return functionality to previous mode
- Integrate with Epic 2's panel state management for mode tracking

**Dependencies**: Epic 2 (panel state), Epic 3 (spawn editor), Stories 1, 2, 4

---

## Story 7: Validate Asset Configuration Settings

**Story ID**: MS-39
**Priority**: Medium
**Estimate**: 3 points
**Status**: Not Started

**User Story**:
As a user, I want clear validation for asset configuration settings, so that I understand what values are valid and can fix errors quickly.

**Acceptance Criteria**:

- [ ] Volume settings validate within 0-100% range
- [ ] Dimension settings validate as positive numbers
- [ ] Coordinate settings validate within reasonable ranges
- [ ] Scale settings validate within sensible percentages
- [ ] Get immediate feedback for invalid values
- [ ] Clear error messages explain what needs to be corrected

**Technical Task MS-39-T1**: Implement Asset Configuration Validation

- Add validation for volume settings (0-100%)
- Add validation for dimension inputs (positive numbers)
- Add validation for coordinate inputs (reasonable ranges)
- Add validation for scale percentages (sensible ranges)
- Implement real-time validation feedback
- Create clear error messages for each validation rule
- Prevent save when validation errors exist

**Dependencies**: Stories 1, 2, 4

---

## Story 8: Preview Asset Configuration Changes

**Story ID**: MS-40
**Priority**: Medium
**Estimate**: 4 points
**Status**: Not Started

**User Story**:
As a user, I want to preview how my asset configuration changes will affect the asset, so that I can see the results before saving.

**Acceptance Criteria**:

- [ ] Can preview volume changes for audio/video assets
- [ ] Can preview visual changes for positioning and scaling
- [ ] Preview updates in real-time as I adjust settings
- [ ] Preview works for both local files and URL assets
- [ ] Can toggle preview on/off to see before/after comparison
- [ ] Preview doesn't interfere with the configuration workflow

**Technical Task MS-40-T1**: Implement Asset Configuration Preview

- Add preview capabilities for audio/video volume changes
- Add visual preview for positioning, scaling, and dimension changes
- Implement real-time preview updates as settings change
- Support preview for both local file and URL assets
- Add toggle controls for before/after comparison
- Ensure preview doesn't impact performance or workflow

**Dependencies**: Stories 1, 2, 4

---

## Story Dependencies

```text
Story 1 (Audio/Video Settings)
├── Story 3 (Spawn Default Settings)
└── Story 4 (Individual Asset Settings)
    ├── Story 5 (Reset to Defaults)
    ├── Story 6 (Context Switching)
    ├── Story 7 (Configuration Validation)
    └── Story 8 (Configuration Preview)
└── Story 2 (Visual Asset Settings)
    └── [connects to Stories 3, 4, 5, 6, 7, 8]
```

## Definition of Done

Each story is complete when:

- [ ] Type-specific settings forms implemented for all asset types
- [ ] Asset inheritance model working correctly between spawns and assets
- [ ] Center panel context switching works smoothly
- [ ] Configuration validation provides clear feedback
- [ ] Manual save philosophy maintained throughout
- [ ] Integration with Epic 3 and 4 works correctly
- [ ] Ready for trigger configuration in Epic 6

## Vision Validation Checklist

- [ ] Type-specific asset settings implemented ✓ (Stories 1, 2)
- [ ] Volume configuration for audio/video files ✓ (Story 1)
- [ ] Dimensions, scale, and coordinates for visual files ✓ (Story 2)
- [ ] Asset inheritance model with spawn defaults ✓ (Stories 3, 5)
- [ ] Per-asset settings override spawn defaults ✓ (Stories 4, 5)
- [ ] Unified configuration workspace in center panel ✓ (Stories 4, 6)
- [ ] Manual save controls throughout ✓ (All stories)

## Critical Success Factors

- **Type-Specific Configuration**: Audio/video and visual assets have appropriate settings
- **Inheritance Model**: Spawn defaults with per-asset overrides working correctly
- **Unified Workspace**: Configuration happens in center panel as designed
- **Context Switching**: Smooth transitions between spawn and asset configuration
- **Configuration Validation**: Clear feedback prevents invalid settings
- **Preview Capabilities**: Users can see changes before saving

## Integration Points with Other Epics

- **Epic 1**: Uses SpawnService and AssetService for configuration persistence
- **Epic 2**: Uses center panel and panel state management for unified workspace
- **Epic 3**: Extends spawn editor with default asset settings
- **Epic 4**: Receives asset configuration requests from asset management
- **Epic 6**: Provides configured assets for trigger-specific behavior

## User Value Delivered

After Epic 5, users can:

- ✅ Create and manage spawns (Epic 3)
- ✅ Add assets to spawns (Epic 4)
- ✅ Configure volume for audio/video files
- ✅ Set dimensions, scale, and coordinates for visual files
- ✅ Use spawn defaults with per-asset overrides
- ✅ Preview configuration changes

This provides the fine-grained asset control that makes spawns truly powerful for media management scenarios.

## Notes

- Focus on type-specific settings that match user requirements
- Implement inheritance model that simplifies common cases
- Use center panel for all configuration to maintain unified workspace
- Build comprehensive validation to prevent configuration errors
- Design for streaming/presentation use cases with real-time preview
- Ensure performance with many assets and complex configurations
