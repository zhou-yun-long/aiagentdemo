import { X } from 'lucide-react';
import type { MindNode } from '../data/mindMap';

type OutlinePanelProps = {
  nodes: MindNode[];
  selectedId: string;
  onSelect: (id: string) => void;
};

export function OutlinePanel({ nodes, selectedId, onSelect }: OutlinePanelProps) {
  const outlineNodes = nodes.filter((node) => node.kind === 'root' || node.kind === 'group' || node.kind === 'case');

  return (
    <aside className="outline">
      <div className="panel-title">
        <span>大纲视图</span>
        <button className="close-button">
          <X size={14} />
          关闭
        </button>
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
          </button>
        ))}
      </div>
    </aside>
  );
}
