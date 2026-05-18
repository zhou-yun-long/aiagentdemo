import { create } from 'zustand';

const STORAGE_KEY = 'testing-platform.sidebar.collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function writeCollapsed(value: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // localStorage unavailable (e.g. private browsing)
  }
}

interface ProjectNavStore {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useProjectNavStore = create<ProjectNavStore>((set) => ({
  sidebarCollapsed: readCollapsed(),
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarCollapsed;
      writeCollapsed(next);
      return { sidebarCollapsed: next };
    }),
  setSidebarCollapsed: (collapsed: boolean) => {
    writeCollapsed(collapsed);
    set({ sidebarCollapsed: collapsed });
  },
}));
