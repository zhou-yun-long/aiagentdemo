import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import { PlanList } from '../components/plans/PlanList';
import { PlanFormModal } from '../components/plans/PlanFormModal';
import { listPlans, createPlan, deletePlan } from '../shared/api/plans';
import type { CreateTestPlanRequest, TestPlanDto } from '../shared/types/plan';

export default function PlansPage() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = Number(projectIdParam);

  const [plans, setPlans] = useState<TestPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listPlans(projectId);
      setPlans(data);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载计划列表失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreate = async (data: CreateTestPlanRequest) => {
    await createPlan(data);
    await loadData();
  };

  const handleDelete = async (planId: number) => {
    if (!window.confirm('确定删除该测试计划？')) return;
    try {
      await deletePlan(planId);
      await loadData();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
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
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>测试计划</h1>
        </div>
        <button className="primary" onClick={() => setModalOpen(true)}>
          <Plus size={14} />
          新建计划
        </button>
      </div>

      {error && (
        <div className="plans-error" onClick={() => setError(null)}>
          {error}
        </div>
      )}

      <PlanList
        plans={plans}
        loading={loading}
        projectId={projectId}
        onDelete={handleDelete}
      />

      <PlanFormModal
        open={modalOpen}
        projectId={projectId}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
      />
    </div>
  );
}
