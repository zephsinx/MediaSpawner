import { useState, useEffect, useCallback } from "react";
import type { MediaAsset } from "../../types/media";

export interface VideoPropertiesFormProps {
  asset: MediaAsset;
  onChange: (updatedAsset: MediaAsset) => void;
}

export function VideoPropertiesForm({
  asset,
  onChange,
}: VideoPropertiesFormProps) {
  const [width, setWidth] = useState<number>(
    asset.properties.dimensions?.width || 100
  );
  const [height, setHeight] = useState<number>(
    asset.properties.dimensions?.height || 100
  );
  const [x, setX] = useState<number>(asset.properties.position?.x || 0);
  const [y, setY] = useState<number>(asset.properties.position?.y || 0);
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
    setWidth(asset.properties.dimensions?.width || 100);
    setHeight(asset.properties.dimensions?.height || 100);
    setX(asset.properties.position?.x || 0);
    setY(asset.properties.position?.y || 0);
    setVolume((asset.properties.volume || 0.5) * 100);
    setLoop(asset.properties.loop || false);
  }, [asset.id]);

  // Update asset when values change (optimized dependencies)
  useEffect(() => {
    const updatedAsset: MediaAsset = {
      ...asset,
      properties: {
        ...asset.properties,
        dimensions: { width, height },
        position: { x, y },
        volume: volume / 100, // Convert percentage back to 0-1 range
        loop,
      },
    };
    stableOnChange(updatedAsset);
  }, [width, height, x, y, volume, loop, stableOnChange]);

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
    setWidth(100);
    setHeight(100);
    setX(0);
    setY(0);
    setVolume(50);
    setLoop(false);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-900">Video Properties</h4>
        <button
          onClick={handleReset}
          className="px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded hover:bg-gray-300 transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Dimensions */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Width (px)
          </label>
          <input
            type="number"
            min="1"
            value={width}
            onChange={(e) => handleNumberChange(e.target.value, setWidth, 1)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Height (px)
          </label>
          <input
            type="number"
            min="1"
            value={height}
            onChange={(e) => handleNumberChange(e.target.value, setHeight, 1)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Position */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            X Position (px)
          </label>
          <input
            type="number"
            min="0"
            value={x}
            onChange={(e) => handleNumberChange(e.target.value, setX, 0)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Y Position (px)
          </label>
          <input
            type="number"
            min="0"
            value={y}
            onChange={(e) => handleNumberChange(e.target.value, setY, 0)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
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
          Loop video playback
        </label>
      </div>

      <div className="text-xs text-gray-500">
        Dimensions: {width} × {height} px • Position: ({x}, {y}) • Volume:{" "}
        {volume}% • Loop: {loop ? "On" : "Off"}
      </div>
    </div>
  );
}
