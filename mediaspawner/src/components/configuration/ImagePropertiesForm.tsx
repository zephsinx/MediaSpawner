import { useState, useEffect, useCallback, memo } from "react";
import type { MediaAsset } from "../../types/media";

export interface ImagePropertiesFormProps {
  asset: MediaAsset;
  onChange: (updatedAsset: MediaAsset) => void;
}

export const ImagePropertiesForm = memo(function ImagePropertiesForm({
  asset,
  onChange,
}: ImagePropertiesFormProps) {
  const [width, setWidth] = useState<number>(
    asset.properties.dimensions?.width || 100
  );
  const [height, setHeight] = useState<number>(
    asset.properties.dimensions?.height || 100
  );
  const [x, setX] = useState<number>(asset.properties.position?.x || 0);
  const [y, setY] = useState<number>(asset.properties.position?.y || 0);

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
  }, [asset.id]);

  // Update asset when values change (optimized dependencies)
  useEffect(() => {
    const updatedAsset: MediaAsset = {
      ...asset,
      properties: {
        ...asset.properties,
        dimensions: { width, height },
        position: { x, y },
      },
    };
    stableOnChange(updatedAsset);
  }, [width, height, x, y, stableOnChange]);

  const handleNumberChange = (
    value: string,
    setter: (val: number) => void,
    min: number = 0
  ) => {
    const num = parseInt(value, 10);
    if (!isNaN(num) && num >= min) {
      setter(num);
    }
  };

  const handleReset = () => {
    setWidth(100);
    setHeight(100);
    setX(0);
    setY(0);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
      <div className="flex justify-between items-center">
        <h4 className="text-sm font-medium text-gray-900">Image Properties</h4>
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

      <div className="text-xs text-gray-500">
        Dimensions: {width} × {height} px • Position: ({x}, {y})
      </div>
    </div>
  );
});
