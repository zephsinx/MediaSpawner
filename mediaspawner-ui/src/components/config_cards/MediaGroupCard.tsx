import React from "react";
import type { MediaGroup } from "../../types"; // Assuming types are in src/types

interface MediaGroupCardProps {
  group: MediaGroup;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const MediaGroupCard: React.FC<MediaGroupCardProps> = ({
  group,
  onEdit,
  onDelete,
}) => {
  const { id, name, visualSettings, audioSettings } = group;

  // Determine enabled status.
  const isVisualEnabled = !!visualSettings?.enabled;
  const isAudioEnabled = !!audioSettings?.enabled;

  const handleEdit = () => {
    onEdit(id);
  };

  const handleDelete = () => {
    onDelete(id);
  };

  return (
    <div className="bg-white shadow-md rounded-lg p-6 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
        <div className="space-x-2">
          <button
            onClick={handleEdit}
            className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-1 px-3 rounded text-sm shadow"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600 text-white font-semibold py-1 px-3 rounded text-sm shadow"
          >
            Delete
          </button>
        </div>
      </div>
      <div className="text-sm text-gray-600">
        <p>
          Visuals:{" "}
          <span
            className={
              isVisualEnabled ? "text-green-600 font-semibold" : "text-gray-500"
            }
          >
            {isVisualEnabled ? "Enabled" : "Disabled"}
          </span>
        </p>
        <p>
          Audio:{" "}
          <span
            className={
              isAudioEnabled ? "text-green-600 font-semibold" : "text-gray-500"
            }
          >
            {isAudioEnabled ? "Enabled" : "Disabled"}
          </span>
        </p>
      </div>
    </div>
  );
};

export default MediaGroupCard;
