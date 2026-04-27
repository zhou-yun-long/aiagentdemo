import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, PauseCircle, Play, Square } from 'lucide-react';
import type { GeneratedCaseDraft, GenerateStage, GenerationMode } from '../types/generation';
import { useGenerationStore } from '../features/generation/generationStore';
import { useGenerateStream } from '../features/generation/useGenerateStream';
import { useWorkspaceStore } from '../features/workspace/workspaceStore';
import { batchConfirmCases, getDefaultProjectId, getTreeifyApiMode } from '../shared/api/treeify';
import {
  draftToGeneratedCaseDto,
  generatedCaseDraftsToRows
} from '../shared/transforms/treeifyTransforms';
import { CasePreviewTable } from './CasePreviewTable';

type GeneratePanelProps = {
  onImportRows: (rows: string[][]) => void;
};

const stageOrder: GenerateStage[] = ['e1', 'e2', 'e3', 'critic'];

const stageIcon = {
  idle: <Circle size={14} />,
  running: <Loader2 size={14} />,
  done: <CheckCircle2 size={14} />,
  waiting_confirm: <PauseCircle size={14} />
};

export function GeneratePanel({ onImportRows }: GeneratePanelProps) {
  const [confirming, setConfirming] = useState(false);
  const mode = useGenerationStore((state) => state.mode);
  const input = useGenerationStore((state) => state.input);
  const status = useGenerationStore((state) => state.status);
  const source = useGenerationStore((state) => state.source);
  const activeStage = useGenerationStore((state) => state.activeStage);
  const stages = useGenerationStore((state) => state.stages);
  const cases = useGenerationStore((state) => state.cases);
  const criticScore = useGenerationStore((state) => state.criticScore);
  const error = useGenerationStore((state) => state.error);
  const setMode = useGenerationStore((state) => state.setMode);
  const setInput = useGenerationStore((state) => state.setInput);
  const resetTask = useGenerationStore((state) => state.resetTask);
  const updateCase = useGenerationStore((state) => state.updateCase);
  const removeCase = useGenerationStore((state) => state.removeCase);
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId);
  const { startGeneration, confirmCurrentStage, cancelGeneration } = useGenerateStream();

  const canStart = input.trim().length > 0 && status !== 'running' && status !== 'waiting_confirm';
  const canConfirm = status === 'waiting_confirm';
  const streamStage = activeStage ? stages[activeStage] : undefined;

  const apiMode = getTreeifyApiMode();

  const handleStart = async () => {
    await startGeneration(input.trim(), mode);
  };

  const handleConfirmStage = async () => {
    await confirmCurrentStage();
  };

  const handleModeChange = (nextMode: GenerationMode) => {
    if (status === 'running' || status === 'waiting_confirm') {
      return;
    }
    setMode(nextMode);
  };

  const handleImport = async () => {
    if (!cases.length) {
      return;
    }

    setConfirming(true);
    try {
      if (source === 'real') {
        await batchConfirmCases(currentProjectId ?? getDefaultProjectId(), cases.map(draftToGeneratedCaseDto));
      }
      onImportRows(generatedCaseDraftsToRows(cases));
    } catch {
      onImportRows(generatedCaseDraftsToRows(cases));
    } finally {
      setConfirming(false);
    }
  };

  return (
    <section className="generate-panel">
      <div className="generate-card">
        <div className="generate-card-head">
          <div>
            <strong>三阶段生成</strong>
            <span className={`api-mode ${source}`}>{apiMode === 'auto' ? `auto/${source}` : apiMode}</span>
            {criticScore !== undefined && <span className="critic-score">Critic {criticScore}</span>}
          </div>
          <button className="ghost small" onClick={resetTask}>
            重置
          </button>
        </div>
        <div className="mode-switch" aria-label="生成模式">
          <button className={mode === 'auto' ? 'active' : ''} onClick={() => handleModeChange('auto')}>
            自动
          </button>
          <button className={mode === 'step' ? 'active' : ''} onClick={() => handleModeChange('step')}>
            逐步
          </button>
        </div>
        <textarea className="requirement-input" value={input} onChange={(event) => setInput(event.target.value)} />
        <div className="generate-actions">
          <button className="primary" disabled={!canStart} onClick={handleStart}>
            <Play size={14} />
            启动生成
          </button>
          <button disabled={status !== 'running' && status !== 'waiting_confirm'} onClick={cancelGeneration}>
            <Square size={14} />
            停止
          </button>
          <button disabled={!canConfirm} onClick={handleConfirmStage}>
            继续下一阶段
          </button>
        </div>
      </div>

      <div className="stage-progress">
        {stageOrder.map((stage) => (
          <div className={`stage-item ${stages[stage].status}`} key={stage}>
            {stageIcon[stages[stage].status]}
            <span>{stages[stage].title}</span>
          </div>
        ))}
      </div>

      <div className="stream-display">
        <div className="stream-head">
          <strong>{streamStage?.title || '流式输出'}</strong>
          <span>{status}</span>
        </div>
        <pre>{streamStage?.content || '等待生成任务启动...'}</pre>
        {streamStage?.result && <p>{streamStage.result}</p>}
        {error && <p className="stream-error">{error}</p>}
      </div>

      <CasePreviewTable cases={cases} confirming={confirming} onUpdate={updateCase} onRemove={removeCase} onConfirm={handleImport} />
    </section>
  );
}
