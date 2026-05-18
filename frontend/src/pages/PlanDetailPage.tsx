import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { PlanExecutionTable } from '../components/plans/PlanExecutionTable';
import { getPlan, updateCaseResult, recomputeStatus } from '../shared/api/plans';
import type { PlanCaseDto, PlanDetailDto, PlanStatus } from '../shared/types/plan';

const statusConfig: Record<PlanStatus, { label: string; className: string }> = {
  draft: { label: '草稿', className: 'plans-status-badge draft' },
  active: { label: '进行中', className: 'plans-status-badge active' },
  done: { label: '已完成', className: 'plans-status-badge done' },
  archived: { label: '已归档', className: 'plans-status-badge archived' }
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

export default function PlanDetailPage() {
  const { projectId: projectIdParam, planId: planIdParam } = useParams<{ projectId: string; planId: string }>();
  const projectId = Number(projectIdParam);
  const planId = Number(planIdParam);

  const [detail, setDetail] = useState<PlanDetailDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getPlan(planId);
      setDetail(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载计划详情失败');
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleUpdateResult = async (caseId: number, executionResult: string, note: string) => {
    await updateCaseResult(planId, caseId, { executionResult, note });
    await loadData();
  };

  const handleRecompute = async () => {
    try {
      await recomputeStatus(planId);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : '重算状态失败');
    }
  };

  if (loading) {
    return (
      <div className="plans-page">
        <div className="plans-loading">
          <Loader2 size={24} className="spinner-icon" />
          <span>加载中...</span>
        </div>
      </div>
    );
  }

  if (error && !detail) {
    return (
      <div className="plans-page">
        <div className="plans-error">{error}</div>
      </div>
    );
  }

  if (!detail) return null;

  const { plan, cases } = detail;
  const config = statusConfig[plan.status] || statusConfig.draft;

  return (
    <div className="plans-page">
      <div className="plans-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link to={`/projects/${projectId}/plans`} className="back-button" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}>
            <ArrowLeft size={16} />
            <span>返回</span>
          </Link>
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>{plan.name}</h1>
          <span className={config.className}>{config.label}</span>
        </div>
      </div>

      {error && (
        <div className="plans-error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      {plan.description && (
        <p style={{ margin: '0 0 12px', fontSize: '13px', color: 'var(--muted)', lineHeight: 1.5 }}>
          {plan.description}
        </p>
      )}

      <div className="plans-meta">
        <span>用例: <strong>{plan.caseCount}</strong></span>
        <span>已通过: <strong>{plan.passedCount}</strong></span>
        <span>创建: {formatDate(plan.createdAt)}</span>
        <span>更新: {formatDate(plan.updatedAt)}</span>
      </div>

      <PlanExecutionTable
        cases={cases}
        onUpdateResult={handleUpdateResult}
        onRecompute={handleRecompute}
      />
    </div>
  );
}
