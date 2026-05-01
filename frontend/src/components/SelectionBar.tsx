import { executionStatusLabels, priorityOptions, type ExecutionStatus, type MindNode, type Priority } from '../shared/types/workspace';
import {
  clampNodeFontSize,
  defaultNodeFontSize,
  maxNodeFontSize,
  minNodeFontSize,
  nodeFontOptions,
  nodeFontWeightOptions
} from '../shared/nodeTypography';

type SelectionBarProps = {
  node?: MindNode;
  lastSnapshotAt?: string;
  readOnly?: boolean;
  onUpdate: (id: string, patch: Partial<MindNode>) => void;
};

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function SelectionBar({ node, lastSnapshotAt, readOnly, onUpdate }: SelectionBarProps) {
  if (!node) {
    return (
      <div className="selection-bar">
        <span>当前节点</span>
        <strong>未选择节点</strong>
      </div>
    );
  }

  const isRoot = node.kind === 'root';
  const canExecute = node.kind === 'case';
  const selectedFontSize = node.fontSize ?? defaultNodeFontSize;

  if (readOnly) {
    return (
      <div className="selection-bar">
        <span>当前节点</span>
        <strong>{node.title}</strong>
        {node.priority && <span className={`priority ${node.priority.toLowerCase()}`}>{node.priority}</span>}
        {canExecute && node.executionStatus && (
          <span className={`execution-chip ${node.executionStatus}`}>
            {executionStatusLabels[node.executionStatus]}
          </span>
        )}
        {node.tags && node.tags.length > 0 && (
          <span>{node.tags.join(', ')}</span>
        )}
      </div>
    );
  }

  return (
    <div className="selection-bar editable">
      <span>当前节点</span>
      <input
        className="title-input"
        value={node.title}
        onChange={(event) => onUpdate(node.id, { title: event.target.value })}
        aria-label="节点标题"
      />
      <div className="selection-style-group" aria-label="节点字体样式">
        <select
          value={node.fontFamily || ''}
          onChange={(event) => onUpdate(node.id, { fontFamily: event.target.value || undefined })}
          aria-label="节点字体"
        >
          {nodeFontOptions.map((font) => (
            <option value={font.value || ''} key={font.label}>
              {font.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="style-stepper"
          onClick={() => onUpdate(node.id, { fontSize: clampNodeFontSize(selectedFontSize - 1) })}
          disabled={selectedFontSize <= minNodeFontSize}
          aria-label="减小节点字号"
        >
          A-
        </button>
        <input
          className="font-size-input"
          type="number"
          min={minNodeFontSize}
          max={maxNodeFontSize}
          value={selectedFontSize}
          onChange={(event) => onUpdate(node.id, { fontSize: clampNodeFontSize(Number(event.target.value)) })}
          aria-label="节点字号"
        />
        <button
          type="button"
          className="style-stepper"
          onClick={() => onUpdate(node.id, { fontSize: clampNodeFontSize(selectedFontSize + 1) })}
          disabled={selectedFontSize >= maxNodeFontSize}
          aria-label="增大节点字号"
        >
          A+
        </button>
        <select
          value={node.fontWeight || ''}
          onChange={(event) => onUpdate(node.id, { fontWeight: event.target.value ? Number(event.target.value) : undefined })}
          aria-label="节点字重"
        >
          {nodeFontWeightOptions.map((weight) => (
            <option value={weight.value || ''} key={weight.label}>
              {weight.label}
            </option>
          ))}
        </select>
      </div>
      {!isRoot && (
        <select
          value={node.priority || ''}
          onChange={(event) => onUpdate(node.id, { priority: event.target.value ? (event.target.value as Priority) : undefined })}
          aria-label="优先级"
        >
          <option value="">无优先级</option>
          {priorityOptions.map((priority) => (
            <option value={priority} key={priority}>
              {priority}
            </option>
          ))}
        </select>
      )}
      {canExecute && (
        <select
          value={node.executionStatus || 'not_run'}
          onChange={(event) => onUpdate(node.id, { executionStatus: event.target.value as ExecutionStatus })}
          aria-label="执行状态"
        >
          {Object.entries(executionStatusLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      )}
      <input
        className="tag-input"
        value={(node.tags || []).join(', ')}
        onChange={(event) => onUpdate(node.id, { tags: parseTags(event.target.value) })}
        placeholder="标签"
        aria-label="标签"
      />
      <input
        className="url-input"
        value={node.linkUrl || ''}
        onChange={(event) => onUpdate(node.id, { linkUrl: event.target.value || undefined })}
        placeholder="链接 URL"
        aria-label="链接 URL"
      />
      <input
        className="url-input"
        value={node.imageUrl || ''}
        onChange={(event) => onUpdate(node.id, { imageUrl: event.target.value || undefined })}
        placeholder="图片 URL"
        aria-label="图片 URL"
      />
      {lastSnapshotAt && <small>快照 {lastSnapshotAt}</small>}
      <button>重新生成本阶段</button>
    </div>
  );
}
