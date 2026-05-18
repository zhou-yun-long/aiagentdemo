import { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { getProjectCases } from '../../shared/api/treeify';
import type { TestCaseDto } from '../../shared/types/treeify';
import type { CreateTestPlanRequest, TestPlanDto } from '../../shared/types/plan';

interface PlanFormModalProps {
  open: boolean;
  projectId: number;
  editingPlan?: TestPlanDto | null;
  onClose: () => void;
  onSubmit: (data: CreateTestPlanRequest) => Promise<void>;
}

export function PlanFormModal({ open, projectId, editingPlan, onClose, onSubmit }: PlanFormModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<number>>(new Set());
  const [cases, setCases] = useState<TestCaseDto[]>([]);
  const [loadingCases, setLoadingCases] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editingPlan) {
      setName(editingPlan.name);
      setDescription(editingPlan.description || '');
    } else {
      setName('');
      setDescription('');
    }
    setSelectedCaseIds(new Set());
  }, [open, editingPlan]);

  const loadCases = useCallback(async () => {
    try {
      setLoadingCases(true);
      const data = await getProjectCases(projectId);
      setCases(data);
    } catch {
      setCases([]);
    } finally {
      setLoadingCases(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (open) {
      loadCases();
    }
  }, [open, loadCases]);

  const toggleCase = (caseId: number) => {
    setSelectedCaseIds((prev) => {
      const next = new Set(prev);
      if (next.has(caseId)) next.delete(caseId);
      else next.add(caseId);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedCaseIds.size === cases.length) {
      setSelectedCaseIds(new Set());
    } else {
      setSelectedCaseIds(new Set(cases.map((c) => c.id)));
    }
  };

  const handleSubmit = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    setSaving(true);
    try {
      const data: CreateTestPlanRequest = {
        projectId,
        name: trimmedName,
        description: description.trim() || undefined,
        caseIds: editingPlan ? undefined : Array.from(selectedCaseIds)
      };
      await onSubmit(data);
      onClose();
    } catch {
      // error handled by parent
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="plans-modal-overlay" onClick={onClose}>
      <div className="plans-modal" onClick={(e) => e.stopPropagation()}>
        <div className="plans-modal-header">
          <h2>{editingPlan ? '编辑计划' : '新建测试计划'}</h2>
          <button className="plans-modal-close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="plans-modal-field">
          <label htmlFor="plan-name">计划名称 *</label>
          <input
            id="plan-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入计划名称"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && name.trim()) handleSubmit();
              if (e.key === 'Escape') onClose();
            }}
          />
        </div>

        <div className="plans-modal-field">
          <label htmlFor="plan-desc">描述</label>
          <textarea
            id="plan-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="输入计划描述（可选）"
            rows={3}
            onKeyDown={(e) => { if (e.key === 'Escape') onClose(); }}
          />
        </div>

        {!editingPlan && (
          <div className="plans-modal-field">
            <label>
              关联用例
              {cases.length > 0 && (
                <button
                  type="button"
                  className="plans-select-all-btn"
                  onClick={toggleAll}
                >
                  {selectedCaseIds.size === cases.length ? '取消全选' : '全选'}
                </button>
              )}
            </label>
            <div className="plans-case-selector">
              {loadingCases ? (
                <div className="plans-case-loading">加载用例中...</div>
              ) : cases.length === 0 ? (
                <div className="plans-case-loading">暂无可用用例</div>
              ) : (
                <div className="plans-case-list">
                  {cases.map((c) => (
                    <label key={c.id} className="plans-case-item">
                      <input
                        type="checkbox"
                        checked={selectedCaseIds.has(c.id)}
                        onChange={() => toggleCase(c.id)}
                      />
                      <span className="plans-case-title">{c.title}</span>
                      <span className={`priority ${c.priority.toLowerCase()}`}>
                        {c.priority}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {selectedCaseIds.size > 0 && (
              <div className="plans-case-count">已选 {selectedCaseIds.size} 条用例</div>
            )}
          </div>
        )}

        <div className="plans-modal-actions">
          <button onClick={onClose}>取消</button>
          <button
            className="primary"
            onClick={handleSubmit}
            disabled={saving || !name.trim()}
          >
            {saving ? '保存中...' : editingPlan ? '保存' : '创建'}
          </button>
        </div>
      </div>
    </div>
  );
}
