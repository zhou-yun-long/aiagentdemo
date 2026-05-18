import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Circle, FileText, Image, Loader2, PauseCircle, Play, RotateCcw, Square, Upload, X } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { GeneratedCaseDraft, GenerateStage, GenerationMode } from '../../types/generation';
import { useGenerationStore } from '../../features/generation/generationStore';
import { useGenerateStream } from '../../features/generation/useGenerateStream';
import { useWorkspaceStore } from '../../features/workspace/workspaceStore';
import { batchConfirmCases, getDefaultProjectId, saveTraceability } from '../../shared/api/treeify';
import type { GenerationAttachmentRequest, TraceGraphDto } from '../../shared/types/treeify';
import {
  draftToGeneratedCaseDto,
  generatedCaseDraftsToRows
} from '../../shared/transforms/treeifyTransforms';
import { CasePreviewTable } from '../CasePreviewTable';
import { StageArtifactsPanel } from '../StageArtifactsPanel';
import { bindTraceGraphCases } from '../../utils/traceGraph';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).href;

type FunctionalTabPanelProps = {
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
const BINARY_DOC_EXTENSIONS = new Set(['pdf', 'docx']);
const SUPPORTED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, ...BINARY_DOC_EXTENSIONS, 'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp']);
const MAX_ATTACHMENT_CHARS = 60000;
const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

function extensionOf(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

function isBinaryDoc(file: File) {
  const ext = extensionOf(file.name);
  return BINARY_DOC_EXTENSIONS.has(ext) || file.type === 'application/pdf'
    || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
}

function isSupportedFile(file: File) {
  const ext = extensionOf(file.name);
  return file.type.startsWith('image/') || file.type.startsWith('text/') || SUPPORTED_EXTENSIONS.has(ext) || isBinaryDoc(file);
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

async function extractPdfText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    parts.push(content.items.map((item) => ('str' in item ? item.str : '')).join(' '));
  }
  return parts.join('\n').slice(0, MAX_ATTACHMENT_CHARS);
}

async function extractDocxText(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value.slice(0, MAX_ATTACHMENT_CHARS);
}

async function fileToAttachment(file: File): Promise<GenerationAttachmentRequest> {
  if (!isSupportedFile(file)) {
    throw new Error(`${file.name} 格式不支持，请使用图片、PDF、Word 或文本文件`);
  }

  if (file.size > MAX_ATTACHMENT_BYTES) {
    throw new Error(`${file.name} 超过 2MB，请先压缩或摘取关键内容`);
  }

  const ext = extensionOf(file.name);
  const kind = file.type.startsWith('image/') ? 'image' : 'document';
  let content = '';

  try {
    if (kind === 'image') {
      content = await readAsDataUrl(file);
    } else if (ext === 'pdf') {
      content = await extractPdfText(file);
    } else if (ext === 'docx') {
      content = await extractDocxText(file);
    } else if (isTextLike(file)) {
      content = (await file.text()).slice(0, MAX_ATTACHMENT_CHARS);
    }
  } catch {
    content = '';
  }

  return {
    kind,
    fileName: file.name,
    contentType: file.type || 'application/octet-stream',
    size: file.size,
    content
  };
}

export function FunctionalTabPanel({ onImportRows }: FunctionalTabPanelProps) {
  const [confirming, setConfirming] = useState(false);
  const [attachments, setAttachments] = useState<GenerationAttachmentRequest[]>([]);
  const [attachmentError, setAttachmentError] = useState('');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const mode = useGenerationStore((state) => state.mode);
  const input = useGenerationStore((state) => state.input);
  const status = useGenerationStore((state) => state.status);
  const activeStage = useGenerationStore((state) => state.activeStage);
  const stages = useGenerationStore((state) => state.stages);
  const cases = useGenerationStore((state) => state.cases);
  const criticScore = useGenerationStore((state) => state.criticScore);
  const error = useGenerationStore((state) => state.error);
  const artifacts = useGenerationStore((state) => state.artifacts);
  const traceGraph = useGenerationStore((state) => state.traceGraph);
  const setMode = useGenerationStore((state) => state.setMode);
  const setInput = useGenerationStore((state) => state.setInput);
  const resetTask = useGenerationStore((state) => state.resetTask);
  const updateCase = useGenerationStore((state) => state.updateCase);
  const removeCase = useGenerationStore((state) => state.removeCase);
  const setTraceGraph = useGenerationStore((state) => state.setTraceGraph);
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId);
  const { startGeneration, confirmCurrentStage, cancelGeneration, retryGeneration } = useGenerateStream();

  const canStart = (input.trim().length > 0 || attachments.length > 0) && status !== 'running' && status !== 'waiting_confirm';
  const canConfirm = status === 'waiting_confirm';

  useEffect(() => {
    if (canConfirm && confirmRef.current) {
      confirmRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [canConfirm]);
  const streamStage = activeStage ? stages[activeStage] : undefined;
  const confirmButtonLabel =
    canConfirm && (activeStage === 'e1' || activeStage === 'e2')
      ? '提交补充并继续'
      : '继续下一阶段';

  const handleStart = async () => {
    await startGeneration(input.trim(), mode, attachments);
  };

  const handleAttachmentChange = async (files: FileList | null) => {
    if (!files?.length) {
      return;
    }

    setAttachmentError('');
    const errors: string[] = [];
    const next: GenerationAttachmentRequest[] = [];

    for (const file of Array.from(files)) {
      try {
        next.push(await fileToAttachment(file));
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `${file.name} 读取失败`);
      }
    }

    if (next.length > 0) {
      setAttachments((prev) => [...prev, ...next]);
    }
    if (errors.length > 0) {
      setAttachmentError(errors.join('；'));
    }
  };

  const handleConfirmStage = async () => {
    const supplement = activeStage ? (artifacts[activeStage]?.userSupplement ?? '').trim() : '';
    await confirmCurrentStage(supplement || undefined);
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
    let savedTraceGraph: TraceGraphDto | undefined;
    try {
      const projectId = currentProjectId ?? getDefaultProjectId();
      const savedCases = await batchConfirmCases(projectId, cases.map(draftToGeneratedCaseDto));
      if (traceGraph) {
        const boundGraph = bindTraceGraphCases(traceGraph, cases, savedCases);
        const savedGraph = await saveTraceability(projectId, boundGraph);
        savedTraceGraph = savedGraph;
      }
      onImportRows(generatedCaseDraftsToRows(cases));
    } catch {
      onImportRows(generatedCaseDraftsToRows(cases));
    } finally {
      setConfirming(false);
      resetTask();
      if (savedTraceGraph) {
        setTraceGraph(savedTraceGraph);
      }
    }
  };

  return (
    <>
      <div className="generate-card">
        <div className="generate-card-head">
          <div>
            <strong>三阶段生成</strong>
            {criticScore !== undefined && <span className="critic-score">Critic {criticScore}</span>}
          </div>
          <button className="ghost small" onClick={() => { resetTask(); setAttachments([]); setAttachmentError(''); }}>
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
              accept="image/*,.txt,.md,.markdown,.json,.csv,.tsv,.xml,.html,.htm,.yml,.yaml,.log,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
          <button ref={confirmRef} disabled={!canConfirm} onClick={handleConfirmStage}>
            {confirmButtonLabel}
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

      <StageArtifactsPanel />

      <CasePreviewTable cases={cases} confirming={confirming} onUpdate={updateCase} onRemove={removeCase} onConfirm={handleImport} />
    </>
  );
}
