import { create } from 'zustand'

type Theme = 'dark' | 'light'

interface UiState {
  theme: Theme
  toggleTheme: () => void
}

export const useUiStore = create<UiState>((set) => ({
  theme: 'dark',
  toggleTheme: () => set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),
}))
