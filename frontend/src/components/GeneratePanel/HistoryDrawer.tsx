import { useCallback, useEffect, useState } from 'react';
import { History, Loader2, Play, X, RotateCcw } from 'lucide-react';
import type { GenerationMode, TaskKind } from '../../types/generation';
import { useGenerationStore } from '../../features/generation/generationStore';
import { useGenerateStream } from '../../features/generation/useGenerateStream';
import { getDefaultProjectId } from '../../shared/api/treeify';
import { getGenerationHistory } from '../../shared/api/generationHistory';
import type { GenerateHistoryItem } from '../../shared/api/generationHistory';

type HistoryDrawerProps = {
  open: boolean;
  onClose: () => void;
  projectId?: number;
};

const TASK_KIND_LABELS: Record<string, string> = {
  cases: '用例',
  points: '拆解点',
  api_cases: '接口用例',
};

const STATUS_LABELS: Record<string, string> = {
  running: '运行中',
  done: '已完成',
  failed: '失败',
  cancelled: '已取消',
  waiting_confirm: '等待确认',
};

function formatTime(isoString: string | null): string {
  if (!isoString) return '-';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '-';
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${month}-${day} ${hours}:${minutes}`;
  } catch {
    return '-';
  }
}

export function HistoryDrawer({ open, onClose, projectId }: HistoryDrawerProps) {
  const [items, setItems] = useState<GenerateHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { retryGeneration } = useGenerateStream();

  const pid = projectId ?? getDefaultProjectId();

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getGenerationHistory(pid, 50);
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载历史记录失败');
    } finally {
      setLoading(false);
    }
  }, [pid]);

  useEffect(() => {
    if (open) {
      fetchHistory();
    }
  }, [open, fetchHistory]);

  const handleReplay = useCallback(
    (item: GenerateHistoryItem) => {
      useGenerationStore.getState().beginTask(item.taskId, '', (item.mode || 'auto') as GenerationMode);
      retryGeneration();
      onClose();
    },
    [retryGeneration, onClose]
  );

  if (!open) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'flex-end',
      }}
    >
      {/* Backdrop */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.25)',
        }}
        onClick={onClose}
      />
      {/* Drawer panel */}
      <div
        style={{
          position: 'relative',
          width: 380,
          maxWidth: '90vw',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          borderLeft: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          zIndex: 1,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: 44,
            padding: '0 12px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, fontSize: 14 }}>
            <History size={16} />
            生成历史
          </span>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: 'auto', padding: '8px 12px 12px' }}>
          {loading && (
            <div className="panel-loading">
              <Loader2 size={16} className="spinner-icon" />
              <span>加载中...</span>
            </div>
          )}

          {error && (
            <div style={{ display: 'grid', gap: 8 }}>
              <div className="panel-error">{error}</div>
              <button className="ghost small" onClick={fetchHistory} style={{ justifySelf: 'center' }}>
                <RotateCcw size={13} />
                重试
              </button>
            </div>
          )}

          {!loading && !error && items.length === 0 && (
            <div className="panel-empty">
              <History size={24} style={{ opacity: 0.4 }} />
              <span>暂无生成历史</span>
            </div>
          )}

          {!loading && !error && items.length > 0 && (
            <div className="history-list">
              {items.map((item) => (
                <button
                  key={item.taskId}
                  className="history-item"
                  onClick={() => handleReplay(item)}
                  style={{
                    width: '100%',
                    cursor: 'pointer',
                    textAlign: 'left',
                    border: '1px solid var(--border)',
                    display: 'grid',
                    gap: 6,
                    padding: 10,
                    marginBottom: 8,
                    borderRadius: 6,
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                  }}
                >
                  {/* Row 1: taskKind badge + status + replay icon */}
                  <div className="history-meta" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {item.taskKind && (
                      <span
                        className="panel-badge"
                        style={{
                          marginLeft: 0,
                          flexShrink: 0,
                        }}
                      >
                        {TASK_KIND_LABELS[item.taskKind] ?? item.taskKind}
                      </span>
                    )}
                    <span
                      className="execution-chip"
                      style={{
                        ...(item.status === 'done'
                          ? { color: '#156c2c', background: '#dcfce7' }
                          : item.status === 'running'
                          ? { color: '#8a5a00', background: '#fff1b8' }
                          : item.status === 'failed'
                          ? { color: '#a32020', background: '#fee2e2' }
                          : {}),
                      }}
                    >
                      {STATUS_LABELS[item.status] ?? item.status}
                    </span>
                    <span style={{ marginLeft: 'auto', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
                      <Play size={13} />
                    </span>
                  </div>

                  {/* Row 2: mode + resultCount + date */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
                    <span className="tag mini" style={{ height: 18, fontSize: 11 }}>
                      {item.mode === 'step' ? '逐步' : '自动'}
                    </span>
                    {item.resultCount != null && item.resultCount > 0 && (
                      <span style={{ color: 'var(--muted)' }}>
                        {item.resultCount} 条结果
                      </span>
                    )}
                    {item.criticScore != null && item.criticScore > 0 && (
                      <span className="critic-score" style={{ fontSize: 11, height: 18, lineHeight: '18px' }}>
                        {item.criticScore}
                      </span>
                    )}
                    <span className="history-date" style={{ marginLeft: 'auto' }}>
                      {formatTime(item.createdAt)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
