import { useState } from 'react';
import { CheckCircle2, Circle, Loader2, Play, RotateCcw, Square } from 'lucide-react';
import type { GenerateStage } from '../../types/generation';
import { useGenerationStore } from '../../features/generation/generationStore';
import { useGenerateStream } from '../../features/generation/useGenerateStream';
import { useWorkspaceStore } from '../../features/workspace/workspaceStore';
import { batchConfirmCases, getDefaultProjectId } from '../../shared/api/treeify';
import type { TraceGraphDto } from '../../shared/types/treeify';
import {
  draftToGeneratedCaseDto,
  generatedCaseDraftsToRows
} from '../../shared/transforms/treeifyTransforms';
import { CasePreviewTable } from '../CasePreviewTable';

type ApiTabPanelProps = {
  onImportRows: (rows: string[][]) => void;
};

const stageOrder: GenerateStage[] = ['e1', 'e2', 'e3', 'critic'];

const stageIcon = {
  idle: <Circle size={14} />,
  running: <Loader2 size={14} />,
  done: <CheckCircle2 size={14} />,
  waiting_confirm: <Circle size={14} />
};

export function ApiTabPanel({ onImportRows }: ApiTabPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [apiSpec, setApiSpec] = useState('');
  const status = useGenerationStore((state) => state.status);
  const activeStage = useGenerationStore((state) => state.activeStage);
  const stages = useGenerationStore((state) => state.stages);
  const cases = useGenerationStore((state) => state.cases);
  const error = useGenerationStore((state) => state.error);
  const artifacts = useGenerationStore((state) => state.artifacts);
  const traceGraph = useGenerationStore((state) => state.traceGraph);
  const setConfig = useGenerationStore((state) => state.setConfig);
  const resetTask = useGenerationStore((state) => state.resetTask);
  const updateCase = useGenerationStore((state) => state.updateCase);
  const removeCase = useGenerationStore((state) => state.removeCase);
  const setTraceGraph = useGenerationStore((state) => state.setTraceGraph);
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId);
  const { startGeneration, confirmCurrentStage, cancelGeneration, retryGeneration } = useGenerateStream();

  const canStart = apiSpec.trim().length > 0 && status !== 'running' && status !== 'waiting_confirm';
  const canConfirm = status === 'waiting_confirm';

  const streamStage = activeStage ? stages[activeStage] : undefined;

  const handleStart = async () => {
    setConfig({ taskKind: 'api_cases' });
    await startGeneration(apiSpec.trim(), 'auto');
  };

  const handleConfirmStage = async () => {
    const supplement = activeStage ? (artifacts[activeStage]?.userSupplement ?? '').trim() : '';
    await confirmCurrentStage(supplement || undefined);
  };

  const handleReset = () => {
    resetTask();
    setApiSpec('');
  };

  const handleImport = async () => {
    if (!cases.length) return;

    setConfirming(true);
    let savedTraceGraph: TraceGraphDto | undefined;
    try {
      const projectId = currentProjectId ?? getDefaultProjectId();
      const savedCases = await batchConfirmCases(projectId, cases.map(draftToGeneratedCaseDto));
      if (traceGraph) {
        savedTraceGraph = undefined;
      }
      onImportRows(generatedCaseDraftsToRows(cases));
    } catch {
      onImportRows(generatedCaseDraftsToRows(cases));
    } finally {
      setConfirming(false);
      resetTask();
      setApiSpec('');
      if (savedTraceGraph) {
        setTraceGraph(savedTraceGraph);
      }
    }
  };

  return (
    <>
      <div className="generate-card">
        <div className="generate-card-head">
          <strong>接口用例生成</strong>
          <button className="ghost small" onClick={handleReset}>
            重置
          </button>
        </div>
        <p className="api-tab-hint">
          输入接口规范（URL、Swagger 地址或文本描述），自动生成接口测试用例。
        </p>
        <textarea
          className="requirement-input"
          placeholder="例如：https://petstore.swagger.io/v2/swagger.json&#10;或粘贴接口文档文本..."
          value={apiSpec}
          onChange={(event) => setApiSpec(event.target.value)}
        />
        <div className="generate-actions">
          <button className="primary" disabled={!canStart} onClick={handleStart}>
            <Play size={14} />
            生成接口用例
          </button>
          <button disabled={status !== 'running' && status !== 'waiting_confirm'} onClick={cancelGeneration}>
            <Square size={14} />
            停止
          </button>
          <button disabled={!canConfirm} onClick={handleConfirmStage}>
            继续
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
        <pre>{streamStage?.content || (status === 'done' ? '生成完成。' : '等待生成任务启动...')}</pre>
        {streamStage?.result && <p>{streamStage.result}</p>}
        {error && (
          <div className="stream-error-area">
            <p className="stream-error">{error}</p>
            <button className="ghost small retry-btn" onClick={retryGeneration}>
              <RotateCcw size={14} />
              重试
            </button>
          </div>
        )}
      </div>

      <CasePreviewTable cases={cases} confirming={confirming} onUpdate={updateCase} onRemove={removeCase} onConfirm={handleImport} />
    </>
  );
}
