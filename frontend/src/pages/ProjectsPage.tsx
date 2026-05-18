import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FolderOpen, Loader2, Plus, Trash2, X } from 'lucide-react';
import {
  listProjects, createProject, updateProject, archiveProject,
  restoreProject, getAllProjectStats
} from '../shared/api/treeify';
import type { ProjectDto, ProjectRequest, CaseStatsDto } from '../shared/types/treeify';

type FilterTab = 'all' | 'active' | 'archived';
type SortField = 'name' | 'updatedAt' | 'caseCount';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectDto[]>([]);
  const [statsMap, setStatsMap] = useState<Record<number, CaseStatsDto>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterTab>('active');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('updatedAt');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingProject, setEditingProject] = useState<ProjectDto | null>(null);
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [projectsData, statsData] = await Promise.all([
        listProjects(),
        getAllProjectStats()
      ]);
      setProjects(projectsData);
      setStatsMap(statsData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载项目列表失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const activeCount = projects.filter((p) => p.status === 'active').length;
  const archivedCount = projects.filter((p) => p.status === 'archived').length;

  const filtered = useMemo(() => {
    let result = projects;

    if (filter === 'active') result = result.filter((p) => p.status === 'active');
    else if (filter === 'archived') result = result.filter((p) => p.status === 'archived');

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      if (sortField === 'name') return a.name.localeCompare(b.name, 'zh-CN');
      if (sortField === 'caseCount') return (statsMap[b.id]?.total ?? 0) - (statsMap[a.id]?.total ?? 0);
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    return result;
  }, [projects, filter, search, sortField, statsMap]);

  const openCreate = () => {
    setEditingProject(null);
    setFormName('');
    setFormDesc('');
  };

  const openEdit = (project: ProjectDto) => {
    setEditingProject(project);
    setFormName(project.name);
    setFormDesc(project.description);
  };

  const closeModal = () => {
    setEditingProject(null);
    setFormName('');
    setFormDesc('');
  };

  const handleSave = async () => {
    const name = formName.trim();
    if (!name) return;
    setSaving(true);
    try {
      const body: ProjectRequest = { name, description: formDesc.trim() };
      if (editingProject) {
        await updateProject(editingProject.id, body);
      } else {
        await createProject(body);
      }
      closeModal();
      await loadData();
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
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : '归档失败');
    }
  };

  const handleRestore = async (project: ProjectDto) => {
    try {
      await restoreProject(project.id);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : '恢复失败');
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (filtered.every((p) => selectedIds.has(p.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((p) => p.id)));
    }
  };

  const handleBatchArchive = async () => {
    if (!window.confirm(`确认归档选中的 ${selectedIds.size} 个项目？`)) return;
    await Promise.all(Array.from(selectedIds).map((id) => archiveProject(id).catch(() => undefined)));
    setSelectedIds(new Set());
    await loadData();
  };

  const handleBatchRestore = async () => {
    await Promise.all(Array.from(selectedIds).map((id) => restoreProject(id).catch(() => undefined)));
    setSelectedIds(new Set());
    await loadData();
  };

  const hasSelectedArchived = Array.from(selectedIds).some((id) => projects.find((p) => p.id === id)?.status === 'archived');
  const hasSelectedActive = Array.from(selectedIds).some((id) => projects.find((p) => p.id === id)?.status === 'active');

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

      <div className="projects-search-bar">
        <input
          type="text"
          placeholder="搜索项目名称或描述..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={sortField} onChange={(e) => setSortField(e.target.value as SortField)}>
          <option value="updatedAt">按更新时间</option>
          <option value="name">按名称</option>
          <option value="caseCount">按用例数</option>
        </select>
      </div>

      {selectedIds.size > 0 && (
        <div className="projects-batch-bar">
          <span>已选 {selectedIds.size} 项</span>
          {hasSelectedActive && (
            <button className="danger" onClick={handleBatchArchive}>
              <Trash2 size={13} />
              批量归档
            </button>
          )}
          {hasSelectedArchived && (
            <button onClick={handleBatchRestore}>批量恢复</button>
          )}
          <button className="ghost" style={{ border: 'none', padding: '0 6px' }} onClick={() => setSelectedIds(new Set())}>
            <X size={14} />
          </button>
        </div>
      )}

      {formName !== '' || editingProject !== null ? (
        <div className="project-modal-overlay" onClick={closeModal}>
          <div className="project-modal" onClick={(e) => e.stopPropagation()}>
            <h2>{editingProject ? '编辑项目' : '新建项目'}</h2>
            <div className="project-modal-field">
              <label htmlFor="project-name">项目名称</label>
              <input
                id="project-name"
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') closeModal(); }}
              />
            </div>
            <div className="project-modal-field">
              <label htmlFor="project-desc">项目描述</label>
              <textarea
                id="project-desc"
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                rows={3}
                onKeyDown={(e) => { if (e.key === 'Escape') closeModal(); }}
              />
            </div>
            {editingProject && (
              <div className="project-modal-field">
                <label>元信息</label>
                <div className="read-only">
                  ID: {editingProject.id} · 状态: {editingProject.status === 'active' ? '活跃' : '已归档'}<br />
                  创建: {formatDate(editingProject.createdAt)} · 更新: {formatDate(editingProject.updatedAt)}<br />
                  用例: {statsMap[editingProject.id]?.total ?? 0} 条 · 通过率: {statsMap[editingProject.id]?.passRate ?? 0}%
                </div>
              </div>
            )}
            <div className="project-modal-actions">
              <div className="left-actions">
                {editingProject && editingProject.status === 'active' && (
                  <button className="danger" onClick={() => { closeModal(); handleArchive(editingProject); }}>归档此项目</button>
                )}
              </div>
              <div className="right-actions">
                <button onClick={closeModal}>取消</button>
                <button className="primary" onClick={handleSave} disabled={saving || !formName.trim()}>
                  {saving ? '保存中...' : editingProject ? '保存' : '创建'}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {loading ? (
        <div className="projects-loading">
          <Loader2 size={24} className="spinner-icon" />
          <span>加载中...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="projects-empty">
          <FolderOpen size={32} />
          <span>{search ? '没有匹配的项目' : filter === 'archived' ? '没有已归档的项目' : filter === 'active' ? '没有活跃项目，点击「新建项目」创建' : '暂无项目'}</span>
        </div>
      ) : (
        <>
          {filtered.length > 0 && projects.length !== filtered.length && (
            <p style={{ marginBottom: 8, fontSize: 12, color: 'var(--muted)', maxWidth: 800 }}>
              显示 {filtered.length} / {projects.length} 项
              {selectedIds.size > 0 && filtered.length > 1 && (
                <button
                  style={{ marginLeft: 8, border: 'none', background: 'none', color: 'var(--blue)', cursor: 'pointer', fontSize: 12, padding: 0 }}
                  onClick={handleSelectAll}
                >
                  {filtered.every((p) => selectedIds.has(p.id)) ? '取消全选' : '全选'}
                </button>
              )}
            </p>
          )}
          <div className="projects-list">
            {filtered.map((project) => {
              const stats = statsMap[project.id];
              return (
                <div key={project.id} className="project-card">
                  <div className="project-card-select">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(project.id)}
                      onChange={() => handleSelect(project.id)}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="project-card-header">
                        <span className="project-card-name">{project.name}</span>
                        <span className={`project-status-badge ${project.status}`}>
                          {project.status === 'active' ? '活跃' : '已归档'}
                        </span>
                      </div>
                      {project.description && (
                        <div className="project-card-desc">{project.description}</div>
                      )}
                      <div className="project-card-stats">
                        <span>用例 <span className="stat-value">{stats?.total ?? 0}</span></span>
                        <span>通过 <span className="stat-value">{stats?.passed ?? 0}</span></span>
                        <span>通过率 <span className="stat-value">{stats?.passRate ?? 0}%</span></span>
                        {stats && stats.total > 0 && (
                          <div className="project-stats-bar">
                            <div className="project-stats-bar-fill" style={{ width: `${stats.passRate}%` }} />
                          </div>
                        )}
                      </div>
                      <div className="project-card-meta">
                        <span>创建: {formatDate(project.createdAt)}</span>
                        <span>更新: {formatDate(project.updatedAt)}</span>
                      </div>
                      <div className="project-card-actions">
                        <Link to={`/?projectId=${project.id}`} className="ghost" style={{ textDecoration: 'none' }}>
                          进入
                        </Link>
                        <button className="ghost" onClick={() => openEdit(project)}>编辑</button>
                        {project.status === 'active' ? (
                          <button className="ghost danger" onClick={() => handleArchive(project)}>归档</button>
                        ) : (
                          <button className="ghost" onClick={() => handleRestore(project)}>恢复</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
