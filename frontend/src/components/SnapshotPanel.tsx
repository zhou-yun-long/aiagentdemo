import { useCallback, useEffect, useState } from 'react';
import { Camera, Clock, Loader2, Trash2, X } from 'lucide-react';
import {
  createSnapshot,
  deleteSnapshot,
  listSnapshots
} from '../shared/api/treeify';
import type { SnapshotDto } from '../shared/types/treeify';
import type { MindNode } from '../shared/types/workspace';

type SnapshotPanelProps = {
  open: boolean;
  projectId: number;
  nodes: MindNode[];
  onClose: () => void;
  onRestore: (nodes: MindNode[]) => void;
};

export function SnapshotPanel({ open, projectId, nodes, onClose, onRestore }: SnapshotPanelProps) {
  const [snapshots, setSnapshots] = useState<SnapshotDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshotName, setSnapshotName] = useState('');

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listSnapshots(projectId);
      setSnapshots(data);
    } catch {
      setSnapshots([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadSnapshots();
    }
  }, [open, loadSnapshots]);

  const handleCreate = async () => {
    setSaving(true);
    setError(null);
    try {
      const data = JSON.stringify(nodes);
      const snap = await createSnapshot(projectId, snapshotName.trim() || undefined, undefined, data);
      setSnapshots((prev) => [snap, ...prev]);
      setSnapshotName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建快照失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (snapshotId: number) => {
    try {
      await deleteSnapshot(snapshotId);
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除快照失败');
    }
  };

  const handleRestore = (snapshot: SnapshotDto) => {
    if (window.confirm(`确认回滚到快照「${snapshot.name}」？当前未保存的改动将丢失。`)) {
      try {
        const restoredNodes = JSON.parse(snapshot.data) as MindNode[];
        onRestore(restoredNodes);
      } catch (err) {
        setError('快照数据解析失败');
      }
    }
  };

  return (
    <aside className={`snapshot-panel ${open ? 'open' : ''}`}>
      <div className="panel-header">
        <strong>快照管理</strong>
        <button className="icon" onClick={onClose} aria-label="关闭快照管理">
          <X size={16} />
        </button>
      </div>
      <div className="panel-body">
        {error && <div className="panel-error">{error}</div>}

        <div className="snapshot-create">
          <input
            type="text"
            placeholder="快照名称（可选）"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button className="primary" onClick={handleCreate} disabled={saving}>
            {saving ? <Loader2 size={14} className="spinner-icon" /> : <Camera size={14} />}
            {saving ? '保存中...' : '保存快照'}
          </button>
        </div>

        <div className="snapshot-list">
          {loading ? (
            <div className="panel-loading">
              <Loader2 size={16} className="spinner-icon" />
              <span>加载中...</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="panel-empty">
              <Camera size={24} />
              <span>暂无快照</span>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div className="snapshot-item" key={snap.id}>
                <div className="snapshot-item-header">
                  <span className="snapshot-name">{snap.name}</span>
                  <button
                    className="icon danger"
                    onClick={() => handleDelete(snap.id)}
                    aria-label="删除快照"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="snapshot-meta">
                  <span className="panel-badge">{snap.caseCount} 个节点</span>
                  <span className="snapshot-date">
                    <Clock size={11} />
                    {new Date(snap.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                {snap.description && (
                  <div className="snapshot-desc">{snap.description}</div>
                )}
                <button className="small" onClick={() => handleRestore(snap)}>
                  回滚到此快照
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
