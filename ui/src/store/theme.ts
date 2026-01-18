import { create } from 'zustand';

interface ThemeState {
  isDark: boolean;
  toggle: () => void;
  setDark: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  toggle: () => set((state) => ({ isDark: !state.isDark })),
  setDark: (isDark) => set({ isDark }),
}));
