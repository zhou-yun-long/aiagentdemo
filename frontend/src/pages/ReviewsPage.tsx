import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardCheck, CheckCircle, XCircle, AlertCircle, Clock, Send } from 'lucide-react';
import { getProjectCases } from '../shared/api/treeify';
import { submitReview, getReviewHistory, getReviewStats } from '../shared/api/reviews';
import type { TestCaseDto } from '../shared/types/treeify';
import type { ReviewDto, ReviewStatsDto } from '../shared/types/review';

const STATUS_TABS = [
  { key: 'all', label: '全部' },
  { key: 'pending', label: '待评审' },
  { key: 'approved', label: '已通过' },
  { key: 'rejected', label: '已驳回' },
  { key: 'needs_revision', label: '需修改' },
] as const;

const REVIEW_STATUS_OPTIONS = [
  { value: 'approved', label: '通过', icon: CheckCircle, color: '#52c41a' },
  { value: 'rejected', label: '驳回', icon: XCircle, color: '#ff4d4f' },
  { value: 'needs_revision', label: '需修改', icon: AlertCircle, color: '#faad14' },
] as const;

function reviewStatusBadge(status: string | null | undefined) {
  const s = status || 'pending';
  const config: Record<string, { label: string; bg: string; fg: string }> = {
    pending: { label: '待评审', bg: '#f0f0f0', fg: '#8c8c8c' },
    approved: { label: '已通过', bg: '#f6ffed', fg: '#52c41a' },
    rejected: { label: '已驳回', bg: '#fff2f0', fg: '#ff4d4f' },
    needs_revision: { label: '需修改', bg: '#fffbe6', fg: '#faad14' },
  };
  const c = config[s] || config.pending;
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 4,
        fontSize: 12,
        fontWeight: 500,
        background: c.bg,
        color: c.fg,
      }}
    >
      {c.label}
    </span>
  );
}

