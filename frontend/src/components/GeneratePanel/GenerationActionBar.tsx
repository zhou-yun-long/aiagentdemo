import { Loader2, Play, TestTube2 } from 'lucide-react';
import type { TaskKind } from '../../types/generation';
import { useGenerationStore } from '../../features/generation/generationStore';
import type { GenerationAttachmentRequest } from '../../shared/types/treeify';

type GenerationActionBarProps = {
  onGenerate: (taskKind: TaskKind) => void;
  attachments?: GenerationAttachmentRequest[];
};

export function GenerationActionBar({ onGenerate, attachments }: GenerationActionBarProps) {
  const input = useGenerationStore((state) => state.input);
  const status = useGenerationStore((state) => state.status);

  const hasInput = input.trim().length > 0 || (attachments && attachments.length > 0);
  const isRunning = status === 'running' || status === 'waiting_confirm';

  return (
    <div className="generation-action-bar">
      <button
        className="primary"
        disabled={!hasInput || isRunning}
        onClick={() => onGenerate('cases')}
      >
        {isRunning ? <Loader2 size={14} className="spinner-icon" /> : <Play size={14} />}
        生成测试用例
      </button>
      <button
        disabled={!hasInput || isRunning}
        onClick={() => onGenerate('points')}
      >
        {isRunning ? <Loader2 size={14} className="spinner-icon" /> : <TestTube2 size={14} />}
        生成测试点
      </button>
    </div>
  );
}
