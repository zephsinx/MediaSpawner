import { useState, useEffect, useRef, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { AssetService } from "../../services/assetService";
import { createAssetGroup } from "../../types/media";
import type { Configuration, AssetGroup, MediaAsset } from "../../types/media";
import {
  ImagePropertiesForm,
  VideoPropertiesForm,
  AudioPropertiesForm,
} from "./index";

export interface AssetGroupBuilderProps {
  configuration: Configuration;
  onSave: (updatedConfig: Configuration) => void;
  onCancel: () => void;
}

// Draggable Asset Card Component
function DraggableAssetCard({
  asset,
  isInGroup,
}: {
  asset: MediaAsset;
  isInGroup: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: asset.id,
    data: { asset },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`border rounded p-3 transition-colors cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-50" : ""
      } ${
        isInGroup
          ? "border-green-500 bg-green-50"
          : "border-gray-200 hover:bg-gray-50"
      }`}
    >
      <div className="flex justify-between items-center">
        <div>
          <h6 className="font-medium text-gray-900">{asset.name}</h6>
          <p className="text-sm text-gray-500">
            {asset.type} • {asset.isUrl ? "🌐 URL" : "📁 Local"}
          </p>
        </div>
        <span
          className={`px-2 py-1 text-xs rounded ${
            isInGroup
              ? "bg-green-100 text-green-700"
              : "bg-blue-100 text-blue-700"
          }`}
        >
          {isInGroup ? "Added" : "Drag to add"}
        </span>
      </div>
    </div>
  );
}

