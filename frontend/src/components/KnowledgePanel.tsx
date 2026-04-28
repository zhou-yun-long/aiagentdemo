import { useCallback, useEffect, useState } from 'react';
import { BookOpen, Loader2, Plus, Search, Trash2, X } from 'lucide-react';
import {
  addKnowledgeDocument,
  deleteKnowledgeDocument,
  listKnowledgeDocuments,
  searchKnowledge
} from '../shared/api/treeify';
import type { KnowledgeDocumentDto } from '../shared/types/treeify';

type KnowledgePanelProps = {
  open: boolean;
  projectId: number;
  onClose: () => void;
};

export function KnowledgePanel({ open, projectId, onClose }: KnowledgePanelProps) {
  const [documents, setDocuments] = useState<KnowledgeDocumentDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [searching, setSearching] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newSource, setNewSource] = useState('');
  const [adding, setAdding] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listKnowledgeDocuments(projectId);
      setDocuments(data);
    } catch {
      setDocuments([]);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadDocuments();
    }
  }, [open, loadDocuments]);

  const handleSearch = async () => {
    if (!keyword.trim()) {
      loadDocuments();
      return;
    }
    setSearching(true);
    setError(null);
    try {
      const data = await searchKnowledge(projectId, keyword.trim());
      setDocuments(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
    } finally {
      setSearching(false);
    }
  };

  const handleDelete = async (docId: number) => {
    try {
      await deleteKnowledgeDocument(docId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim() || !newContent.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const doc = await addKnowledgeDocument(projectId, {
        title: newTitle.trim(),
        content: newContent.trim(),
        source: newSource.trim() || 'manual'
      });
      setDocuments((prev) => [doc, ...prev]);
      setNewTitle('');
      setNewContent('');
      setNewSource('');
      setShowAddForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败');
    } finally {
      setAdding(false);
    }
  };

  return (
    <aside className={`knowledge-panel ${open ? 'open' : ''}`}>
      <div className="panel-header">
        <strong>知识库</strong>
        <button className="icon" onClick={onClose} aria-label="关闭知识库">
          <X size={16} />
        </button>
      </div>
      <div className="panel-body">
        {error && <div className="panel-error">{error}</div>}

        <div className="knowledge-search">
          <input
            type="text"
            placeholder="搜索知识库..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button className="icon" onClick={handleSearch} disabled={searching}>
            {searching ? <Loader2 size={14} className="spinner-icon" /> : <Search size={14} />}
          </button>
        </div>

        <div className="knowledge-list">
          {loading ? (
            <div className="panel-loading">
              <Loader2 size={16} className="spinner-icon" />
              <span>加载中...</span>
            </div>
          ) : documents.length === 0 ? (
            <div className="panel-empty">
              <BookOpen size={24} />
              <span>暂无文档</span>
            </div>
          ) : (
            documents.map((doc) => (
              <div className="knowledge-item" key={doc.id}>
                <div className="knowledge-item-header">
                  <span className="knowledge-title">{doc.title}</span>
                  <button
                    className="icon danger"
                    onClick={() => handleDelete(doc.id)}
                    aria-label="删除文档"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
                <div className="knowledge-meta">
                  <span className="panel-badge">{doc.source}</span>
                  <span className="knowledge-date">
                    {new Date(doc.createdAt).toLocaleString('zh-CN')}
                  </span>
                </div>
                <div className="knowledge-preview">{doc.content.slice(0, 100)}...</div>
              </div>
            ))
          )}
        </div>

        {showAddForm ? (
          <div className="knowledge-add-form">
            <input
              type="text"
              placeholder="文档标题"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
            <textarea
              placeholder="文档内容"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />
            <input
              type="text"
              placeholder="来源 (可选)"
              value={newSource}
              onChange={(e) => setNewSource(e.target.value)}
            />
            <div className="panel-actions">
              <button className="primary" onClick={handleAdd} disabled={adding || !newTitle.trim() || !newContent.trim()}>
                {adding ? <Loader2 size={14} className="spinner-icon" /> : null}
                {adding ? '添加中...' : '确认添加'}
              </button>
              <button onClick={() => setShowAddForm(false)}>取消</button>
            </div>
          </div>
        ) : (
          <div className="panel-actions">
            <button className="green" onClick={() => setShowAddForm(true)}>
              <Plus size={14} />
              添加文档
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
