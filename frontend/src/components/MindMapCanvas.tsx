import { useState, useEffect, useCallback, useRef } from 'react';
import type { MindNode } from '../shared/types/workspace';
import { NodeCard } from './NodeCard';

type MindMapCanvasProps = {
  nodes: MindNode[];
  selectedId: string;
  zoom: number;
  outlineOpen: boolean;
  readOnly?: boolean;
  onSelect: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onToggleOutline: () => void;
  onClearExecution: () => void;
  onSnapshot: () => void;
  setZoom: (zoom: number) => void;
};

const canvasSize = {
  width: 1320,
  height: 620
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

export function MindMapCanvas({
  nodes,
  selectedId,
  zoom,
  outlineOpen,
  readOnly,
  onSelect,
  onToggleCollapse,
  onZoomIn,
  onZoomOut,
  onFit,
  onToggleOutline,
  onClearExecution,
  onSnapshot,
  setZoom
}: MindMapCanvasProps) {
  const shellRef = useRef<HTMLElement>(null);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [spaceDown, setSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [smoothFollow, setSmoothFollow] = useState(false);
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const smoothTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Space key held → grab cursor
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        setSpaceDown(true);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setSpaceDown(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // Drag-to-pan (space+drag or middle-mouse drag)
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button === 1 || (e.button === 0 && spaceDown)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
      }
    },
    [spaceDown, panX, panY]
  );

  useEffect(() => {
    if (!isPanning) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!panStartRef.current) return;
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPanX(panStartRef.current.panX + dx);
      setPanY(panStartRef.current.panY + dy);
    };
    const onMouseUp = () => {
      setIsPanning(false);
      panStartRef.current = null;
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isPanning]);

  // Wheel: Ctrl/Cmd+wheel → zoom, plain wheel → pan
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom toward cursor
        const rect = shell.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        const newZoom = Math.min(1.4, Math.max(0.6, zoom * factor));
        const clampedZoom = Math.round(newZoom * 100) / 100;
        // Keep point under cursor fixed
        setPanX(mouseX - ((mouseX - panX) / zoom) * clampedZoom);
        setPanY(mouseY - ((mouseY - panY) / zoom) * clampedZoom);
        setZoom(clampedZoom);
      } else {
        // Pan
        setPanX((prev) => prev - e.deltaX);
        setPanY((prev) => prev - e.deltaY);
      }
    };
    shell.addEventListener('wheel', onWheel, { passive: false });
    return () => shell.removeEventListener('wheel', onWheel);
  }, [zoom, panX, panY, setZoom]);

  // Auto-scroll to selected node
  useEffect(() => {
    if (!selectedId || !shellRef.current) return;
    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return;

    const shell = shellRef.current;
    const { width: shellW, height: shellH } = shell.getBoundingClientRect();
    const pos = getPosition(node);
    const nodeW = node.kind === 'root' ? 192 : 170;
    const nodeH = 36;
    const centerX = (pos.x + nodeW / 2) * zoom + panX;
    const centerY = (pos.y + nodeH / 2) * zoom + panY;
    const margin = 120;

    if (
      centerX < margin ||
      centerX > shellW - margin ||
      centerY < margin ||
      centerY > shellH - margin
    ) {
      const newPanX = shellW / 2 - (pos.x + nodeW / 2) * zoom;
      const newPanY = shellH / 2 - (pos.y + nodeH / 2) * zoom;
      setSmoothFollow(true);
      setPanX(newPanX);
      setPanY(newPanY);
      if (smoothTimerRef.current) clearTimeout(smoothTimerRef.current);
      smoothTimerRef.current = setTimeout(() => setSmoothFollow(false), 350);
    }
  }, [selectedId, nodes, zoom]);

  const nodeMap = new Map(nodes.map((node) => [node.id, node]));

  const childMap = new Map<string, string[]>();
  for (const node of nodes) {
    if (node.parentId) {
      if (!childMap.has(node.parentId)) childMap.set(node.parentId, []);
      childMap.get(node.parentId)!.push(node.id);
    }
  }

  const collapsedAncestors = new Set<string>();
  for (const node of nodes) {
    if (node.collapsed) {
      const stack = childMap.get(node.id) ? [...childMap.get(node.id)!] : [];
      while (stack.length) {
        const cid = stack.pop()!;
        collapsedAncestors.add(cid);
        const grandchildren = childMap.get(cid);
        if (grandchildren) stack.push(...grandchildren);
      }
    }
  }

  const visibleNodes = nodes.filter((node) => !collapsedAncestors.has(node.id));

  const shellClass = [
    'canvas-shell',
    spaceDown && !isPanning ? 'space-down' : '',
    isPanning ? 'panning' : '',
    smoothFollow ? 'canvas-follow-transition' : ''
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <main
      ref={shellRef}
      className={shellClass}
      onMouseDown={handleMouseDown}
    >
      <div className="canvas-viewport" style={{ width: canvasSize.width * zoom, height: canvasSize.height * zoom }}>
        <div className="canvas" style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}>
          <svg className="connectors" viewBox="0 0 1320 620" preserveAspectRatio="none" aria-hidden="true">
            {visibleNodes
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
          {visibleNodes.map((node) => {
            const position = getPosition(node);
            const hasChildren = childMap.has(node.id);
            return (
              <div className="node-position" key={node.id} style={{ left: position.x, top: position.y }}>
                <NodeCard node={node} selected={selectedId === node.id} hasChildren={hasChildren} onSelect={onSelect} onToggleCollapse={onToggleCollapse} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="zoom-controls">
        <button onClick={onZoomIn}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomOut}>-</button>
        <button onClick={onFit}>⌖</button>
      </div>
      <div className="canvas-actions">
        <button onClick={onToggleOutline}>{outlineOpen ? '隐藏大纲' : '显示大纲'}</button>
        {!readOnly && (
          <>
            <button onClick={onClearExecution}>清除执行记录</button>
            <button onClick={onSnapshot}>快照当前结果</button>
          </>
        )}
      </div>
    </main>
  );
}
