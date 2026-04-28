import { useEffect } from 'react';
import { getTreeifyApiMode, saveMindmap } from '../../shared/api/treeify';
import { mindNodeToDto } from '../../shared/transforms/treeifyTransforms';
import { useWorkspaceStore } from './workspaceStore';

export function useWorkspaceAutosave() {
  const dirty = useWorkspaceStore((state) => state.dirty);
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId);
  const nodes = useWorkspaceStore((state) => state.nodes);

  useEffect(() => {
    if (!dirty || !currentProjectId) {
      return;
    }

    const timer = window.setTimeout(() => {
      const { nodes: latestNodes, currentProjectId: latestProjectId, markClean } = useWorkspaceStore.getState();
      if (!latestProjectId) {
        return;
      }

      if (getTreeifyApiMode() === 'mock') {
        markClean();
        return;
      }

      saveMindmap(latestProjectId, latestNodes.map(mindNodeToDto))
        .then(() => markClean())
        .catch(() => {
          // Keep the dirty flag so the manual save button can retry and surface the error.
        });
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [dirty, currentProjectId, nodes]);
}
