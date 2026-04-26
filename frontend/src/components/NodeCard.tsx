import { Check, CircleAlert, CircleX } from 'lucide-react';
import { executionStatusLabels, type MindNode } from '../shared/types/workspace';

type NodeCardProps = {
  node: MindNode;
  selected: boolean;
  onSelect: (id: string) => void;
};

const statusIcon = {
  pass: <Check size={13} />,
  warn: <CircleAlert size={13} />,
  fail: <CircleX size={13} />
};

export function NodeCard({ node, selected, onSelect }: NodeCardProps) {
  return (
    <button
      className={`node-card ${node.kind} ${selected ? 'selected' : ''}`}
      data-node-id={node.id}
      onClick={() => onSelect(node.id)}
    >
      {node.status && <span className={`status ${node.status}`}>{statusIcon[node.status]}</span>}
      {node.priority && <span className={`priority ${node.priority.toLowerCase()}`}>{node.priority}</span>}
      <span className="node-title">{node.title}</span>
      {node.executionStatus && <span className={`execution-chip ${node.executionStatus}`}>{executionStatusLabels[node.executionStatus]}</span>}
      {node.tags?.map((tag) => (
        <span className={`tag mini ${tag === 'AI' ? 'ai' : ''}`} key={tag}>
          {tag}
        </span>
      ))}
    </button>
  );
}
