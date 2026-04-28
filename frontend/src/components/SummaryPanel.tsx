import { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, FileText, Loader2, RotateCcw, X } from 'lucide-react';
import {
  generateSummary,
  getProjectSummary,
  getSummaryHistory,
  rollbackSummary
} from '../shared/api/treeify';
import type { ProjectSummaryDto } from '../shared/types/treeify';

type SummaryPanelProps = {
  open: boolean;
  projectId: number;
  onClose: () => void;
};

export function SummaryPanel({ open, projectId, onClose }: SummaryPanelProps) {
  const [summary, setSummary] = useState<ProjectSummaryDto | null>(null);
  const [history, setHistory] = useState<ProjectSummaryDto[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjectSummary(projectId);
      setSummary(data);
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadHistory = useCallback(async () => {
    try {
      const data = await getSummaryHistory(projectId);
      setHistory(data);
    } catch {
      setHistory([]);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadSummary();
    }
  }, [open, loadSummary]);

  useEffect(() => {
    if (open && showHistory) {
      loadHistory();
    }
  }, [open, showHistory, loadHistory]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const data = await generateSummary(projectId);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成摘要失败');
    } finally {
      setGenerating(false);
    }
  };

  const handleRollback = async (version: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await rollbackSummary(projectId, version);
      setSummary(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '回滚失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <aside className={`summary-panel ${open ? 'open' : ''}`}>
      <div className="panel-header">
        <strong>项目摘要</strong>
        <button className="icon" onClick={onClose} aria-label="关闭项目摘要">
          <X size={16} />
        </button>
      </div>
      <div className="panel-body">
        {error && <div className="panel-error">{error}</div>}

        <section className="panel-section">
          <div className="panel-section-header">
            <FileText size={14} />
            <span>当前摘要</span>
            {summary && <span className="panel-badge">v{summary.version}</span>}
          </div>
          <div className="summary-content">
            {loading ? (
              <div className="panel-loading">
                <Loader2 size={16} className="spinner-icon" />
                <span>加载中...</span>
              </div>
            ) : summary ? (
              <div className="summary-text">{summary.content}</div>
            ) : (
              <div className="panel-empty">暂无摘要</div>
            )}
          </div>
          <div className="panel-actions">
            <button className="primary" onClick={handleGenerate} disabled={generating}>
              {generating ? <Loader2 size={14} className="spinner-icon" /> : null}
              {generating ? '生成中...' : '生成摘要'}
            </button>
          </div>
        </section>

        <section className="panel-section">
          <button
            className="panel-section-toggle"
            onClick={() => setShowHistory((v) => !v)}
          >
            {showHistory ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            <span>历史版本</span>
            {history.length > 0 && <span className="panel-badge">{history.length}</span>}
          </button>
          {showHistory && (
            <div className="history-list">
              {history.length === 0 ? (
                <div className="panel-empty">暂无历史版本</div>
              ) : (
                history.map((item) => (
                  <div className="history-item" key={item.id}>
                    <div className="history-meta">
                      <span className="panel-badge">v{item.version}</span>
                      <span className="history-date">
                        {new Date(item.createdAt).toLocaleString('zh-CN')}
                      </span>
                      {item.current && <span className="panel-tag">当前</span>}
                    </div>
                    <div className="history-preview">{item.content.slice(0, 80)}...</div>
                    {!item.current && (
                      <button
                        className="small"
                        onClick={() => handleRollback(item.version)}
                        disabled={loading}
                      >
                        <RotateCcw size={12} />
                        回滚
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
