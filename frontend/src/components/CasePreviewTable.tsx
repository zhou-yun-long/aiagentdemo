import { Trash2 } from 'lucide-react';
import type { GeneratedCaseDraft } from '../types/generation';

type CasePreviewTableProps = {
  cases: GeneratedCaseDraft[];
  confirming: boolean;
  onUpdate: (id: string, patch: Partial<GeneratedCaseDraft>) => void;
  onRemove: (id: string) => void;
  onConfirm: () => void | Promise<void>;
};

export function CasePreviewTable({ cases, confirming, onUpdate, onRemove, onConfirm }: CasePreviewTableProps) {
  if (!cases.length) {
    return <div className="case-preview-empty">生成完成后会在这里展示候选用例</div>;
  }

  return (
    <div className="case-preview">
      <div className="case-preview-head">
        <strong>候选用例</strong>
        <button className="primary small" disabled={confirming} onClick={onConfirm}>
          {confirming ? '确认中' : '确认回填'}
        </button>
      </div>
      <div className="case-preview-list">
        {cases.map((item) => (
          <article className="case-preview-item" key={item.id}>
            <div className="case-preview-title">
              <input value={item.title} onChange={(event) => onUpdate(item.id, { title: event.target.value })} aria-label="用例标题" />
              <select
                value={item.priority}
                onChange={(event) => onUpdate(item.id, { priority: event.target.value as GeneratedCaseDraft['priority'] })}
                aria-label="优先级"
              >
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
              <button className="icon danger" onClick={() => onRemove(item.id)} aria-label="删除候选用例">
                <Trash2 size={14} />
              </button>
            </div>
            <textarea
              value={item.precondition}
              onChange={(event) => onUpdate(item.id, { precondition: event.target.value })}
              aria-label="前置条件"
            />
            <textarea
              value={item.steps.join('\n')}
              onChange={(event) =>
                onUpdate(item.id, {
                  steps: event.target.value
                    .split('\n')
                    .map((step) => step.trim())
                    .filter(Boolean)
                })
              }
              aria-label="执行步骤"
            />
            <textarea value={item.expected} onChange={(event) => onUpdate(item.id, { expected: event.target.value })} aria-label="预期结果" />
          </article>
        ))}
      </div>
    </div>
  );
}
