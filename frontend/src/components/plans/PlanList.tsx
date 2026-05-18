import { Link } from 'react-router-dom';
import { ClipboardList, Loader2, Trash2 } from 'lucide-react';
import type { TestPlanDto } from '../../shared/types/plan';

interface PlanListProps {
  plans: TestPlanDto[];
  loading: boolean;
  projectId: number;
  onDelete: (planId: number) => void;
}

const statusConfig: Record<string, { label: string; className: string }> = {
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

export function PlanList({ plans, loading, projectId, onDelete }: PlanListProps) {
  if (loading) {
    return (
      <div className="plans-loading">
        <Loader2 size={24} className="spinner-icon" />
        <span>加载中...</span>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="plans-empty">
        <ClipboardList size={32} />
        <span>暂无测试计划，点击「新建计划」创建</span>
      </div>
    );
  }

  return (
    <div className="plans-table-wrap">
      <table className="plans-table">
        <thead>
          <tr>
            <th>计划名称</th>
            <th>状态</th>
            <th>用例数</th>
            <th>通过数</th>
            <th>创建时间</th>
            <th>更新时间</th>
            <th style={{ width: 120 }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan) => {
            const config = statusConfig[plan.status] || statusConfig.draft;
            return (
              <tr key={plan.id}>
                <td className="plans-name-cell">
                  <Link to={`/projects/${projectId}/plans/${plan.id}`}>
                    {plan.name}
                  </Link>
                  {plan.description && (
                    <div className="plans-desc-hint">{plan.description}</div>
                  )}
                </td>
                <td>
                  <span className={config.className}>{config.label}</span>
                </td>
                <td>{plan.caseCount}</td>
                <td>{plan.passedCount}</td>
                <td>{formatDate(plan.createdAt)}</td>
                <td>{formatDate(plan.updatedAt)}</td>
                <td>
                  <div className="plans-row-actions">
                    <Link
                      to={`/projects/${projectId}/plans/${plan.id}`}
                      className="plans-action-btn"
                    >
                      查看
                    </Link>
                    <button
                      className="plans-action-btn danger"
                      onClick={() => onDelete(plan.id)}
                      title="删除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
