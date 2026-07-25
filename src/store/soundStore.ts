import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SoundStore {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (enabled: boolean) => void;
}

export const useSoundStore = create<SoundStore>()(
  persist(
    (set) => ({
      enabled: true,
      toggle: () => set((state) => ({ enabled: !state.enabled })),
      setEnabled: (enabled) => set({ enabled }),
    }),
    {
      name: "arcane-sound-store",
    },
  ),
);
