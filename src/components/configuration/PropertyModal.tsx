import { useState, useEffect } from "react";
import { Modal } from "../common/Modal";
import { ImagePropertiesForm } from "./ImagePropertiesForm";
import { VideoPropertiesForm } from "./VideoPropertiesForm";
import { AudioPropertiesForm } from "./AudioPropertiesForm";
import { usePanelState } from "../../hooks";
import type { MediaAsset } from "../../types/media";

export interface PropertyModalProps {
  asset: MediaAsset | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedAsset: MediaAsset) => void;
}

export function PropertyModal({
  asset,
  isOpen,
  onClose,
  onSave,
}: PropertyModalProps) {
  const { setUnsavedChanges } = usePanelState();
  const [workingAsset, setWorkingAsset] = useState<MediaAsset | null>(null);

  // Initialize working asset when modal opens with new asset
  useEffect(() => {
    if (isOpen && asset) {
      setWorkingAsset({ ...asset });
    }
  }, [isOpen, asset]);

  // Track unsaved changes by comparing working asset with original asset
  useEffect(() => {
    if (asset && workingAsset && isOpen) {
      const hasChanges =
        JSON.stringify(workingAsset.properties) !==
        JSON.stringify(asset.properties);
      setUnsavedChanges(hasChanges);
    } else if (!isOpen) {
      // Clear unsaved changes when modal is closed
      setUnsavedChanges(false);
    }
  }, [asset, workingAsset, isOpen, setUnsavedChanges]);

  const handleAssetChange = (updatedAsset: MediaAsset) => {
    setWorkingAsset(updatedAsset);
  };

  const handleSave = () => {
    if (workingAsset) {
      setUnsavedChanges(false);
      onSave(workingAsset);
    }
    onClose();
  };

  const handleCancel = () => {
    setWorkingAsset(null);
    setUnsavedChanges(false);
    onClose();
  };

  const getModalTitle = () => {
    if (!asset) return "Asset Properties";

    const typeEmoji =
      {
        image: "🖼️",
        video: "🎥",
        audio: "🎵",
      }[asset.type] || "📄";

    const sourceIndicator = asset.isUrl ? "🌐" : "📁";

    return `${typeEmoji} ${asset.name} ${sourceIndicator}`;
  };

  if (!asset || !workingAsset) {
    return null;
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleCancel}
      title={getModalTitle()}
      size="lg"
    >
      <div className="space-y-6">
        {/* Asset Info */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="text-sm text-gray-600">
            <span className="font-medium">{asset.type.toUpperCase()}</span>
            {" • "}
            <span>{asset.isUrl ? "Remote URL" : "Local File"}</span>
          </div>
          <div className="text-xs text-gray-500 mt-1 break-all">
            {asset.path}
          </div>
        </div>

        {/* Property Forms */}
        <div>
          {asset.type === "image" && (
            <ImagePropertiesForm
              asset={workingAsset}
              onChange={handleAssetChange}
            />
          )}

          {asset.type === "video" && (
            <VideoPropertiesForm
              asset={workingAsset}
              onChange={handleAssetChange}
            />
          )}

          {asset.type === "audio" && (
            <AudioPropertiesForm
              asset={workingAsset}
              onChange={handleAssetChange}
            />
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
          <button
            onClick={handleCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </Modal>
  );
}
