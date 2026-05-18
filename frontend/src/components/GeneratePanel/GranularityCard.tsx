import { useGenerationStore } from '../../features/generation/generationStore';
import type { Granularity } from '../../types/generation';

const OPTIONS: Array<{
  value: Granularity;
  label: string;
  description: string;
}> = [
  { value: 'S', label: 'S', description: '2-3 条/对象' },
  { value: 'M', label: 'M', description: '5-8 条/对象' },
  { value: 'L', label: 'L', description: '10+ 条/对象' },
];

export function GranularityCard() {
  const granularity = useGenerationStore((s) => s.config.granularity);
  const setConfig = useGenerationStore((s) => s.setConfig);
  const status = useGenerationStore((s) => s.status);

  const isRunning = status === 'running' || status === 'waiting_confirm';

  return (
    <div className="granularity-card">
      <span className="granularity-card-label">用例粒度</span>
      <div className="granularity-card-options">
        {OPTIONS.map((opt) => (
          <label
            key={opt.value}
            className={`granularity-option${granularity === opt.value ? ' selected' : ''}`}
          >
            <input
              type="radio"
              name="granularity"
              value={opt.value}
              checked={granularity === opt.value}
              onChange={() => setConfig({ granularity: opt.value })}
              disabled={isRunning}
            />
            <span className="granularity-option-label">{opt.label}</span>
            <span className="granularity-option-desc">{opt.description}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
