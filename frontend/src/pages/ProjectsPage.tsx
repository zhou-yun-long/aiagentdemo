import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Loader2, Plus } from 'lucide-react';
import { listProjects, createProject, updateProject, archiveProject } from '../shared/api/treeify';
import type { ProjectDto, ProjectRequest } from '../shared/types/treeify';

type FilterTab = 'all' | 'active' | 'archived';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listProjects();
      setProjects(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载项目列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadProjects(); }, [loadProjects]);

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const archivedCount = projects.filter((p) => p.status === 'archived').length;

  const filtered = projects.filter((p) => {
    if (filter === 'active') return p.status === 'active';
    if (filter === 'archived') return p.status === 'archived';
    return true;
  });

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormDesc('');
    setFormOpen(true);
  };

  const openEdit = (project: ProjectDto) => {
    setEditingId(project.id);
    setFormName(project.name);
    setFormDesc(project.description);
    setFormOpen(true);
  };

  const cancelForm = () => {
    setFormOpen(false);
    setEditingId(null);
    setFormName('');
    setFormDesc('');
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const body: ProjectRequest = { name, description: formDesc.trim() };
      if (editingId) {
        await updateProject(editingId, body);
      } else {
        await createProject(body);
      }
      cancelForm();
      await loadProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleArchive = async (project: ProjectDto) => {
    if (!window.confirm(`确定归档项目「${project.name}」？`)) return;
    try {
      await archiveProject(project.id);
      await loadProjects();
    } catch (e) {
      setError(e instanceof Error ? e.message : '归档失败');
    }
  };

  return (
    <div className="projects-page">
      <div className="projects-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to="/" className="back-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            <ArrowLeft size={16} />
            <span>返回</span>
          </Link>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>项目管理</h1>
        </div>
        <button className="primary" onClick={openCreate}>
          <Plus size={14} />
          新建项目
        </button>
      </div>

      {error && (
        <div className="projects-error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      <div className="projects-filter">
        <button className={filter === 'active' ? 'active' : ''} onClick={() => setFilter('active')}>
          活跃 <span className="filter-count">{activeCount}</span>
        </button>
        <button className={filter === 'archived' ? 'active' : ''} onClick={() => setFilter('archived')}>
          已归档 <span className="filter-count">{archivedCount}</span>
        </button>
        <button className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>
          全部 <span className="filter-count">{projects.length}</span>
        </button>
      </div>

      {formOpen && (
        <div className="project-form">
          <div className="project-form-row">
            <input
              type="text"
              placeholder="项目名称"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelForm(); }}
            />
            <input
              type="text"
              placeholder="项目描述（可选）"
              value={formDesc}
              onChange={(e) => setFormDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') cancelForm(); }}
            />
          </div>
          <div className="project-form-actions">
            <button className="primary" onClick={handleSave} disabled={saving || !formName.trim()}>
              {saving ? <Loader2 size={14} className="spinner-icon" /> : null}
              {editingId ? '保存' : '创建'}
            </button>
            <button onClick={cancelForm}>取消</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="projects-loading">
          <Loader2 size={24} className="spinner-icon" />
          <span>加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="projects-empty">
          <FolderOpen size={32} />
          <span>{filter === 'archived' ? '没有已归档的项目' : filter === 'active' ? '没有活跃项目，点击「新建项目」创建' : '暂无项目'}</span>
        </div>
      ) : (
        <div className="projects-list">
          {filtered.map((project) => (
            <div key={project.id} className="project-card">
              <div className="project-card-header">
                <span className="project-card-name">{project.name}</span>
                <span className={`project-status-badge ${project.status}`}>
                  {project.status === 'active' ? '活跃' : '已归档'}
                </span>
              </div>
              {project.description && (
                <div className="project-card-desc">{project.description}</div>
              )}
              <div className="project-card-meta">
                <span>创建: {formatDate(project.createdAt)}</span>
                <span>更新: {formatDate(project.updatedAt)}</span>
              </div>
              <div className="project-card-actions">
                <Link to={`/?projectId=${project.id}`} className="ghost" style={{ textDecoration: 'none' }}>
                  进入
                </Link>
                <button className="ghost" onClick={() => openEdit(project)}>编辑</button>
                {project.status === 'active' && (
                  <button className="ghost danger" onClick={() => handleArchive(project)}>归档</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
