import { useCallback, useRef, useState } from 'react';
import { FileText, Loader2, Monitor, Smartphone, Upload, X } from 'lucide-react';
import { useGenerationStore } from '../../features/generation/generationStore';
import { useWorkspaceStore } from '../../features/workspace/workspaceStore';
import { uploadAttachment, validateFileSize } from '../../shared/api/attachments';
import type { OutputFormat } from '../../types/generation';

const PLATFORM_OPTIONS = [
  { value: 'any', label: '不限' },
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
  { value: 'android', label: 'Android' },
  { value: 'ios', label: 'iOS' },
  { value: 'web', label: 'Web' },
] as const;

const OUTPUT_FORMAT_OPTIONS: Array<{ value: OutputFormat; label: string }> = [
  { value: 'excel', label: '标准用例Excel' },
  { value: 'table', label: '表格' },
  { value: 'json', label: 'JSON' },
];

const ACCEPTED_REF_EXTENSIONS = '.xlsx,.csv,.json';

type UploadedRef = {
  attachmentId: string;
  fileName: string;
  size: number;
  uploading: boolean;
  error?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function GenerationConfigCard() {
  const config = useGenerationStore((s) => s.config);
  const setConfig = useGenerationStore((s) => s.setConfig);
  const status = useGenerationStore((s) => s.status);
  const currentProjectId = useWorkspaceStore((s) => s.currentProjectId);
  const [uploadedRefs, setUploadedRefs] = useState<UploadedRef[]>([]);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isRunning = status === 'running' || status === 'waiting_confirm';

  // --- Platform toggle ---
  const handlePlatformToggle = useCallback(
    (value: string) => {
      if (isRunning) return;
      const current = config.targetPlatforms;
      if (value === 'any') {
        setConfig({ targetPlatforms: [] });
        return;
      }
      const withoutAny = current.filter((p) => p !== 'any');
      const next = withoutAny.includes(value)
        ? withoutAny.filter((p) => p !== value)
        : [...withoutAny, value];
      setConfig({ targetPlatforms: next });
    },
    [config.targetPlatforms, setConfig, isRunning],
  );

  // --- Output format ---
  const handleOutputFormat = useCallback(
    (value: OutputFormat) => {
      if (!isRunning) setConfig({ outputFormat: value });
    },
    [setConfig, isRunning],
  );

  // --- Custom prompt ---
  const handleCustomPrompt = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setConfig({ customPrompt: e.target.value });
    },
    [setConfig],
  );

  // --- Reference file upload ---
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArray = Array.from(files);
      if (fileArray.length === 0) return;

      setUploadError('');

      const pending: UploadedRef[] = fileArray.map((f) => ({
        attachmentId: '',
        fileName: f.name,
        size: f.size,
        uploading: true,
      }));
      setUploadedRefs((prev) => [...prev, ...pending]);

      const projectId = currentProjectId ?? 1;

      const results = await Promise.allSettled(
        fileArray.map(async (file, i) => {
          const sizeErr = validateFileSize(file);
          if (sizeErr) {
            setUploadedRefs((prev) =>
              prev.map((item) =>
                item.fileName === pending[i].fileName && item.uploading
                  ? { ...item, uploading: false, error: sizeErr }
                  : item,
              ),
            );
            return;
          }

          try {
            const result = await uploadAttachment(projectId, file);
            setUploadedRefs((prev) =>
              prev.map((item) =>
                item.fileName === pending[i].fileName && item.uploading
                  ? { ...item, attachmentId: result.attachmentId, uploading: false }
                  : item,
              ),
            );
            return result.attachmentId;
          } catch (err) {
            const msg = err instanceof Error ? err.message : '上传失败';
            setUploadedRefs((prev) =>
              prev.map((item) =>
                item.fileName === pending[i].fileName && item.uploading
                  ? { ...item, uploading: false, error: msg }
                  : item,
              ),
            );
          }
        }),
      );

      const newIds = results
        .filter(
          (r): r is PromiseFulfilledResult<string | undefined> =>
            r.status === 'fulfilled' && r.value != null,
        )
        .map((r) => r.value as string);

      if (newIds.length > 0) {
        setConfig({ referenceCases: [...config.referenceCases, ...newIds] });
      }
    },
    [currentProjectId, config.referenceCases, setConfig],
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        handleFiles(e.target.files);
        e.currentTarget.value = '';
      }
    },
    [handleFiles],
  );

  const handleRemoveRef = useCallback(
    (index: number) => {
      const removed = uploadedRefs[index];
      setUploadedRefs((prev) => prev.filter((_, i) => i !== index));
      if (removed.attachmentId) {
        setConfig({
          referenceCases: config.referenceCases.filter((id) => id !== removed.attachmentId),
        });
      }
    },
    [uploadedRefs, config.referenceCases, setConfig],
  );

  return (
    <div className="config-card">
      {/* 1. Target platforms */}
      <div className="config-section">
        <div className="config-section-label">
          <Monitor size={14} />
          <span>目标平台</span>
        </div>
        <div className="config-platform-grid">
          {PLATFORM_OPTIONS.map((opt) => {
            const checked =
              opt.value === 'any'
                ? config.targetPlatforms.length === 0
                : config.targetPlatforms.includes(opt.value);
            return (
              <label key={opt.value} className={`config-platform-chip${checked ? ' active' : ''}`}>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handlePlatformToggle(opt.value)}
                  disabled={isRunning}
                />
                {opt.value === 'any' ? (
                  <Smartphone size={13} />
                ) : null}
                {opt.label}
              </label>
            );
          })}
        </div>
      </div>

      {/* 2. Output format */}
      <div className="config-section">
        <div className="config-section-label">
          <FileText size={14} />
          <span>输出格式</span>
        </div>
        <div className="config-radio-group">
          {OUTPUT_FORMAT_OPTIONS.map((opt) => (
            <label key={opt.value} className={`config-radio-item${config.outputFormat === opt.value ? ' active' : ''}`}>
              <input
                type="radio"
                name="outputFormat"
                value={opt.value}
                checked={config.outputFormat === opt.value}
                onChange={() => handleOutputFormat(opt.value)}
                disabled={isRunning}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* 3. Custom prompt */}
      <div className="config-section">
        <div className="config-section-label">
          <span>自定义Prompt</span>
        </div>
        <textarea
          className="config-custom-prompt"
          value={config.customPrompt}
          onChange={handleCustomPrompt}
          placeholder="输入额外的生成指令，如：重点关注边界值测试、覆盖异常流程..."
          disabled={isRunning}
          rows={3}
        />
      </div>

      {/* 4. Reference cases */}
      <div className="config-section">
        <div className="config-section-label">
          <Upload size={14} />
          <span>参考用例</span>
        </div>
        <div className="config-ref-upload-area">
          <label className="config-ref-upload-btn">
            <Upload size={14} />
            上传参考文件
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_REF_EXTENSIONS}
              onChange={handleFileInput}
              disabled={isRunning}
            />
          </label>
          <small className="config-ref-hint">支持 .xlsx, .csv, .json</small>
        </div>
        {uploadedRefs.length > 0 && (
          <div className="config-ref-list">
            {uploadedRefs.map((file, index) => (
              <div
                className={`config-ref-item${file.error ? ' error' : ''}`}
                key={`${file.fileName}-${index}`}
              >
                <FileText size={14} />
                <span className="config-ref-file-name">{file.fileName}</span>
                {file.uploading ? (
                  <Loader2 size={14} className="spinner-icon" />
                ) : file.error ? (
                  <span className="config-ref-file-error">{file.error}</span>
                ) : (
                  <small>{formatFileSize(file.size)}</small>
                )}
                <button
                  type="button"
                  aria-label={`移除 ${file.fileName}`}
                  onClick={() => handleRemoveRef(index)}
                  disabled={file.uploading}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        {uploadError && <p className="config-ref-error">{uploadError}</p>}
      </div>
    </div>
  );
}
