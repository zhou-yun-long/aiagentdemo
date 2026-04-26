import { executionStatusLabels, priorityOptions, type ExecutionStatus, type MindNode, type Priority } from '../shared/types/workspace';

type SelectionBarProps = {
  node?: MindNode;
  lastSnapshotAt?: string;
  onUpdate: (id: string, patch: Partial<MindNode>) => void;
  onAddChild: () => void;
  onDelete: () => void;
};

function parseTags(value: string) {
  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function SelectionBar({ node, lastSnapshotAt, onUpdate, onAddChild, onDelete }: SelectionBarProps) {
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

  return (
    <div className="selection-bar editable">
      <span>当前节点</span>
      <input
        className="title-input"
        value={node.title}
        onChange={(event) => onUpdate(node.id, { title: event.target.value })}
        aria-label="节点标题"
      />
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
      {lastSnapshotAt && <small>快照 {lastSnapshotAt}</small>}
      <button onClick={onAddChild}>新增下级</button>
      <button>重新生成本阶段</button>
      {!isRoot && (
        <button className="danger" onClick={onDelete}>
          删除
        </button>
      )}
    </div>
  );
}
