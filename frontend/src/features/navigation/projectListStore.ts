import { create } from 'zustand';
import { listProjects } from '../../shared/api/treeify';
import type { ProjectDto } from '../../shared/types/treeify';

interface ProjectListStore {
  projects: ProjectDto[];
  loading: boolean;
  fetchProjects: () => Promise<void>;
}

export const useProjectListStore = create<ProjectListStore>((set, get) => ({
  projects: [],
  loading: false,
  fetchProjects: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const projects = await listProjects();
      set({ projects, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));
