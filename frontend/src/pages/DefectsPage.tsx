import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Bug, Plus, Filter } from 'lucide-react';
import { listDefects, createDefect, transitionDefect } from '../shared/api/defects';
import type { CreateDefectRequest, DefectDto } from '../shared/types/defect';

const STATUS_TABS = [
  { key: '', label: '全部' },
  { key: 'open', label: 'Open' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'resolved', label: 'Resolved' },
  { key: 'closed', label: 'Closed' },
];

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
  reopened: 'Reopened',
};

const STATUS_COLORS: Record<string, string> = {
  open: '#3b82f6',
  in_progress: '#f59e0b',
  resolved: '#10b981',
  closed: '#6b7280',
  reopened: '#ef4444',
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#9ca3af',
};

export default function DefectsPage() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = Number(projectIdParam);

  const [defects, setDefects] = useState<DefectDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateDefectRequest>({
    title: '',
    description: '',
    severity: 'medium',
    reporter: '',
    assignee: '',
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listDefects(projectId, statusFilter || undefined);
      setDefects(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载缺陷列表失败');
    } finally {
      setLoading(false);
    }
  }, [projectId, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    try {
      await createDefect(projectId, form);
      setModalOpen(false);
      setForm({ title: '', description: '', severity: 'medium', reporter: '', assignee: '' });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建缺陷失败');
    }
  };

  const handleTransition = async (defectId: number, targetStatus: string) => {
    try {
      await transitionDefect(defectId, { targetStatus });
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : '状态变更失败');
    }
  };

  return (
    <div className="plans-page">
      <div className="plans-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to={`/projects/${projectId}/dashboard`} className="back-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            <ArrowLeft size={16} />
            <span>返回</span>
          </Link>
          <Bug size={18} />
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>缺陷跟踪</h1>
        </div>
        <button className="primary" onClick={() => setModalOpen(true)}>
          <Plus size={14} />
          新建缺陷
        </button>
      </div>

      {error && (
        <div className="plans-error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <Filter size={14} style={{ color: '#888' }} />
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            style={{
              padding: '4px 12px',
              borderRadius: '4px',
              border: '1px solid',
              borderColor: statusFilter === tab.key ? '#1f6cff' : '#d9d9d9',
              background: statusFilter === tab.key ? '#e6f0ff' : '#fff',
              color: statusFilter === tab.key ? '#1f6cff' : '#333',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>加载中...</div>
      ) : defects.length === 0 ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
          <Bug size={32} style={{ marginBottom: '8px', opacity: 0.4 }} />
          <div>暂无缺陷记录</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
                <th style={{ padding: '8px 12px' }}>ID</th>
                <th style={{ padding: '8px 12px' }}>标题</th>
                <th style={{ padding: '8px 12px' }}>严重程度</th>
                <th style={{ padding: '8px 12px' }}>状态</th>
                <th style={{ padding: '8px 12px' }}>指派人</th>
                <th style={{ padding: '8px 12px' }}>创建时间</th>
                <th style={{ padding: '8px 12px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {defects.map((d) => (
                <tr key={d.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px', color: '#888' }}>#{d.id}</td>
                  <td style={{ padding: '8px 12px', maxWidth: '300px' }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {d.title}
                    </div>
                    {d.description && (
                      <div style={{ color: '#888', fontSize: '12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {d.description}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#fff',
                      background: SEVERITY_COLORS[d.severity] || '#9ca3af',
                    }}>
                      {d.severity}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 500,
                      color: '#fff',
                      background: STATUS_COLORS[d.status] || '#6b7280',
                    }}>
                      {STATUS_LABELS[d.status] || d.status}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', color: d.assignee ? '#333' : '#ccc' }}>
                    {d.assignee || '-'}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#888', fontSize: '12px' }}>
                    {d.createdAt ? new Date(d.createdAt).toLocaleDateString() : '-'}
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    {d.status === 'open' && (
                      <button
                        onClick={() => handleTransition(d.id, 'in_progress')}
                        style={{ padding: '2px 8px', fontSize: '12px', cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff' }}
                      >
                        开始处理
                      </button>
                    )}
                    {d.status === 'in_progress' && (
                      <button
                        onClick={() => handleTransition(d.id, 'resolved')}
                        style={{ padding: '2px 8px', fontSize: '12px', cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff' }}
                      >
                        标记解决
                      </button>
                    )}
                    {d.status === 'resolved' && (
                      <button
                        onClick={() => handleTransition(d.id, 'closed')}
                        style={{ padding: '2px 8px', fontSize: '12px', cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff' }}
                      >
                        关闭
                      </button>
                    )}
                    {d.status === 'reopened' && (
                      <button
                        onClick={() => handleTransition(d.id, 'in_progress')}
                        style={{ padding: '2px 8px', fontSize: '12px', cursor: 'pointer', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff' }}
                      >
                        重新处理
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }} onClick={() => setModalOpen(false)}>
          <div style={{
            background: '#fff', borderRadius: '8px', padding: '24px', width: '480px', maxWidth: '90vw',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>新建缺陷</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>标题 *</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  placeholder="缺陷标题"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>描述</label>
                <textarea
                  value={form.description || ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }}
                  placeholder="缺陷详细描述"
                />
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>严重程度</label>
                  <select
                    value={form.severity || 'medium'}
                    onChange={(e) => setForm({ ...form, severity: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px' }}
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>指派人</label>
                  <input
                    type="text"
                    value={form.assignee || ''}
                    onChange={(e) => setForm({ ...form, assignee: e.target.value })}
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                    placeholder="指派人"
                  />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '4px', fontSize: '13px', fontWeight: 500 }}>报告人</label>
                <input
                  type="text"
                  value={form.reporter || ''}
                  onChange={(e) => setForm({ ...form, reporter: e.target.value })}
                  style={{ width: '100%', padding: '6px 10px', border: '1px solid #d9d9d9', borderRadius: '4px', fontSize: '13px', boxSizing: 'border-box' }}
                  placeholder="报告人"
                />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '20px' }}>
              <button
                onClick={() => setModalOpen(false)}
                style={{ padding: '6px 16px', border: '1px solid #d9d9d9', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '13px' }}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.title.trim()}
                style={{
                  padding: '6px 16px', border: 'none', borderRadius: '4px',
                  background: form.title.trim() ? '#1f6cff' : '#ccc', color: '#fff',
                  cursor: form.title.trim() ? 'pointer' : 'not-allowed', fontSize: '13px'
                }}
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
