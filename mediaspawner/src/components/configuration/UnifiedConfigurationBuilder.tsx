import { useState, useEffect } from "react";
import type { Configuration, AssetGroup, MediaAsset } from "../../types/media";
import { ProgressHeader } from "./ProgressHeader";
import { ConfigSection } from "./ConfigSection";

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
  currentStep: "basic" | "groups" | "assets" | "complete";
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
  const [state, setState] = useState<UnifiedBuilderState>({
    configuration: {
      name: configuration?.name || "",
      description: configuration?.description || "",
    },
    currentStep: "basic",
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

  const isEditMode = mode === "edit";

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

  const handleSectionToggle = (section: string) => {
    const validSteps = ["basic", "groups", "assets", "complete"];
    const newStep = validSteps.includes(section) ? section : "basic";
    setState((prev) => ({
      ...prev,
      currentStep:
        prev.currentStep === section
          ? "basic"
          : (newStep as "basic" | "groups" | "assets" | "complete"),
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

  // Real-time validation for basic info completion
  useEffect(() => {
    const basicComplete =
      state.configuration.name.trim() !== "" &&
      state.configuration.description.trim() !== "";

    if (basicComplete !== state.completedSteps.basicInfo) {
      setState((prev) => ({
        ...prev,
        completedSteps: {
          ...prev.completedSteps,
          basicInfo: basicComplete,
        },
      }));
    }
  }, [
    state.configuration.name,
    state.configuration.description,
    state.completedSteps.basicInfo,
  ]);

  const handleSave = () => {
    // TODO: Implement final save logic combining all sections
    console.log("Save configuration:", state);

    // Placeholder - will be implemented with proper Configuration object creation
    const configToSave =
      configuration ||
      ({
        id: crypto.randomUUID(),
        name: state.configuration.name,
        description: state.configuration.description,
        groups: state.groups,
        lastModified: Date.now(),
      } as Configuration);

    onSave(configToSave);
  };

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
          expanded={state.currentStep === "basic"}
          onToggle={() => handleSectionToggle("basic")}
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
          title="Asset Groups"
          completed={state.completedSteps.firstGroup}
          expanded={state.currentStep === "groups"}
          onToggle={() => handleSectionToggle("groups")}
        >
          <div className="text-gray-500 text-sm">
            Group creation and management will be implemented in Step 5
          </div>
        </ConfigSection>

        <ConfigSection
          title="Asset Library"
          completed={state.completedSteps.assetsAdded}
          expanded={state.currentStep === "assets"}
          onToggle={() => handleSectionToggle("assets")}
        >
          <div className="text-gray-500 text-sm">
            AssetList integration and PropertyModal will be implemented in Step
            6
          </div>
        </ConfigSection>

        <ConfigSection
          title="Review and Finish"
          completed={false}
          expanded={state.currentStep === "complete"}
          onToggle={() => handleSectionToggle("complete")}
        >
          <div className="text-gray-500 text-sm">
            Final review and save actions
          </div>
        </ConfigSection>

        {/* Actions */}
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
