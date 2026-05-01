import { useState } from 'react';
import { CheckCircle2, Circle, FileText, Image, Loader2, PauseCircle, Play, RotateCcw, Square, Upload, X } from 'lucide-react';
import type { GeneratedCaseDraft, GenerateStage, GenerationMode } from '../types/generation';
import { useGenerationStore } from '../features/generation/generationStore';
import { useGenerateStream } from '../features/generation/useGenerateStream';
import { useWorkspaceStore } from '../features/workspace/workspaceStore';
import { batchConfirmCases, getDefaultProjectId, getTreeifyApiMode } from '../shared/api/treeify';
import type { GenerationAttachmentRequest } from '../shared/types/treeify';
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

const TEXT_EXTENSIONS = new Set(['txt', 'md', 'markdown', 'json', 'csv', 'tsv', 'xml', 'html', 'htm', 'yml', 'yaml', 'log']);
const MAX_ATTACHMENT_CHARS = 60000;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

function extensionOf(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function isTextLike(file: File) {
  return file.type.startsWith('text/') || TEXT_EXTENSIONS.has(extensionOf(file.name));
}

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('读取图片失败'));
    reader.readAsDataURL(file);
  });
}

async function fileToAttachment(file: File): Promise<GenerationAttachmentRequest> {
  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${file.name} 超过 2MB，请先压缩或摘取关键内容`);
  }

  const kind = file.type.startsWith('image/') ? 'image' : 'document';
  let content = '';

  if (kind === 'image') {
    content = await readAsDataUrl(file);
  } else if (isTextLike(file)) {
    content = (await file.text()).slice(0, MAX_ATTACHMENT_CHARS);
  }

  return {
    kind,
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    content
  };
}

export function GeneratePanel({ onImportRows }: GeneratePanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [attachments, setAttachments] = useState<GenerationAttachmentRequest[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
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
  const { startGeneration, confirmCurrentStage, cancelGeneration, retryGeneration } = useGenerateStream();

  const canStart = (input.trim().length > 0 || attachments.length > 0) && status !== 'running' && status !== 'waiting_confirm';
  const canConfirm = status === 'waiting_confirm';
  const streamStage = activeStage ? stages[activeStage] : undefined;

  const apiMode = getTreeifyApiMode();

  const handleStart = async () => {
    await startGeneration(input.trim(), mode, attachments);
  };

  const handleAttachmentChange = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    setAttachmentError('');
    try {
      const next = await Promise.all(Array.from(files).map(fileToAttachment));
      setAttachments((prev) => [...prev, ...next]);
    } catch (error) {
      setAttachmentError(error instanceof Error ? error.message : '附件读取失败');
    }
  };

  const handleConfirmStage = async () => {
    const trimmed = feedback.trim();
    await confirmCurrentStage(trimmed || undefined);
    setFeedback('');
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
      resetTask();
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
          <button className="ghost small" onClick={() => { resetTask(); setFeedback(''); setAttachments([]); setAttachmentError(''); }}>
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
        <div className="attachment-box">
          <label className="attachment-upload">
            <Upload size={14} />
            添加文档/图片
            <input
              type="file"
              multiple
              accept="image/*,.txt,.md,.markdown,.json,.csv,.tsv,.xml,.html,.htm,.yml,.yaml,.log,.pdf,.doc,.docx"
              onChange={(event) => {
                handleAttachmentChange(event.target.files);
                event.currentTarget.value = '';
              }}
            />
          </label>
          {attachments.length > 0 && (
            <div className="attachment-list">
              {attachments.map((attachment, index) => (
                <div className="attachment-item" key={`${attachment.fileName}-${index}`}>
                  {attachment.kind === 'image' ? <Image size={14} /> : <FileText size={14} />}
                  <span>{attachment.fileName}</span>
                  <small>{Math.max(1, Math.round(attachment.size / 1024))} KB</small>
                  <button
                    type="button"
                    aria-label={`移除 ${attachment.fileName}`}
                    onClick={() => setAttachments((prev) => prev.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          {attachmentError && <p className="attachment-error">{attachmentError}</p>}
        </div>
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
        {canConfirm && activeStage && (activeStage === 'e1' || activeStage === 'e2') && (
          <div className="feedback-area">
            <label htmlFor="stage-feedback">阶段反馈（可选）</label>
            <textarea
              id="stage-feedback"
              value={feedback}
              onChange={(event) => setFeedback(event.target.value)}
              placeholder="输入对当前阶段结果的反馈或修改建议..."
              rows={3}
            />
          </div>
        )}
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
    </section>
  );
}
