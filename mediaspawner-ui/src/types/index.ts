export interface MediaSource {
  id: string;
  type: "file" | "directory";
  path: string;
  weight?: number;
  recursive?: boolean;
}

export interface VisualSettings {
  temp: boolean; // placeholder to fix linting error
  // e.g., positionX, positionY, width, height, durationSeconds, fadeInMillis, fadeOutMillis, etc.
  // Specifics to be determined by Streamer.bot capabilities
}

export interface AudioBehaviorSettings {
  volumePercent: number;
  // outputDevice?: string;
}

export interface AudioSettings {
  enabled: boolean;
  sources: MediaSource[];
  sourceSelectionMode: "random_equal" | "random_weighted" | "sequential";
  audioBehavior: AudioBehaviorSettings;
}

export interface MediaGroup {
  id: string;
  name: string;
  visualSettings?: VisualSettings;
  audioSettings?: AudioSettings;
}

export type GlobalSettings = object;

export interface AppConfig {
  version: string;
  globalSettings: GlobalSettings;
  mediaGroups: MediaGroup[];
}
