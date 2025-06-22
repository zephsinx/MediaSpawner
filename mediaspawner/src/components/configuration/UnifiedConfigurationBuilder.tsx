import { useState, useEffect, useCallback } from "react";
import type { Configuration, AssetGroup, MediaAsset } from "../../types/media";
import { createAssetGroup } from "../../types/media";
import { AssetService } from "../../services/assetService";
import { ProgressHeader } from "./ProgressHeader";
import { ConfigSection } from "./ConfigSection";
import { AssetList } from "../asset-library";

enum ConfigStep {
  BASIC = "basic",
  GROUPS = "groups",
  ASSETS = "assets",
  COMPLETE = "complete",
}

// Type guard for validating config steps
const isValidConfigStep = (step: string): step is ConfigStep => {
  return Object.values(ConfigStep).includes(step as ConfigStep);
};

export interface UnifiedConfigurationBuilderProps {
  configuration?: Configuration;
  onSave: (config: Configuration) => void;
  onCancel: () => void;
  mode?: "create" | "edit";
}

interface UnifiedBuilderState {
  // Configuration being built
  configuration: {
    name: string;
    description: string;
  };

  // Progressive disclosure tracking
  currentStep: ConfigStep;
  completedSteps: {
    basicInfo: boolean;
    firstGroup: boolean;
    assetsAdded: boolean;
  };

  // Group management (populated in Step 5)
  groups: AssetGroup[];
  selectedGroupId: string | null;

  // Asset management (populated in Step 6)
  availableAssets: MediaAsset[];
  selectedAssetId: string | null;
}

