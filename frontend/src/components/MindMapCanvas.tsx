import type { MindNode } from '../data/mindMap';
import { NodeCard } from './NodeCard';

type MindMapCanvasProps = {
  nodes: MindNode[];
  selectedId: string;
  onSelect: (id: string) => void;
};

const laneTop = {
  upper: 120,
  middle: 260,
  lower: 410
};

function getPosition(node: MindNode) {
  return {
    x: 140 + node.depth * 210,
    y: laneTop[node.lane] + node.order * 72
  };
}

export function MindMapCanvas({ nodes, selectedId, onSelect }: MindMapCanvasProps) {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  return (
    <main className="canvas-shell">
      <div className="canvas">
        <svg className="connectors" viewBox="0 0 1320 620" preserveAspectRatio="none" aria-hidden="true">
          {nodes
            .filter((node) => node.parentId)
            .map((node) => {
              const parent = nodeMap.get(node.parentId!);
              if (!parent) {
                return null;
              }
              const from = getPosition(parent);
              const to = getPosition(node);
              const startX = from.x + (parent.kind === 'root' ? 96 : 170);
              const startY = from.y + 18;
              const endX = to.x - 18;
              const endY = to.y + 18;
              const midX = startX + Math.max(60, (endX - startX) / 2);
              return (
                <path
                  d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                  key={`${node.parentId}-${node.id}`}
                />
              );
            })}
        </svg>
        {nodes.map((node) => {
          const position = getPosition(node);
          return (
            <div className="node-position" key={node.id} style={{ left: position.x, top: position.y }}>
              <NodeCard node={node} selected={selectedId === node.id} onSelect={onSelect} />
            </div>
          );
        })}
      </div>
      <div className="zoom-controls">
        <button>+</button>
        <span>100%</span>
        <button>-</button>
        <button>⌖</button>
      </div>
      <div className="canvas-actions">
        <button>隐藏大纲</button>
        <button>清除执行记录</button>
        <button>快照当前结果</button>
      </div>
    </main>
  );
}
