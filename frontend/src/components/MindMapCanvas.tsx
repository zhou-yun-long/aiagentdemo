import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { MindNode } from '../shared/types/workspace';
import { NodeCard } from './NodeCard';

type MindMapCanvasProps = {
  nodes: MindNode[];
  selectedId: string;
  zoom: number;
  outlineOpen: boolean;
  readOnly?: boolean;
  onSelect: (id: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onFitToScreen: (zoom: number) => void;
  onToggleOutline: () => void;
  onClearExecution: () => void;
  onSnapshot: () => void;
  onNodeDragEnd?: (id: string, x: number, y: number) => void;
  onAutoLayout?: () => void;
};

const laneTop = {
  upper: 120,
  middle: 260,
  lower: 410
};

function getAutoPosition(node: MindNode) {
  return {
    x: 140 + node.depth * 210,
    y: laneTop[node.lane] + node.order * 72
  };
}

function getNodePosition(node: MindNode) {
  if (node.layout?.x !== undefined && node.layout?.y !== undefined) {
    return { x: node.layout.x, y: node.layout.y };
  }
  return getAutoPosition(node);
}

export function MindMapCanvas({
  nodes,
  selectedId,
  zoom,
  outlineOpen,
  readOnly,
  onSelect,
  onZoomIn,
  onZoomOut,
  onFit,
  onFitToScreen,
  onToggleOutline,
  onClearExecution,
  onSnapshot,
  onNodeDragEnd,
  onAutoLayout
}: MindMapCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomIndicator, setZoomIndicator] = useState<number | null>(null);
  const zoomTimerRef = useRef<number | null>(null);

  // Node drag state refs (avoid re-renders during drag)
  const dragState = useRef<{
    nodeId: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const isDragging = useRef(false);

  // Auto-fit zoom based on canvas content and viewport size
  const handleFit = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      onFit();
      return;
    }

    const positions = nodes.map(getNodePosition);
    const maxX = positions.length ? Math.max(...positions.map((p) => p.x)) + 300 : 1320;
    const maxY = positions.length ? Math.max(...positions.map((p) => p.y)) + 60 : 620;
    const cw = Math.max(800, maxX);
    const ch = Math.max(400, maxY);

    const rect = container.getBoundingClientRect();
    const availW = rect.width - 48;
    const availH = rect.height - 126;

    if (availW <= 0 || availH <= 0) {
      onFit();
      return;
    }

    const scale = Math.min(availW / cw, availH / ch);
    const computedZoom = Math.min(1.4, Math.max(0.6, Math.round(scale * 10) / 10));
    onFitToScreen(computedZoom);
  }, [nodes, onFit, onFitToScreen]);

  // Dynamic canvas size
  const canvasSize = useMemo(() => {
    const positions = nodes.map(getNodePosition);
    const maxX = positions.length ? Math.max(...positions.map((p) => p.x)) + 300 : 1320;
    const maxY = positions.length ? Math.max(...positions.map((p) => p.y)) + 60 : 620;
    return {
      width: Math.max(800, maxX),
      height: Math.max(400, maxY)
    };
  }, [nodes]);

  const nodeMap = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  // Wheel zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.1 : 0.1;
      if (delta > 0) onZoomIn();
      else onZoomOut();

      if (zoomTimerRef.current) clearTimeout(zoomTimerRef.current);
      setZoomIndicator(Math.round((zoom + delta) * 100));
      zoomTimerRef.current = window.setTimeout(() => setZoomIndicator(null), 800);
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [zoom, onZoomIn, onZoomOut]);

  // Global mouse handlers for node drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.current) return;

      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;

      if (!isDragging.current && (Math.abs(dx) > 3 || Math.abs(dy) > 3)) {
        isDragging.current = true;
        document.body.style.userSelect = 'none';
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!dragState.current) return;

      if (isDragging.current) {
        const dx = (e.clientX - dragState.current.startX) / zoom;
        const dy = (e.clientY - dragState.current.startY) / zoom;
        const newX = dragState.current.origX + dx;
        const newY = dragState.current.origY + dy;
        onNodeDragEnd?.(dragState.current.nodeId, newX, newY);
      }

      dragState.current = null;
      isDragging.current = false;
      document.body.style.userSelect = '';
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [zoom, onNodeDragEnd]);

  // Node drag start
  const handleNodeDragStart = useCallback((id: string, e: React.MouseEvent) => {
    if (readOnly || e.button !== 0) return;

    const node = nodeMap.get(id);
    if (!node) return;

    e.stopPropagation();
    const pos = getNodePosition(node);
    dragState.current = {
      nodeId: id,
      startX: e.clientX,
      startY: e.clientY,
      origX: pos.x,
      origY: pos.y
    };
    isDragging.current = false;
  }, [readOnly, nodeMap]);

  return (
    <main className="canvas-shell" ref={containerRef}>
      <div
        className="canvas-viewport"
        style={{ width: canvasSize.width * zoom, height: canvasSize.height * zoom }}
      >
        <div className="canvas" style={{ transform: `scale(${zoom})`, width: canvasSize.width, height: canvasSize.height }}>
          <svg
            className="connectors"
            viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{ width: canvasSize.width, height: canvasSize.height }}
          >
            {nodes
              .filter((node) => node.parentId)
              .map((node) => {
                const parent = nodeMap.get(node.parentId!);
                if (!parent) {
                  return null;
                }
                const from = getNodePosition(parent);
                const to = getNodePosition(node);
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
            const position = getNodePosition(node);
            return (
              <div className="node-position" key={node.id} style={{ left: position.x, top: position.y }}>
                <NodeCard
                  node={node}
                  selected={selectedId === node.id}
                  onSelect={onSelect}
                  onDragStart={readOnly ? undefined : handleNodeDragStart}
                />
              </div>
            );
          })}
        </div>
      </div>
      {zoomIndicator !== null && (
        <div className="zoom-indicator">{zoomIndicator}%</div>
      )}
      <div className="zoom-controls">
        <button onClick={onZoomIn}>+</button>
        <span>{Math.round(zoom * 100)}%</span>
        <button onClick={onZoomOut}>-</button>
        <button onClick={handleFit} title="自适应">⌖</button>
      </div>
      <div className="canvas-actions">
        <button onClick={onToggleOutline}>{outlineOpen ? '隐藏大纲' : '显示大纲'}</button>
        {!readOnly && (
          <>
            <button onClick={onClearExecution}>清除执行记录</button>
            <button onClick={onSnapshot}>快照当前结果</button>
            {onAutoLayout && <button onClick={onAutoLayout} title="重置所有节点到自动布局位置">自动布局</button>}
          </>
        )}
      </div>
    </main>
  );
}