export function UnifiedConfigurationBuilder({
  configuration,
  onSave,
  onCancel,
  mode = "create",
}: UnifiedConfigurationBuilderProps) {
  // Constants for timing and validation
  const TIMING_CONSTANTS = {
    DEFAULT_GROUP_DURATION: 5000,
    MIN_DURATION: 100,
    DURATION_STEP: 100,
  } as const;
  const [state, setState] = useState<UnifiedBuilderState>({
    configuration: {
      name: configuration?.name || "",
      description: configuration?.description || "",
    },
    currentStep: ConfigStep.BASIC,
    completedSteps: {
      basicInfo: false,
      firstGroup: false,
      assetsAdded: false,
    },
    groups: configuration?.groups || [],
    selectedGroupId: null,
    availableAssets: [],
    selectedAssetId: null,
  });

  // Group form state for first group creation
  const [groupForm, setGroupForm] = useState<{
    name: string;
    duration: number;
  }>({
    name: "",
    duration: TIMING_CONSTANTS.DEFAULT_GROUP_DURATION,
  });

  const isEditMode = mode === "edit";

  // Step availability logic
  const isSectionAvailable = useCallback(
    (step: ConfigStep): boolean => {
      switch (step) {
        case ConfigStep.BASIC:
          return true;
        case ConfigStep.GROUPS:
          return state.completedSteps.basicInfo;
        case ConfigStep.ASSETS:
          return (
            state.completedSteps.basicInfo && state.completedSteps.firstGroup
          );
        case ConfigStep.COMPLETE:
          return Object.values(state.completedSteps).every(Boolean);
        default:
          return false;
      }
    },
    [state.completedSteps]
  );

  // Initialize completed steps for edit mode
  useEffect(() => {
    if (isEditMode && configuration) {
      setState((prev) => ({
        ...prev,
        completedSteps: {
          basicInfo: true,
          firstGroup: configuration.groups.length > 0,
          assetsAdded: configuration.groups.some(
            (group) => group.assets.length > 0
          ),
        },
      }));
    }
  }, [isEditMode, configuration]);

  // Load available assets on mount
  useEffect(() => {
    setState((prev) => ({
      ...prev,
      availableAssets: AssetService.getAssets(),
    }));
  }, []);

  // Section toggle navigation
  const handleSectionToggle = (section: string) => {
    const targetStep = isValidConfigStep(section) ? section : ConfigStep.BASIC;

    // Check if target section is available
    if (!isSectionAvailable(targetStep)) {
      return; // Don't allow navigation to unavailable sections
    }

    setState((prev) => ({
      ...prev,
      currentStep: targetStep,
    }));
  };

  const handleNameChange = (name: string) => {
    setState((prev) => ({
      ...prev,
      configuration: { ...prev.configuration, name },
    }));
  };

  const handleDescriptionChange = (description: string) => {
    setState((prev) => ({
      ...prev,
      configuration: { ...prev.configuration, description },
    }));
  };

  // Group management handlers
  const handleGroupNameChange = (name: string) => {
    const currentGroup = state.groups.length > 0 ? state.groups[0] : null;

    if (currentGroup) {
      // Update existing first group
      setState((prev) => ({
        ...prev,
        groups: prev.groups.map((group, index) =>
          index === 0 ? { ...group, name } : group
        ),
      }));
    } else {
      // Update form for new group
      setGroupForm((prev) => ({ ...prev, name }));
    }
  };

  const handleGroupDurationChange = (duration: number) => {
    const currentGroup = state.groups.length > 0 ? state.groups[0] : null;

    if (currentGroup) {
      // Update existing first group
      setState((prev) => ({
        ...prev,
        groups: prev.groups.map((group, index) =>
          index === 0 ? { ...group, duration } : group
        ),
      }));
    } else {
      // Update form for new group
      setGroupForm((prev) => ({ ...prev, duration }));
    }
  };

  const handleCreateFirstGroup = () => {
    if (!groupForm.name.trim()) return;

    const newGroup = createAssetGroup(groupForm.name.trim());
    setState((prev) => ({
      ...prev,
      groups: [{ ...newGroup, duration: groupForm.duration }],
      selectedGroupId: newGroup.id,
    }));

    // Reset form
    setGroupForm({
      name: "",
      duration: TIMING_CONSTANTS.DEFAULT_GROUP_DURATION,
    });
  };

  // Asset assignment handler
  const handleAddAssetToGroup = (asset: MediaAsset) => {
    if (state.groups.length === 0) return;

    const updatedGroups = state.groups.map((group, index) => {
      if (index === 0) {
        // First group only
        const isAlreadyAdded = group.assets.some((a) => a.id === asset.id);
        if (!isAlreadyAdded) {
          return { ...group, assets: [...group.assets, asset] };
        }
      }
      return group;
    });

    setState((prev) => ({ ...prev, groups: updatedGroups }));
  };

  // Real-time validation for basic info completion
  useEffect(() => {
    const basicComplete = state.configuration.name.trim() !== "";

    if (basicComplete !== state.completedSteps.basicInfo) {
      setState((prev) => ({
        ...prev,
        completedSteps: {
          ...prev.completedSteps,
          basicInfo: basicComplete,
        },
      }));
    }
  }, [state.configuration.name, state.completedSteps.basicInfo]);

  // Real-time validation for first group completion
  useEffect(() => {
    const firstGroupComplete =
      state.groups.length > 0 &&
      state.groups[0].name.trim() !== "" &&
      state.groups[0].duration > 0;

    if (firstGroupComplete !== state.completedSteps.firstGroup) {
      setState((prev) => ({
        ...prev,
        completedSteps: {
          ...prev.completedSteps,
          firstGroup: firstGroupComplete,
        },
      }));
    }
  }, [state.groups, state.completedSteps.firstGroup]);

  // Real-time validation for assets completion
  useEffect(() => {
    const assetsComplete =
      state.groups.length > 0 && state.groups[0].assets.length > 0;

    if (assetsComplete !== state.completedSteps.assetsAdded) {
      setState((prev) => ({
        ...prev,
        completedSteps: {
          ...prev.completedSteps,
          assetsAdded: assetsComplete,
        },
      }));
    }
  }, [state.groups, state.completedSteps.assetsAdded]);

  const handleSave = () => {
    const configToSave: Configuration = {
      id: configuration?.id || crypto.randomUUID(),
      name: state.configuration.name,
      description: state.configuration.description,
      groups: state.groups,
      lastModified: Date.now(),
    };

    onSave(configToSave);
  };

  const currentGroup = state.groups.length > 0 ? state.groups[0] : null;
  const currentGroupName = currentGroup ? currentGroup.name : groupForm.name;
  const currentGroupDuration = currentGroup
    ? currentGroup.duration
    : groupForm.duration;
  const isGroupFormValid =
    currentGroupName.trim() !== "" && currentGroupDuration > 0;

  return (
    <div className="unified-configuration-builder bg-white border rounded-lg p-6">
      <div className="space-y-8">
        {/* Step 2: Progress Header Implementation */}
        <ProgressHeader
          currentStep={state.currentStep}
          completedSteps={state.completedSteps}
        />

        {/* Step 3: ConfigSection Implementation */}
        <ConfigSection
          title="Basic Configuration"
          completed={state.completedSteps.basicInfo}
          expanded={state.currentStep === ConfigStep.BASIC}
          onToggle={() => handleSectionToggle(ConfigStep.BASIC)}
        >
          <div className="space-y-4">
            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Configuration Name *
              </label>
              <input
                type="text"
                value={state.configuration.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="Enter configuration name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            {/* Description Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                value={state.configuration.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Optional description"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors resize-none"
              />
            </div>
          </div>
        </ConfigSection>

        <ConfigSection
          title="Create Your First Asset Group"
          completed={state.completedSteps.firstGroup}
          expanded={state.currentStep === ConfigStep.GROUPS}
          onToggle={() => handleSectionToggle(ConfigStep.GROUPS)}
        >
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Group Name *
              </label>
              <input
                type="text"
                value={currentGroupName}
                onChange={(e) => handleGroupNameChange(e.target.value)}
                placeholder="Enter group name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Duration (ms) *
              </label>
              <input
                type="number"
                value={currentGroupDuration}
                onChange={(e) => {
                  const value = Math.max(
                    TIMING_CONSTANTS.MIN_DURATION,
                    Number(e.target.value) ||
                      TIMING_CONSTANTS.DEFAULT_GROUP_DURATION
                  );
                  handleGroupDurationChange(value);
                }}
                min={TIMING_CONSTANTS.MIN_DURATION}
                step={TIMING_CONSTANTS.DURATION_STEP}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
              />
              <p className="text-xs text-gray-500 mt-1">
                How long assets in this group will be displayed (milliseconds)
              </p>
            </div>

            {!currentGroup && (
              <div className="pt-2">
                <button
                  onClick={handleCreateFirstGroup}
                  disabled={!isGroupFormValid}
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  Create First Group
                </button>
              </div>
            )}

            {currentGroup && (
              <div className="pt-2 text-sm text-green-600">
                ✅ Group "{currentGroup.name}" created successfully
              </div>
            )}
          </div>
        </ConfigSection>

        <ConfigSection
          title="Add Assets to Your Group"
          completed={state.completedSteps.assetsAdded}
          expanded={state.currentStep === ConfigStep.ASSETS}
          onToggle={() => handleSectionToggle(ConfigStep.ASSETS)}
        >
          {state.groups.length > 0 ? (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Adding assets to: <strong>{state.groups[0].name}</strong>
              </div>

              <AssetList
                assets={state.availableAssets}
                onAssetSelect={handleAddAssetToGroup}
                selectedAssets={[]} // Not using selection highlighting for this workflow
                className="max-h-96 overflow-y-auto"
              />

              {state.groups[0].assets.length > 0 && (
                <div className="text-sm text-green-600">
                  ✅ {state.groups[0].assets.length} asset(s) added to group
                </div>
              )}
            </div>
          ) : (
            <div className="text-gray-500 text-sm">
              Create a group first to add assets
            </div>
          )}
        </ConfigSection>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            {isEditMode ? "Update Configuration" : "Save Configuration"}
          </button>
        </div>
      </div>
    </div>
  );
}
