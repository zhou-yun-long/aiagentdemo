import { useState } from 'react';
import type { PlanCaseDto, PlanExecutionResult } from '../../shared/types/plan';

interface PlanExecutionTableProps {
  cases: PlanCaseDto[];
  onUpdateResult: (caseId: number, executionResult: string, note: string) => Promise<void>;
  onRecompute: () => Promise<void>;
}

const resultOptions: { value: string; label: string }[] = [
  { value: '', label: '-- 未执行 --' },
  { value: 'pass', label: '通过' },
  { value: 'fail', label: '失败' },
  { value: 'blocked', label: '阻塞' },
  { value: 'skipped', label: '跳过' }
];

const resultBadgeClass: Record<string, string> = {
  pass: 'plans-result-badge pass',
  fail: 'plans-result-badge fail',
  blocked: 'plans-result-badge blocked',
  skipped: 'plans-result-badge skipped'
};

export function PlanExecutionTable({ cases, onUpdateResult, onRecompute }: PlanExecutionTableProps) {
  const [editingResults, setEditingResults] = useState<Record<number, string>>({});
  const [editingNotes, setEditingNotes] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState<Set<number>>(new Set());
  const [recomputing, setRecomputing] = useState(false);

  const handleResultChange = (caseId: number, value: string) => {
    setEditingResults((prev) => ({ ...prev, [caseId]: value }));
  };

  const handleNoteChange = (caseId: number, value: string) => {
    setEditingNotes((prev) => ({ ...prev, [caseId]: value }));
  };

  const handleSubmitCase = async (planCase: PlanCaseDto) => {
    const result = editingResults[planCase.caseId] ?? planCase.executionResult ?? '';
    const note = editingNotes[planCase.caseId] ?? planCase.note ?? '';

    setSubmitting((prev) => new Set(prev).add(planCase.caseId));
    try {
      await onUpdateResult(planCase.caseId, result, note);
    } finally {
      setSubmitting((prev) => {
        const next = new Set(prev);
        next.delete(planCase.caseId);
        return next;
      });
    }
  };

  const handleRecompute = async () => {
    setRecomputing(true);
    try {
      await onRecompute();
    } finally {
      setRecomputing(false);
    }
  };

  if (cases.length === 0) {
    return (
      <div className="plans-exec-empty">
        该计划暂未关联任何用例
      </div>
    );
  }

  return (
    <div className="plans-exec">
      <div className="plans-exec-header">
        <span>共 {cases.length} 条用例</span>
        <button
          className="plans-recompute-btn"
          onClick={handleRecompute}
          disabled={recomputing}
        >
          {recomputing ? '重算中...' : '重算状态'}
        </button>
      </div>
      <div className="plans-exec-table-wrap">
        <table className="plans-exec-table">
          <thead>
            <tr>
              <th style={{ width: 36 }}>#</th>
              <th>用例标题</th>
              <th style={{ width: 110 }}>执行结果</th>
              <th>备注</th>
              <th style={{ width: 90, textAlign: 'center' }}>当前状态</th>
              <th style={{ width: 80 }}></th>
            </tr>
          </thead>
          <tbody>
            {cases.map((planCase, index) => {
              const currentResult = editingResults[planCase.caseId] ?? planCase.executionResult ?? '';
              const currentNote = editingNotes[planCase.caseId] ?? planCase.note ?? '';
              const isSubmitting = submitting.has(planCase.caseId);
              const hasChanges =
                (editingResults[planCase.caseId] !== undefined && editingResults[planCase.caseId] !== (planCase.executionResult ?? '')) ||
                (editingNotes[planCase.caseId] !== undefined && editingNotes[planCase.caseId] !== (planCase.note ?? ''));

              return (
                <tr key={planCase.id}>
                  <td className="plans-exec-index">{index + 1}</td>
                  <td className="plans-exec-title">{planCase.caseTitle || `用例 #${planCase.caseId}`}</td>
                  <td>
                    <select
                      className="plans-exec-select"
                      value={currentResult}
                      onChange={(e) => handleResultChange(planCase.caseId, e.target.value)}
                    >
                      {resultOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <input
                      type="text"
                      className="plans-exec-note"
                      value={currentNote}
                      onChange={(e) => handleNoteChange(planCase.caseId, e.target.value)}
                      placeholder="输入备注..."
                    />
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {planCase.executionResult ? (
                      <span className={resultBadgeClass[planCase.executionResult] || ''}>
                        {resultOptions.find((o) => o.value === planCase.executionResult)?.label || planCase.executionResult}
                      </span>
                    ) : (
                      <span className="plans-result-badge pending">未执行</span>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <button
                      className="plans-exec-submit"
                      onClick={() => handleSubmitCase(planCase)}
                      disabled={isSubmitting || !hasChanges}
                    >
                      {isSubmitting ? '...' : '提交'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
