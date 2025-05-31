import React, { useState, useEffect } from "react";
import { ConfigurationService } from "../../services/configurationService";
import { AssetService } from "../../services/assetService";
import { ConfigurationForm } from "../configuration/ConfigurationForm";
import type { Configuration } from "../../types/media";

const DashboardPage: React.FC = () => {
  const [configurations, setConfigurations] = useState<Configuration[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingConfig, setEditingConfig] = useState<Configuration | null>(
    null
  );
  const [stats, setStats] = useState({
    totalConfigurations: 0,
    totalGroups: 0,
    totalAssets: 0,
    lastModified: null as number | null,
  });

  // Load configurations and stats on mount
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    const configs = ConfigurationService.getConfigurations();
    setConfigurations(configs);

    const configStats = ConfigurationService.getConfigurationStats();
    const assetStats = AssetService.getAssetStats();

    setStats({
      ...configStats,
      totalAssets: assetStats.total,
    });
  };

  const handleCreateConfig = () => {
    setEditingConfig(null);
    setShowCreateForm(true);
  };

  const handleEditConfig = (config: Configuration) => {
    setEditingConfig(config);
    setShowCreateForm(true);
  };

  const handleDeleteConfig = (id: string) => {
    if (window.confirm("Are you sure you want to delete this configuration?")) {
      const success = ConfigurationService.deleteConfiguration(id);
      if (success) {
        loadData();
      }
    }
  };

  const handleDuplicateConfig = (id: string) => {
    const duplicate = ConfigurationService.duplicateConfiguration(id);
    if (duplicate) {
      loadData();
    }
  };

  const handleFormSave = () => {
    setShowCreateForm(false);
    setEditingConfig(null);
    loadData();
  };

  const handleFormCancel = () => {
    setShowCreateForm(false);
    setEditingConfig(null);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Dashboard</h1>
          <p className="text-gray-600">
            Manage your streaming configurations and view project overview.
          </p>
        </div>
        <button
          onClick={handleCreateConfig}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
        >
          Create Configuration
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Configurations
          </h3>
          <p className="text-3xl font-bold text-blue-600">
            {stats.totalConfigurations}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Total saved configurations
          </p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Asset Groups
          </h3>
          <p className="text-3xl font-bold text-green-600">
            {stats.totalGroups}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Groups across all configs
          </p>
        </div>

        <div className="bg-white border rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-800 mb-2">
            Media Assets
          </h3>
          <p className="text-3xl font-bold text-purple-600">
            {stats.totalAssets}
          </p>
          <p className="text-sm text-gray-500 mt-1">Total assets in library</p>
        </div>
      </div>

      {/* Configuration Form */}
      {showCreateForm && (
        <div className="mb-8">
          <ConfigurationForm
            configuration={editingConfig || undefined}
            onSave={handleFormSave}
            onCancel={handleFormCancel}
          />
        </div>
      )}

      {/* Configurations List */}
      <div className="bg-white border rounded-lg">
        <div className="px-6 py-4 border-b">
          <h2 className="text-xl font-medium text-gray-800">
            Your Configurations
          </h2>
        </div>

        {configurations.length === 0 ? (
          <div className="p-8 text-center">
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
              No configurations yet
            </h3>
            <p className="text-gray-500 mb-4">
              Create your first streaming configuration to get started
            </p>
            <button
              onClick={handleCreateConfig}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Create Your First Configuration
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {configurations.map((config) => (
              <div
                key={config.id}
                className="p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {config.name}
                    </h3>
                    {config.description && (
                      <p className="text-gray-600 mb-2">{config.description}</p>
                    )}
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{config.groups.length} groups</span>
                      <span>
                        {config.groups.reduce(
                          (sum, group) => sum + group.assets.length,
                          0
                        )}{" "}
                        assets
                      </span>
                      <span>Modified {formatDate(config.lastModified)}</span>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEditConfig(config)}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDuplicateConfig(config.id)}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                    >
                      Duplicate
                    </button>
                    <button
                      onClick={() => handleDeleteConfig(config.id)}
                      className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