export default function ReviewsPage() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = Number(projectIdParam);

  const [cases, setCases] = useState<TestCaseDto[]>([]);
  const [stats, setStats] = useState<ReviewStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Modal state
  const [selectedCase, setSelectedCase] = useState<TestCaseDto | null>(null);
  const [reviewHistory, setReviewHistory] = useState<ReviewDto[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [reviewer, setReviewer] = useState('');
  const [reviewStatus, setReviewStatus] = useState('approved');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [casesData, statsData] = await Promise.all([
        getProjectCases(projectId),
        getReviewStats(projectId),
      ]);
      setCases(casesData);
      setStats(statsData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载评审数据失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredCases = activeTab === 'all'
    ? cases
    : cases.filter((c) => (c.reviewStatus || 'pending') === activeTab);

  const openModal = async (testCase: TestCaseDto) => {
    setSelectedCase(testCase);
    setModalLoading(true);
    try {
      const history = await getReviewHistory(testCase.id);
      setReviewHistory(history);
    } catch {
      setReviewHistory([]);
    } finally {
      setModalLoading(false);
    }
    setReviewer('');
    setReviewStatus('approved');
    setComment('');
  };

  const closeModal = () => {
    setSelectedCase(null);
    setReviewHistory([]);
  };

  const handleSubmit = async () => {
    if (!selectedCase || !reviewer.trim()) return;
    try {
      setSubmitting(true);
      await submitReview(selectedCase.id, {
        reviewer: reviewer.trim(),
        status: reviewStatus,
        comment: comment.trim() || undefined,
      });
      await loadData();
      const history = await getReviewHistory(selectedCase.id);
      setReviewHistory(history);
      setReviewer('');
      setComment('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '提交评审失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="reviews-page" style={{ padding: '20px 24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            to={`/projects/${projectId}/dashboard`}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', color: '#666' }}
          >
            <ArrowLeft size={16} />
            <span>返回</span>
          </Link>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClipboardCheck size={18} />
            用例评审
          </h1>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
          {[
            { label: '待评审', value: stats.pending, icon: Clock, color: '#8c8c8c' },
            { label: '已通过', value: stats.approved, icon: CheckCircle, color: '#52c41a' },
            { label: '已驳回', value: stats.rejected, icon: XCircle, color: '#ff4d4f' },
            { label: '需修改', value: stats.needsRevision, icon: AlertCircle, color: '#faad14' },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                flex: 1,
                padding: '12px 16px',
                background: '#fff',
                borderRadius: 8,
                border: '1px solid #f0f0f0',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <item.icon size={20} style={{ color: item.color }} />
              <div>
                <div style={{ fontSize: 20, fontWeight: 600 }}>{item.value}</div>
                <div style={{ fontSize: 12, color: '#999' }}>{item.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          style={{ padding: '8px 16px', marginBottom: 16, background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: 6, color: '#ff4d4f', cursor: 'pointer' }}
          onClick={() => setError(null)}
        >
          {error}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: activeTab === tab.key ? '#1f6cff' : '#d9d9d9',
              background: activeTab === tab.key ? '#e6f0ff' : '#fff',
              color: activeTab === tab.key ? '#1f6cff' : '#666',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: activeTab === tab.key ? 600 : 400,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#fafafa' }}>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, fontSize: 13, color: '#666' }}>ID</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, fontSize: 13, color: '#666' }}>标题</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, fontSize: 13, color: '#666' }}>评审状态</th>
              <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 500, fontSize: 13, color: '#666' }}>更新时间</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#999' }}>加载中...</td>
              </tr>
            ) : filteredCases.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ padding: 40, textAlign: 'center', color: '#999' }}>暂无数据</td>
              </tr>
            ) : (
              filteredCases.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => openModal(c)}
                  style={{ cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#fafafa')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = '#fff')}
                >
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>#{c.id}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13 }}>{c.title}</td>
                  <td style={{ padding: '12px 16px' }}>{reviewStatusBadge(c.reviewStatus)}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#999' }}>
                    {c.updatedAt ? new Date(c.updatedAt).toLocaleString('zh-CN') : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selectedCase && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              width: 560,
              maxHeight: '80vh',
              overflow: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            }}
          >
            {/* Modal header */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>
                  #{selectedCase.id} {selectedCase.title}
                </div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 4 }}>
                  优先级: {selectedCase.priority} | 执行状态: {selectedCase.executionStatus}
                </div>
              </div>
              <button
                onClick={closeModal}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#999', padding: 4 }}
              >
                &times;
              </button>
            </div>

            {/* Review history */}
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 8, color: '#666' }}>评审历史</div>
              {modalLoading ? (
                <div style={{ color: '#999', fontSize: 13 }}>加载中...</div>
              ) : reviewHistory.length === 0 ? (
                <div style={{ color: '#999', fontSize: 13 }}>暂无评审记录</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflow: 'auto' }}>
                  {reviewHistory.map((r) => (
                    <div
                      key={r.id}
                      style={{
                        padding: '8px 12px',
                        background: '#fafafa',
                        borderRadius: 6,
                        fontSize: 13,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>
                          <strong>{r.reviewer}</strong>
                          <span style={{ marginLeft: 8 }}>{reviewStatusBadge(r.status)}</span>
                        </span>
                        <span style={{ color: '#999', fontSize: 12 }}>
                          {r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN') : ''}
                        </span>
                      </div>
                      {r.comment && <div style={{ marginTop: 4, color: '#666' }}>{r.comment}</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Review form */}
            <div style={{ padding: '16px 20px' }}>
              <div style={{ fontWeight: 500, fontSize: 13, marginBottom: 12, color: '#666' }}>提交评审</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>评审人 *</label>
                  <input
                    type="text"
                    value={reviewer}
                    onChange={(e) => setReviewer(e.target.value)}
                    placeholder="请输入评审人姓名"
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 6,
                      fontSize: 13,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>评审结果 *</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {REVIEW_STATUS_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setReviewStatus(opt.value)}
                        style={{
                          flex: 1,
                          padding: '8px 12px',
                          borderRadius: 6,
                          border: '2px solid',
                          borderColor: reviewStatus === opt.value ? opt.color : '#d9d9d9',
                          background: reviewStatus === opt.value ? `${opt.color}10` : '#fff',
                          color: reviewStatus === opt.value ? opt.color : '#666',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: reviewStatus === opt.value ? 600 : 400,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 4,
                        }}
                      >
                        <opt.icon size={14} />
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, color: '#666', marginBottom: 4 }}>评审意见</label>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="请输入评审意见（可选）"
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: 6,
                      fontSize: 13,
                      resize: 'vertical',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <button
                  onClick={handleSubmit}
                  disabled={!reviewer.trim() || submitting}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 6,
                    border: 'none',
                    background: reviewer.trim() ? '#1f6cff' : '#d9d9d9',
                    color: '#fff',
                    cursor: reviewer.trim() ? 'pointer' : 'not-allowed',
                    fontSize: 14,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <Send size={14} />
                  {submitting ? '提交中...' : '提交评审'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
