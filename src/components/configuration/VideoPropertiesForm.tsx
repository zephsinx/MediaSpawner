import { useState, useEffect, useCallback, memo, useMemo } from "react";
import type { MediaAsset } from "../../types/media";

export interface VideoPropertiesFormProps {
  asset: MediaAsset;
  onChange: (updatedAsset: MediaAsset) => void;
}

export const VideoPropertiesForm = memo(function VideoPropertiesForm({
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
  const [autoplay, setAutoplay] = useState<boolean>(
    asset.properties.autoplay || false
  );
  const [muted, setMuted] = useState<boolean>(asset.properties.muted || false);

  // Stable reference for onChange to prevent re-render loops
  const stableOnChange = useCallback(
    (updatedAsset: MediaAsset) => {
      onChange(updatedAsset);
    },
    [onChange]
  );

  // Memoize asset properties to create stable reference and prevent loops
  const assetProperties = useMemo(
    () => ({
      width: asset.properties.dimensions?.width || 100,
      height: asset.properties.dimensions?.height || 100,
      x: asset.properties.position?.x || 0,
      y: asset.properties.position?.y || 0,
      volume: (asset.properties.volume || 0.5) * 100,
      loop: asset.properties.loop || false,
      autoplay: asset.properties.autoplay || false,
      muted: asset.properties.muted || false,
    }),
    [
      asset.properties.dimensions?.width,
      asset.properties.dimensions?.height,
      asset.properties.position?.x,
      asset.properties.position?.y,
      asset.properties.volume,
      asset.properties.loop,
      asset.properties.autoplay,
      asset.properties.muted,
    ]
  );

  // Update local state when asset properties change
  useEffect(() => {
    setWidth(assetProperties.width);
    setHeight(assetProperties.height);
    setX(assetProperties.x);
    setY(assetProperties.y);
    setVolume(assetProperties.volume);
    setLoop(assetProperties.loop);
    setAutoplay(assetProperties.autoplay);
    setMuted(assetProperties.muted);
  }, [assetProperties]);

  // Update asset when values change
  useEffect(() => {
    const updatedAsset: MediaAsset = {
      ...asset,
      properties: {
        ...asset.properties,
        dimensions: { width, height },
        position: { x, y },
        volume: volume / 100, // Convert percentage back to 0-1 range
        loop,
        autoplay,
        muted,
      },
    };
    stableOnChange(updatedAsset);
  }, [
    width,
    height,
    x,
    y,
    volume,
    loop,
    autoplay,
    muted,
    stableOnChange,
    asset,
  ]);

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
    setAutoplay(false);
    setMuted(false);
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
          <label
            className="block text-xs font-medium text-gray-700 mb-1"
            htmlFor={`width-${asset.id}`}
          >
            Width (px)
          </label>
          <input
            id={`width-${asset.id}`}
            type="number"
            min="1"
            value={width}
            onChange={(e) => handleNumberChange(e.target.value, setWidth, 1)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium text-gray-700 mb-1"
            htmlFor={`height-${asset.id}`}
          >
            Height (px)
          </label>
          <input
            id={`height-${asset.id}`}
            type="number"
            min="1"
            value={height}
            onChange={(e) => handleNumberChange(e.target.value, setHeight, 1)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Position */}
        <div>
          <label
            className="block text-xs font-medium text-gray-700 mb-1"
            htmlFor={`x-${asset.id}`}
          >
            X Position (px)
          </label>
          <input
            id={`x-${asset.id}`}
            type="number"
            min="0"
            value={x}
            onChange={(e) => handleNumberChange(e.target.value, setX, 0)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label
            className="block text-xs font-medium text-gray-700 mb-1"
            htmlFor={`y-${asset.id}`}
          >
            Y Position (px)
          </label>
          <input
            id={`y-${asset.id}`}
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
        <label
          className="block text-xs font-medium text-gray-700 mb-2"
          htmlFor={`volume-${asset.id}`}
        >
          Volume: {volume}%
        </label>
        <div className="flex items-center space-x-3">
          <input
            type="range"
            min="0"
            max="100"
            id={`volume-${asset.id}`}
            value={volume}
            onChange={(e) => setVolume(parseInt(e.target.value, 10))}
            className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
            aria-describedby={`volume-help-${asset.id}`}
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
            aria-describedby={`volume-help-${asset.id}`}
          />
        </div>
        <p id={`volume-help-${asset.id}`} className="sr-only">
          0 is silent; 100 is maximum volume.
        </p>
      </div>

      <fieldset className="mt-2">
        <legend className="text-xs font-medium text-gray-700 mb-1">
          Playback options
        </legend>
        <div className="flex flex-col gap-2">
          <label
            htmlFor={`loop-${asset.id}`}
            className="inline-flex items-center gap-2 text-xs text-gray-700"
          >
            <input
              type="checkbox"
              id={`loop-${asset.id}`}
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            Loop
          </label>
          <label
            htmlFor={`autoplay-${asset.id}`}
            className="inline-flex items-center gap-2 text-xs text-gray-700"
          >
            <input
              type="checkbox"
              id={`autoplay-${asset.id}`}
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            Autoplay
          </label>
          <label
            htmlFor={`muted-${asset.id}`}
            className="inline-flex items-center gap-2 text-xs text-gray-700"
          >
            <input
              type="checkbox"
              id={`muted-${asset.id}`}
              checked={muted}
              onChange={(e) => setMuted(e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
            />
            Muted
          </label>
        </div>
      </fieldset>

      <div className="text-xs text-gray-500">
        Dimensions: {width} × {height} px • Position: ({x}, {y}) • Volume:{" "}
        {volume}% • Loop: {loop ? "On" : "Off"} • Autoplay:{" "}
        {autoplay ? "On" : "Off"} • Muted: {muted ? "On" : "Off"}
      </div>
    </div>
  );
});
