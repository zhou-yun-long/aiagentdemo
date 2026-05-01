import { useEffect, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import type { GeneratedCaseDraft } from '../types/generation';

type CasePreviewTableProps = {
  cases: GeneratedCaseDraft[];
  confirming: boolean;
  onUpdate: (id: string, patch: Partial<GeneratedCaseDraft>) => void;
  onRemove: (id: string) => void;
  onConfirm: () => void | Promise<void>;
};

function AutoResizeTextarea({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label={label}
    />
  );
}

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
            <AutoResizeTextarea
              value={item.precondition}
              onChange={(v) => onUpdate(item.id, { precondition: v })}
              label="前置条件"
            />
            <AutoResizeTextarea
              value={item.steps.join('\n')}
              onChange={(v) =>
                onUpdate(item.id, {
                  steps: v.split('\n').map((step) => step.trim()).filter(Boolean)
                })
              }
              label="执行步骤"
            />
            <AutoResizeTextarea
              value={item.expected}
              onChange={(v) => onUpdate(item.id, { expected: v })}
              label="预期结果"
            />
          </article>
        ))}
      </div>
    </div>
  );
}
