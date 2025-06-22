import React, { useState, useEffect } from "react";
import { ConfigurationService } from "../../services/configurationService";
import { UnifiedConfigurationBuilder } from "../configuration/UnifiedConfigurationBuilder";
import type { Configuration } from "../../types/media";

const ConfigEditorPage: React.FC = () => {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Configuration | null>(
    null
  );
  const [showUnifiedBuilder, setShowUnifiedBuilder] = useState(false);

  // Load configurations on component mount
  useEffect(() => {
    const configs = ConfigurationService.getConfigurations();
    setConfigurations(configs);
    if (configs.length > 0 && !selectedConfigId) {
      setSelectedConfigId(configs[0].id);
    }
  }, [selectedConfigId]);

  // Get the currently selected configuration
  const selectedConfig = selectedConfigId
    ? configurations.find((c) => c.id === selectedConfigId) || null
    : null;

  const handleConfigurationChange = (configId: string) => {
    setSelectedConfigId(configId);
  };

  const handleStartBuilder = (mode: "create" | "edit") => {
    if (mode === "edit" && selectedConfig) {
      setEditingConfig(selectedConfig);
    } else {
      setEditingConfig(null);
    }
    setShowUnifiedBuilder(true);
  };

  const handleBuilderSave = (config: Configuration) => {
    const isEditMode = !!editingConfig;

    if (isEditMode) {
      // Update existing configuration
      const success = ConfigurationService.updateConfiguration(config);
      if (success) {
        setConfigurations(ConfigurationService.getConfigurations());
        setSelectedConfigId(config.id);
      }
    } else {
      // Create new configuration and save via service
      const savedConfig = ConfigurationService.createConfiguration(
        config.name,
        config.description
      );
      if (savedConfig) {
        // Update the saved config with groups
        const configWithGroups = { ...savedConfig, groups: config.groups };
        const updateSuccess =
          ConfigurationService.updateConfiguration(configWithGroups);
        if (updateSuccess) {
          setConfigurations(ConfigurationService.getConfigurations());
          setSelectedConfigId(savedConfig.id);
        }
      }
    }

    // Reset builder state
    setEditingConfig(null);
    setShowUnifiedBuilder(false);
  };

  const handleBuilderCancel = () => {
    setEditingConfig(null);
    setShowUnifiedBuilder(false);
  };

  return (
    <div className="p-6">
      {/* Header Section */}
      <div className="mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">
              Configuration Editor
            </h1>
            <p className="text-gray-600">
              Edit media asset configurations and manage asset groups by
              clicking to add assets.
            </p>
          </div>

          <button
            onClick={() => handleStartBuilder("create")}
            disabled={showUnifiedBuilder}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Create New Configuration
          </button>
        </div>

        {/* Breadcrumb Navigation */}
        {selectedConfig && !showUnifiedBuilder && (
          <div className="text-sm text-gray-500 mb-4">
            <span>Configuration Editor</span>
            <span className="mx-2">›</span>
            <span className="font-medium text-gray-700">
              {selectedConfig.name}
            </span>
          </div>
        )}

        {/* Unified Builder Breadcrumb */}
        {showUnifiedBuilder && (
          <div className="text-sm text-gray-500 mb-4">
            <span>Configuration Editor</span>
            <span className="mx-2">›</span>
            <span
              className={editingConfig ? "text-blue-600" : "text-green-600"}
            >
              {editingConfig
                ? `Edit ${editingConfig.name}`
                : "Create New Configuration"}
            </span>
          </div>
        )}
      </div>

      {/* Unified Configuration Builder */}
      {showUnifiedBuilder ? (
        <UnifiedConfigurationBuilder
          configuration={editingConfig || undefined}
          mode={editingConfig ? "edit" : "create"}
          onSave={handleBuilderSave}
          onCancel={handleBuilderCancel}
        />
      ) : (
        <>
          {/* Configuration Selection */}
          {configurations.length > 0 ? (
            <div className="bg-white border rounded-lg p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-800">
                  Select Configuration
                </h2>

                {selectedConfig && (
                  <button
                    onClick={() => handleStartBuilder("edit")}
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Edit Configuration
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">
                  Configuration:
                </label>
                <select
                  value={selectedConfigId || ""}
                  onChange={(e) => handleConfigurationChange(e.target.value)}
                  className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {configurations.map((config) => (
                    <option key={config.id} value={config.id}>
                      {config.name}
                      {config.description && ` - ${config.description}`}
                    </option>
                  ))}
                </select>
              </div>

              {selectedConfig && (
                <div className="mt-4 p-4 bg-gray-50 rounded-md">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Groups:</span>
                      <span className="ml-2 text-gray-600">
                        {selectedConfig.groups.length}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Total Assets:
                      </span>
                      <span className="ml-2 text-gray-600">
                        {selectedConfig.groups.reduce(
                          (sum, group) => sum + group.assets.length,
                          0
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">
                        Last Modified:
                      </span>
                      <span className="ml-2 text-gray-600">
                        {new Date(
                          selectedConfig.lastModified
                        ).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  {selectedConfig.description && (
                    <div className="mt-2">
                      <span className="font-medium text-gray-700">
                        Description:
                      </span>
                      <span className="ml-2 text-gray-600">
                        {selectedConfig.description}
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border rounded-lg p-8 text-center">
              <div className="mb-4">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No configurations available
              </h3>
              <p className="text-gray-500 mb-4">
                Create your first configuration to start editing asset groups
              </p>
              <button
                onClick={() => handleStartBuilder("create")}
                className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
              >
                Create Your First Configuration
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ConfigEditorPage;