// Droppable Group Card Component
function DroppableGroupCard({
  group,
  isSelected,
  isOver,
  onSelect,
  onEdit,
  onDelete,
  onRemoveAsset,
  onSelectAsset,
  selectedAssetId,
  editingGroupId,
  editingGroupName,
  setEditingGroupName,
  handleEditGroup,
}: {
  group: AssetGroup;
  isSelected: boolean;
  isOver: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onRemoveAsset: (assetId: string) => void;
  onSelectAsset: (assetId: string) => void;
  selectedAssetId: string | null;
  editingGroupId: string | null;
  editingGroupName: string;
  setEditingGroupName: (name: string) => void;
  handleEditGroup: (groupId: string, newName: string) => void;
}) {
  const { setNodeRef } = useDroppable({
    id: group.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`border rounded p-3 cursor-pointer transition-colors ${
        isSelected
          ? "border-blue-500 bg-blue-50"
          : isOver
          ? "border-green-500 bg-green-50"
          : "border-gray-200 hover:bg-gray-50"
      }`}
      onClick={onSelect}
    >
      <div className="flex justify-between items-center">
        <div className="flex-1">
          {editingGroupId === group.id ? (
            <div className="flex space-x-2">
              <input
                type="text"
                value={editingGroupName}
                onChange={(e) => setEditingGroupName(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleEditGroup(group.id, editingGroupName);
                  }
                }}
                onBlur={() => handleEditGroup(group.id, editingGroupName)}
                autoFocus
              />
            </div>
          ) : (
            <div>
              <h5 className="font-medium text-gray-900">{group.name}</h5>
              <p className="text-sm text-gray-500">
                {group.assets.length} assets
                {isOver && " • Drop here to add"}
              </p>
            </div>
          )}
        </div>
        <div className="flex space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit();
            }}
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="px-2 py-1 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Show assets in selected group */}
      {isSelected && group.assets.length > 0 && (
        <div className="mt-3 pt-3 border-t">
          <div className="space-y-1">
            {group.assets.map((asset) => (
              <div
                key={asset.id}
                className={`flex justify-between items-center text-sm p-2 rounded cursor-pointer transition-colors ${
                  selectedAssetId === asset.id
                    ? "bg-blue-100 border border-blue-300"
                    : "hover:bg-gray-50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectAsset(asset.id);
                }}
              >
                <div className="flex items-center space-x-2">
                  <span
                    className={`text-xs ${
                      asset.type === "image"
                        ? "bg-green-100 text-green-700"
                        : asset.type === "video"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-orange-100 text-orange-700"
                    } px-1 py-0.5 rounded`}
                  >
                    {asset.type}
                  </span>
                  <span
                    className={
                      selectedAssetId === asset.id
                        ? "text-blue-900 font-medium"
                        : "text-gray-700"
                    }
                  >
                    {asset.name}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveAsset(asset.id);
                  }}
                  className="px-1 py-0.5 text-xs bg-red-100 text-red-600 rounded hover:bg-red-200 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AssetGroupBuilder({
  configuration,
  onSave,
  onCancel,
}: AssetGroupBuilderProps) {
  const [groups, setGroups] = useState<AssetGroup[]>(
    configuration.groups || []
  );
  const [availableAssets, setAvailableAssets] = useState<MediaAsset[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [showNewGroupForm, setShowNewGroupForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingGroupName, setEditingGroupName] = useState("");
  const [activeAsset, setActiveAsset] = useState<MediaAsset | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  // Load available assets on mount
  useEffect(() => {
    setAvailableAssets(AssetService.getAssets());
  }, []);

  // Handle keyboard events for asset deselection
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && selectedAssetId) {
        setSelectedAssetId(null);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [selectedAssetId]);

  // Handle clicks outside the component to deselect asset
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        selectedAssetId &&
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setSelectedAssetId(null);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
    };
  }, [selectedAssetId]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim()) return;

    const newGroup = createAssetGroup(newGroupName.trim());
    setGroups([...groups, newGroup]);
    setNewGroupName("");
    setShowNewGroupForm(false);
    setSelectedGroupId(newGroup.id);
  };

  const handleDeleteGroup = (groupId: string) => {
    if (window.confirm("Are you sure you want to delete this group?")) {
      const updatedGroups = groups.filter((group) => group.id !== groupId);
      setGroups(updatedGroups);
      if (selectedGroupId === groupId) {
        setSelectedGroupId(null);
      }
    }
  };

  const handleEditGroup = (groupId: string, newName: string) => {
    if (!newName.trim()) return;

    const updatedGroups = groups.map((group) =>
      group.id === groupId ? { ...group, name: newName.trim() } : group
    );
    setGroups(updatedGroups);
    setEditingGroupId(null);
    setEditingGroupName("");
  };

  const handleAddAssetToGroup = (asset: MediaAsset, groupId: string) => {
    const updatedGroups = groups.map((group) => {
      if (group.id === groupId) {
        // Check if asset is already in this group
        const isAlreadyAdded = group.assets.some((a) => a.id === asset.id);
        if (!isAlreadyAdded) {
          return { ...group, assets: [...group.assets, asset] };
        }
      }
      return group;
    });
    setGroups(updatedGroups);
  };

  const handleRemoveAssetFromGroup = (assetId: string, groupId: string) => {
    const updatedGroups = groups.map((group) => {
      if (group.id === groupId) {
        return {
          ...group,
          assets: group.assets.filter((asset) => asset.id !== assetId),
        };
      }
      return group;
    });
    setGroups(updatedGroups);

    // Clear selection if the removed asset was selected
    if (selectedAssetId === assetId) {
      setSelectedAssetId(null);
    }
  };

  const handleSelectAsset = (assetId: string) => {
    setSelectedAssetId(selectedAssetId === assetId ? null : assetId);
  };

  const handleSave = () => {
    const updatedConfig: Configuration = {
      ...configuration,
      groups,
    };
    onSave(updatedConfig);
  };

  const isAssetInGroup = (assetId: string, groupId: string): boolean => {
    const group = groups.find((g) => g.id === groupId);
    return group?.assets.some((asset) => asset.id === assetId) || false;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const asset = active.data.current?.asset as MediaAsset;
    setActiveAsset(asset);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over) {
      const asset = active.data.current?.asset as MediaAsset;
      const groupId = over.id as string;

      // Add asset to the group it was dropped on
      handleAddAssetToGroup(asset, groupId);
    }

    setActiveAsset(null);
  };

  const selectedGroup = selectedGroupId
    ? groups.find((g) => g.id === selectedGroupId)
    : null;

  // Find selected asset in groups
  const findSelectedAsset = (): MediaAsset | null => {
    if (!selectedAssetId) return null;

    for (const group of groups) {
      const asset = group.assets.find((asset) => asset.id === selectedAssetId);
      if (asset) return asset;
    }
    return null;
  };

  const selectedAsset = findSelectedAsset();

  // Handle asset property updates
  // Optimized asset update handler with useCallback for stable reference
  const handleAssetUpdate = useCallback((updatedAsset: MediaAsset) => {
    setGroups((prevGroups) => {
      return prevGroups.map((group) => ({
        ...group,
        assets: group.assets.map((asset) =>
          asset.id === updatedAsset.id ? updatedAsset : asset
        ),
      }));
    });
  }, []);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div ref={containerRef} className="bg-white border rounded-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-medium">Asset Group Builder</h3>
          <div className="flex space-x-3">
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Save Groups
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>

        <div
          className={`grid gap-6 ${
            selectedAsset
              ? "grid-cols-1 lg:grid-cols-3"
              : "grid-cols-1 lg:grid-cols-2"
          }`}
        >
          {/* Groups Panel */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="text-md font-medium text-gray-800">
                Asset Groups
              </h4>
              <button
                onClick={() => setShowNewGroupForm(true)}
                className="px-3 py-1 text-sm bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
              >
                Add Group
              </button>
            </div>

            {/* New Group Form */}
            {showNewGroupForm && (
              <div className="bg-gray-50 p-4 rounded mb-4">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    placeholder="Group name"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onKeyPress={(e) => e.key === "Enter" && handleCreateGroup()}
                  />
                  <button
                    onClick={handleCreateGroup}
                    disabled={!newGroupName.trim()}
                    className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-300 transition-colors"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowNewGroupForm(false);
                      setNewGroupName("");
                    }}
                    className="px-3 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Groups List */}
            <div className="space-y-2">
              {groups.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No groups created yet</p>
                  <p className="text-sm">
                    Create your first group to get started
                  </p>
                </div>
              ) : (
                groups.map((group) => (
                  <DroppableGroupCard
                    key={group.id}
                    group={group}
                    isSelected={selectedGroupId === group.id}
                    isOver={false} // Will be handled by DndContext
                    onSelect={() => setSelectedGroupId(group.id)}
                    onEdit={() => {
                      setEditingGroupId(group.id);
                      setEditingGroupName(group.name);
                    }}
                    onDelete={() => handleDeleteGroup(group.id)}
                    onRemoveAsset={(assetId) =>
                      handleRemoveAssetFromGroup(assetId, group.id)
                    }
                    onSelectAsset={handleSelectAsset}
                    selectedAssetId={selectedAssetId}
                    editingGroupId={editingGroupId}
                    editingGroupName={editingGroupName}
                    setEditingGroupName={setEditingGroupName}
                    handleEditGroup={handleEditGroup}
                  />
                ))
              )}
            </div>
          </div>

          {/* Asset Library Panel */}
          <div>
            <h4 className="text-md font-medium text-gray-800 mb-4">
              Asset Library
            </h4>

            {selectedGroup && (
              <p className="text-sm text-gray-600 mb-4">
                Adding assets to:{" "}
                <span className="font-medium">{selectedGroup.name}</span>
                <br />
                <span className="text-xs text-gray-500">
                  💡 Drag assets to groups or click to add to selected group
                </span>
              </p>
            )}

            {availableAssets.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No assets in library</p>
                <p className="text-sm">Add assets to the Asset Library first</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {availableAssets.map((asset) => {
                  const isInGroup = selectedGroup
                    ? isAssetInGroup(asset.id, selectedGroup.id)
                    : false;
                  return (
                    <div key={asset.id} className="relative">
                      <DraggableAssetCard asset={asset} isInGroup={isInGroup} />
                      {/* Click-to-add button overlay for selected group */}
                      {selectedGroup && !isInGroup && (
                        <button
                          onClick={() =>
                            handleAddAssetToGroup(asset, selectedGroup.id)
                          }
                          className="absolute top-2 right-2 px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                        >
                          Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Property Panel */}
          {selectedAsset && (
            <div>
              <h4 className="text-md font-medium text-gray-800 mb-4">
                Asset Properties
              </h4>
              <div className="bg-white border rounded-lg p-4">
                <div className="mb-3">
                  <h5 className="font-medium text-gray-900">
                    {selectedAsset.name}
                  </h5>
                  <p className="text-sm text-gray-500">
                    {selectedAsset.type} •{" "}
                    {selectedAsset.isUrl ? "🌐 URL" : "📁 Local"}
                  </p>
                </div>

                {selectedAsset.type === "image" && (
                  <ImagePropertiesForm
                    asset={selectedAsset}
                    onChange={handleAssetUpdate}
                  />
                )}

                {selectedAsset.type === "video" && (
                  <VideoPropertiesForm
                    asset={selectedAsset}
                    onChange={handleAssetUpdate}
                  />
                )}

                {selectedAsset.type === "audio" && (
                  <AudioPropertiesForm
                    asset={selectedAsset}
                    onChange={handleAssetUpdate}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        {/* Drag Overlay */}
        <DragOverlay>
          {activeAsset ? (
            <div className="border rounded p-3 bg-white shadow-lg opacity-90">
              <div className="flex justify-between items-center">
                <div>
                  <h6 className="font-medium text-gray-900">
                    {activeAsset.name}
                  </h6>
                  <p className="text-sm text-gray-500">
                    {activeAsset.type} •{" "}
                    {activeAsset.isUrl ? "🌐 URL" : "📁 Local"}
                  </p>
                </div>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </div>
    </DndContext>
  );
}
