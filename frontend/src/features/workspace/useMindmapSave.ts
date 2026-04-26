import { useCallback, useState } from 'react';
import { getTreeifyApiMode, saveMindmap } from '../../shared/api/treeify';
import { mindNodeToDto } from '../../shared/transforms/treeifyTransforms';
import { useWorkspaceStore } from './workspaceStore';

export function useMindmapSave() {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const save = useCallback(async () => {
    const { nodes, currentProjectId, markClean } = useWorkspaceStore.getState();
    if (!currentProjectId) {
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const apiMode = getTreeifyApiMode();

      if (apiMode === 'mock') {
        markClean();
        return;
      }

      try {
        const dtos = nodes.map(mindNodeToDto);
        await saveMindmap(currentProjectId, dtos);
        markClean();
      } catch (error) {
        if (apiMode === 'real') {
          const message = error instanceof Error ? error.message : '保存脑图失败';
          setSaveError(message);
          return;
        }
        markClean();
      }
    } finally {
      setSaving(false);
    }
  }, []);

  return { save, saving, saveError };
}
