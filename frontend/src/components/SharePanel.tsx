import { useCallback, useEffect, useState } from 'react';
import { Copy, Loader2, Trash2, X } from 'lucide-react';
import { createShare, getShare, revokeShare } from '../shared/api/treeify';
import type { ShareDto } from '../shared/types/treeify';

type SharePanelProps = {
  open: boolean;
  projectId: number;
  onClose: () => void;
};

export function SharePanel({ open, projectId, onClose }: SharePanelProps) {
  const [share, setShare] = useState<ShareDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const loadShare = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getShare(projectId);
      setShare(data);
    } catch {
      setShare(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadShare();
    }
  }, [open, loadShare]);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const data = await createShare(projectId);
      setShare(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建分享链接失败');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async () => {
    if (!window.confirm('确认撤销分享链接？撤销后他人将无法访问。')) return;
    try {
      await revokeShare(projectId);
      setShare(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤销分享失败');
    }
  };

  const handleCopy = async () => {
    if (!share) return;
    const url = `${window.location.origin}${share.shareUrl}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('复制失败，请手动复制');
    }
  };

  return (
    <aside className={`share-panel ${open ? 'open' : ''}`}>
      <div className="panel-header">
        <strong>用例分享</strong>
        <button className="icon" onClick={onClose} aria-label="关闭分享">
          <X size={16} />
        </button>
      </div>
      <div className="panel-body">
        {error && <div className="panel-error">{error}</div>}

        {loading ? (
          <div className="panel-loading">
            <Loader2 size={16} className="spinner-icon" />
            <span>加载中...</span>
          </div>
        ) : share ? (
          <div className="share-content">
            <p className="share-desc">分享链接已生成，他人可通过此链接只读查看项目用例：</p>
            <div className="share-url-box">
              <input
                type="text"
                readOnly
                value={`${window.location.origin}${share.shareUrl}`}
                className="share-url-input"
              />
              <button className="share-copy-btn" onClick={handleCopy}>
                <Copy size={14} />
                {copied ? '已复制' : '复制'}
              </button>
            </div>
            <div className="share-actions">
              <button className="danger" onClick={handleRevoke}>
                <Trash2 size={14} />
                撤销分享
              </button>
            </div>
          </div>
        ) : (
          <div className="share-empty">
            <p>尚未创建分享链接</p>
            <button className="primary" onClick={handleCreate} disabled={creating}>
              {creating ? <Loader2 size={14} className="spinner-icon" /> : null}
              {creating ? '生成中...' : '生成分享链接'}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
