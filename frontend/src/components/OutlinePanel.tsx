import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { executionStatusLabels, type ExecutionStatus, type MindNode } from '../shared/types/workspace';

type OutlinePanelProps = {
  nodes: MindNode[];
  selectedId: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function OutlinePanel({ nodes, selectedId, onSelect, onClose }: OutlinePanelProps) {
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<ExecutionStatus | 'all'>('all');
  const outlineNodes = useMemo(
    () =>
      nodes.filter((node) => {
        const visibleKind = node.kind === 'root' || node.kind === 'group' || node.kind === 'case';
        const matchKeyword = !keyword || node.title.toLowerCase().includes(keyword.toLowerCase());
        const matchStatus = statusFilter === 'all' || node.executionStatus === statusFilter;
        return visibleKind && matchKeyword && matchStatus;
      }),
    [keyword, nodes, statusFilter]
  );

  return (
    <aside className="outline">
      <div className="panel-title">
        <span>大纲视图</span>
        <button className="close-button" onClick={onClose}>
          <X size={14} />
          关闭
        </button>
      </div>
      <div className="outline-controls">
        <label className="search-field">
          <Search size={14} />
          <input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="搜索节点" />
        </label>
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ExecutionStatus | 'all')}>
          <option value="all">全部状态</option>
          {Object.entries(executionStatusLabels).map(([value, label]) => (
            <option value={value} key={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      <div className="tree-list">
        {outlineNodes.map((node) => (
          <button
            className={`tree-item depth-${node.depth} ${selectedId === node.id ? 'selected' : ''}`}
            key={node.id}
            onClick={() => onSelect(node.id)}
          >
            <span className="chevron">›</span>
            <span>{node.title}</span>
            {node.executionStatus && <span className={`status-dot ${node.executionStatus}`} />}
          </button>
        ))}
      </div>
    </aside>
  );
}
