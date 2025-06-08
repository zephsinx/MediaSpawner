import { useState, useEffect, useCallback } from "react";
import type { MediaAsset } from "../../types/media";

export interface AudioPropertiesFormProps {
  asset: MediaAsset;
  onChange: (updatedAsset: MediaAsset) => void;
}

export function AudioPropertiesForm({
  asset,
  onChange,
}: AudioPropertiesFormProps) {
  const [volume, setVolume] = useState<number>(
    (asset.properties.volume || 0.5) * 100
  );
  const [loop, setLoop] = useState<boolean>(asset.properties.loop || false);

  // Stable reference for onChange to prevent re-render loops
  const stableOnChange = useCallback(
    (updatedAsset: MediaAsset) => {
      onChange(updatedAsset);
    },
    [onChange]
  );

  // Update local state when asset changes (only on asset ID change)
  useEffect(() => {
    setVolume((asset.properties.volume || 0.5) * 100);
    setLoop(asset.properties.loop || false);
  }, [asset.id]);

  // Update asset when values change (optimized dependencies)
  useEffect(() => {
    const updatedAsset: MediaAsset = {
      ...asset,
      properties: {
        ...asset.properties,
        volume: volume / 100, // Convert percentage back to 0-1 range
        loop,
      },
    };
    stableOnChange(updatedAsset);
  }, [volume, loop, stableOnChange]);

  const handleNumberChange = (
    value: string,
    setter: (val: number) => void,
    min: number = 0,
    max?: number
  ) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= min && (max === undefined || num <= max)) {
      setter(num);
    }
  };

  const handleReset = () => {
    setVolume(50);
    setLoop(false);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-900">Audio Properties</h4>
        <button
          onClick={handleReset}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Volume Control */}
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-2">
          Volume: {volume}%
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value, 10))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
          />
          <input
            type="number"
            min="0"
            max="100"
            value={volume}
            onChange={(e) =>
              handleNumberChange(e.target.value, setVolume, 0, 100)
            }
            className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Loop Control */}
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id={`loop-${asset.id}`}
          checked={loop}
          onChange={(e) => setLoop(e.target.checked)}
          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
        />
        <label
          htmlFor={`loop-${asset.id}`}
          className="text-xs font-medium text-gray-700"
        >
          Loop audio playback
        </label>
      </div>

      <div className="text-xs text-gray-500">
        Volume: {volume}% • Loop: {loop ? "On" : "Off"}
      </div>
    </div>
  );
}
