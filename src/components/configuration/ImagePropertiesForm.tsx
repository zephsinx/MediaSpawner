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
  const [scale, setScale] = useState<number>(asset.properties.scale ?? 1);
  const [positionMode, setPositionMode] = useState<
    "absolute" | "relative" | "centered"
  >(asset.properties.positionMode ?? "absolute");

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
    setScale(asset.properties.scale ?? 1);
    setPositionMode(asset.properties.positionMode ?? "absolute");
  }, [
    asset.properties.dimensions?.height,
    asset.properties.dimensions?.width,
    asset.properties.position?.x,
    asset.properties.position?.y,
    asset.properties.scale,
    asset.properties.positionMode,
  ]);

  // Update asset when values change (optimized dependencies)
  useEffect(() => {
    const updatedAsset: MediaAsset = {
      ...asset,
      properties: {
        ...asset.properties,
        dimensions: { width, height },
        position: { x, y },
        scale,
        positionMode,
      },
    };
    stableOnChange(updatedAsset);
  }, [width, height, x, y, scale, positionMode, stableOnChange, asset]);

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

  const handleScaleNumberChange = (value: string) => {
    const num = parseFloat(value);
    if (!isNaN(num) && num >= 0) {
      setScale(num);
    }
  };

  const handleReset = () => {
    setWidth(100);
    setHeight(100);
    setX(0);
    setY(0);
    setScale(1);
    setPositionMode("absolute");
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

        {/* Position Mode */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Position Mode
          </label>
          <select
            value={positionMode}
            onChange={(e) =>
              setPositionMode(
                e.target.value as "absolute" | "relative" | "centered"
              )
            }
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="absolute">Absolute (px)</option>
            <option value="relative">Relative (%)</option>
            <option value="centered">Centered</option>
          </select>
        </div>

        {/* Scale */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            Scale
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={0}
              max={2}
              step={0.01}
              value={Math.min(scale, 2)}
              onChange={(e) => setScale(parseFloat(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              aria-describedby="scale-help"
            />
            <input
              type="number"
              min={0}
              step={0.1}
              value={scale}
              onChange={(e) => handleScaleNumberChange(e.target.value)}
              className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
              aria-describedby="scale-help"
            />
          </div>
          <p id="scale-help" className="text-[10px] text-gray-500 mt-1">
            Slider covers 0–200%. Enter any non-negative factor manually (e.g.,
            2.5).
          </p>
        </div>
      </div>

      <div className="text-xs text-gray-500">
        Dimensions: {width} × {height} px • Position: ({x}, {y}) • Mode:{" "}
        {positionMode} • Scale: {Math.round(scale * 100)}%
      </div>
    </div>
  );
});
