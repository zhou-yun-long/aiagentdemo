import { useCallback, useRef, useState } from 'react';
import { FileText, History, Loader2, Upload, X } from 'lucide-react';
import { useGenerationStore } from '../../features/generation/generationStore';
import { useWorkspaceStore } from '../../features/workspace/workspaceStore';
import { uploadAttachment, validateFileSize } from '../../shared/api/attachments';

type InputMode = 'file' | 'text';

const ACCEPTED_EXTENSIONS = '.md,.docx,.pdf,.txt';
const ACCEPTED_MIME = 'text/markdown,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf,text/plain';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type UploadedFile = {
  attachmentId: string;
  fileName: string;
  size: number;
  uploading: boolean;
  error?: string;
};

export function RequirementInputCard() {
  const [mode, setMode] = useState<InputMode>('file');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const input = useGenerationStore((s) => s.input);
  const setInput = useGenerationStore((s) => s.setInput);
  const config = useGenerationStore((s) => s.config);
  const setConfig = useGenerationStore((s) => s.setConfig);
  const status = useGenerationStore((s) => s.status);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);

  const isRunning = status === 'running' || status === 'waiting_confirm';

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      const pending: UploadedFile[] = fileArray.map((f) => ({
        attachmentId: '',
        fileName: f.name,
        size: f.size,
        uploading: true,
      }));

      setUploadedFiles((prev) => [...prev, ...pending]);

      const projectId = currentProjectId ?? 1;

      const results = await Promise.allSettled(
        fileArray.map(async (file, i) => {
          const sizeErr = validateFileSize(file);
          if (sizeErr) {
            setUploadedFiles((prev) =>
              prev.map((item) =>
                item.fileName === pending[i].fileName && item.uploading
                  ? { ...item, uploading: false, error: sizeErr }
                  : item
              )
            );
            return;
          }

          try {
            const result = await uploadAttachment(projectId, file);
            setUploadedFiles((prev) =>
              prev.map((item) =>
                item.fileName === pending[i].fileName && item.uploading
                  ? { ...item, attachmentId: result.attachmentId, uploading: false }
                  : item
              )
            );
            return result.attachmentId;
          } catch (err) {
            const msg = err instanceof Error ? err.message : '上传失败';
            setUploadedFiles((prev) =>
              prev.map((item) =>
                item.fileName === pending[i].fileName && item.uploading
                  ? { ...item, uploading: false, error: msg }
                  : item
              )
            );
          }
        })
      );

      const newIds = results
        .filter((r): r is PromiseFulfilledResult<string | undefined> => r.status === 'fulfilled' && r.value != null)
        .map((r) => r.value as string);

      if (newIds.length > 0) {
        setConfig({ referenceCases: [...config.referenceCases, ...newIds] });
      }
    },
    [currentProjectId, config.referenceCases, setConfig]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (isRunning) return;
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles, isRunning]
  );

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (!isRunning) setDragOver(true);
    },
    [isRunning]
  );

  const handleDragLeave = useCallback(() => {
    setDragOver(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        e.currentTarget.value = '';
      }
    },
    [handleFiles]
  );

  const handleRemoveFile = useCallback(
    (index: number) => {
      const removed = uploadedFiles[index];
      setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
      if (removed.attachmentId) {
        setConfig({
          referenceCases: config.referenceCases.filter((id) => id !== removed.attachmentId),
        });
      }
    },
    [uploadedFiles, config.referenceCases, setConfig]
  );

  return (
    <div className="req-input-card">
      {/* Header */}
      <div className="req-input-card-head">
        <div className="req-input-mode-switch">
          <button
            className={mode === 'file' ? 'active' : ''}
            onClick={() => setMode('file')}
            disabled={isRunning}
          >
            文件上传
          </button>
          <button
            className={mode === 'text' ? 'active' : ''}
            onClick={() => setMode('text')}
            disabled={isRunning}
          >
            文本输入
          </button>
        </div>
        <button
          className="ghost small"
          onClick={() => setHistoryOpen(!historyOpen)}
          title="查看功能历史记录"
        >
          <History size={14} />
          查看功能历史记录
        </button>
      </div>

      {/* File upload mode */}
      {mode === 'file' && (
        <div className="req-input-file-section">
          <div
            className={`req-input-dropzone${dragOver ? ' drag-over' : ''}`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => !isRunning && fileInputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                fileInputRef.current?.click();
              }
            }}
          >
            <Upload size={20} />
            <span>拖拽文件到此处，或点击选择文件</span>
            <small>支持 .md, .docx, .pdf, .txt，单文件最大 50MB</small>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_EXTENSIONS}
              onChange={handleFileInput}
              style={{ display: 'none' }}
            />
          </div>

          {uploadedFiles.length > 0 && (
            <div className="req-input-file-list">
              {uploadedFiles.map((file, index) => (
                <div
                  className={`req-input-file-item${file.error ? ' error' : ''}`}
                  key={`${file.fileName}-${index}`}
                >
                  <FileText size={14} />
                  <span className="req-input-file-name">{file.fileName}</span>
                  {file.uploading ? (
                    <Loader2 size={14} className="spinner-icon" />
                  ) : file.error ? (
                    <span className="req-input-file-error">{file.error}</span>
                  ) : (
                    <small>{formatFileSize(file.size)}</small>
                  )}
                  <button
                    type="button"
                    aria-label={`移除 ${file.fileName}`}
                    onClick={() => handleRemoveFile(index)}
                    disabled={file.uploading}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Text input mode */}
      {mode === 'text' && (
        <div className="req-input-text-section">
          <textarea
            className="requirement-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="请输入需求描述..."
            disabled={isRunning}
          />
        </div>
      )}

      {/* History drawer placeholder */}
      {historyOpen && (
        <div className="req-input-history-placeholder">
          <div className="req-input-history-head">
            <span>功能历史记录</span>
            <button
              type="button"
              aria-label="关闭"
              onClick={() => setHistoryOpen(false)}
            >
              <X size={14} />
            </button>
          </div>
          <p className="req-input-history-empty">暂无历史记录</p>
        </div>
      )}
    </div>
  );
}
