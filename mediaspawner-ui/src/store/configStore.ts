import { create } from "zustand";
import type { AppConfig, MediaGroup } from "../types";

interface ConfigState extends AppConfig {
  loadConfig: (config: AppConfig) => void;
  addMediaGroup: (newGroup: MediaGroup) => void;
  updateMediaGroup: (updatedGroup: MediaGroup) => void;
  deleteMediaGroup: (groupId: string) => void;
}

const initialState: AppConfig = {
  version: "0.1.0", // Initial version
  globalSettings: {},
  mediaGroups: [],
};

export const useConfigStore = create<ConfigState>()((set) => ({
  ...initialState,
  loadConfig: (config) => set(() => ({ ...config })),
  addMediaGroup: (newGroup) =>
    set((state) => ({ mediaGroups: [...state.mediaGroups, newGroup] })),
  updateMediaGroup: (updatedGroup) =>
    set((state) => ({
      mediaGroups: state.mediaGroups.map((group) =>
        group.id === updatedGroup.id ? updatedGroup : group
      ),
    })),
  deleteMediaGroup: (groupId) =>
    set((state) => ({
      mediaGroups: state.mediaGroups.filter((group) => group.id !== groupId),
    })),
}));
