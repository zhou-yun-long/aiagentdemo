import { useCallback, useState } from 'react';
import { getTreeifyApiMode, saveMindmap } from '../../shared/api/treeify';
import { mindNodeToDto } from '../../shared/transforms/treeifyTransforms';
import { useWorkspaceStore } from './workspaceStore';

type SaveResult = {
  type: 'success' | 'error';
  message: string;
};

export function useMindmapSave() {
  const [saving, setSaving] = useState(false);
  const [saveResult, setSaveResult] = useState<SaveResult | null>(null);

  const showResult = useCallback((result: SaveResult) => {
    setSaveResult(result);
    setTimeout(() => setSaveResult(null), 4000);
  }, []);

  const save = useCallback(async () => {
    const { nodes, currentProjectId, markClean } = useWorkspaceStore.getState();
    if (!currentProjectId) {
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const apiMode = getTreeifyApiMode();

      if (apiMode === 'mock') {
        markClean();
        showResult({ type: 'success', message: '已保存' });
        return;
      }

      try {
        const dtos = nodes.map(mindNodeToDto);
        await saveMindmap(currentProjectId, dtos);
        markClean();
        showResult({ type: 'success', message: '已保存' });
      } catch (error) {
        const message = error instanceof Error ? error.message : '保存失败';
        showResult({ type: 'error', message });
      }
    } finally {
      setSaving(false);
    }
  }, [showResult]);

  return { save, saving, saveResult };
}
