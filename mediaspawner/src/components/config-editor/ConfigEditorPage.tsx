import React, { useState, useEffect } from "react";
import { ConfigurationService } from "../../services/configurationService";
import { AssetGroupBuilder } from "../configuration/AssetGroupBuilder";
import { ConfigurationForm } from "../configuration/ConfigurationForm";
import type { Configuration } from "../../types/media";

const ConfigEditorPage: React.FC = () => {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [editingConfig, setEditingConfig] = useState<Configuration | null>(
    null
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

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
    if (hasUnsavedChanges) {
      const confirmSwitch = window.confirm(
        "You have unsaved changes. Switch configuration anyway?"
      );
      if (!confirmSwitch) return;
    }

    setSelectedConfigId(configId);
    setEditingConfig(null);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  };

  const handleEditStart = () => {
    if (selectedConfig) {
      setEditingConfig(selectedConfig);
      setIsEditing(true);
      setHasUnsavedChanges(false);
    }
  };

  const handleSaveConfiguration = (updatedConfig: Configuration) => {
    const success = ConfigurationService.updateConfiguration(updatedConfig);
    if (success) {
      setConfigurations(ConfigurationService.getConfigurations());
      setEditingConfig(null);
      setHasUnsavedChanges(false);
      setIsEditing(false);
    }
  };

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      const confirmCancel = window.confirm(
        "You have unsaved changes. Cancel editing anyway?"
      );
      if (!confirmCancel) return;
    }

    setEditingConfig(null);
    setHasUnsavedChanges(false);
    setIsEditing(false);
  };

  const handleCreateNew = () => {
    if (hasUnsavedChanges) {
      const confirmCreate = window.confirm(
        "You have unsaved changes. Create new configuration anyway?"
      );
      if (!confirmCreate) return;
    }

    setShowCreateForm(true);
    setIsEditing(false);
    setEditingConfig(null);
    setHasUnsavedChanges(false);
  };

  const handleCreateFormSave = (newConfig: Configuration) => {
    // Refresh configurations list
    const updatedConfigs = ConfigurationService.getConfigurations();
    setConfigurations(updatedConfigs);

    // Select the newly created configuration
    setSelectedConfigId(newConfig.id);

    // Hide the create form
    setShowCreateForm(false);
  };

  const handleCreateFormCancel = () => {
    setShowCreateForm(false);
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
              Edit media asset configurations and manage asset groups with
              drag-and-drop functionality.
            </p>
          </div>

          <button
            onClick={handleCreateNew}
            disabled={isEditing || showCreateForm}
            className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Create New Configuration
          </button>
        </div>

        {/* Breadcrumb Navigation */}
        {selectedConfig && !showCreateForm && (
          <div className="text-sm text-gray-500 mb-4">
            <span>Configuration Editor</span>
            <span className="mx-2">›</span>
            <span className="font-medium text-gray-700">
              {selectedConfig.name}
            </span>
            {isEditing && (
              <>
                <span className="mx-2">›</span>
                <span className="text-blue-600">Editing</span>
              </>
            )}
          </div>
        )}

        {/* Create Form Breadcrumb */}
        {showCreateForm && (
          <div className="text-sm text-gray-500 mb-4">
            <span>Configuration Editor</span>
            <span className="mx-2">›</span>
            <span className="text-green-600">Create New Configuration</span>
          </div>
        )}
      </div>

      {/* Configuration Creation Form */}
      {showCreateForm && (
        <div className="mb-6">
          <ConfigurationForm
            onSave={handleCreateFormSave}
            onCancel={handleCreateFormCancel}
          />
        </div>
      )}

      {/* Configuration Selection - hidden when creating new */}
      {!showCreateForm && configurations.length > 0 ? (
        <div className="bg-white border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              Select Configuration
            </h2>

            {selectedConfig && !isEditing && (
              <button
                onClick={handleEditStart}
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
              disabled={isEditing}
              className="flex-1 max-w-md px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
              {configurations.map((config) => (
                <option key={config.id} value={config.id}>
                  {config.name}
                  {config.description && ` - ${config.description}`}
                </option>
              ))}
            </select>
          </div>

          {selectedConfig && !isEditing && (
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
                    {new Date(selectedConfig.lastModified).toLocaleDateString()}
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
      ) : !showCreateForm ? (
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
            onClick={handleCreateNew}
            className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Create Your First Configuration
          </button>
        </div>
      ) : null}

      {/* Asset Group Builder - shown when editing */}
      {isEditing && editingConfig && !showCreateForm && (
        <AssetGroupBuilder
          configuration={editingConfig}
          onSave={handleSaveConfiguration}
          onCancel={handleCancelEdit}
        />
      )}

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-4 right-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg">
          <p className="text-sm text-yellow-700">
            You have unsaved changes in the configuration editor.
          </p>
        </div>
      )}
    </div>
  );
};

export default ConfigEditorPage;
