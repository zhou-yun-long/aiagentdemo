import { useState, useEffect, useCallback, useRef } from 'react';
import type { MindNode } from '../shared/types/workspace';
import { getMindMapBounds, getMindNodeBox, getMindNodePosition, getMindNodeSize } from '../utils/mindMapLayout';
import { NodeCard } from './NodeCard';

type MindMapCanvasProps = {
  nodes: MindNode[];
  selectedId: string;
  zoom: number;
  layoutVersion: number;
  onSelect: (id: string) => void;
  onToggleCollapse: (id: string) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  setZoom: (zoom: number) => void;
};

export function MindMapCanvas({
  nodes,
  selectedId,
  zoom,
  layoutVersion,
  onSelect,
  onToggleCollapse,
  onZoomIn,
  onZoomOut,
  onFit,
  setZoom
}: MindMapCanvasProps) {
  const shellRef = useRef<HTMLElement>(null);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [spaceDown, setSpaceDown] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const [smoothFollow, setSmoothFollow] = useState(false);
  const [showHint, setShowHint] = useState(() => !sessionStorage.getItem('canvas-hint-dismissed'));
  const panStartRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const smoothTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hintTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Auto-dismiss hint after 5 seconds
  useEffect(() => {
    if (!showHint) return;
    hintTimerRef.current = setTimeout(() => {
      setShowHint(false);
      sessionStorage.setItem('canvas-hint-dismissed', '1');
    }, 5000);
    return () => clearTimeout(hintTimerRef.current);
  }, [showHint]);

  const dismissHint = useCallback(() => {
    if (!showHint) return;
    clearTimeout(hintTimerRef.current);
    setShowHint(false);
    sessionStorage.setItem('canvas-hint-dismissed', '1');
  }, [showHint]);

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
      dismissHint();
      if (e.button === 1 || (e.button === 0 && spaceDown)) {
        e.preventDefault();
        setIsPanning(true);
        panStartRef.current = { x: e.clientX, y: e.clientY, panX, panY };
      }
    },
    [spaceDown, panX, panY, dismissHint]
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
      dismissHint();
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
  }, [zoom, panX, panY, setZoom, dismissHint]);

  // Auto-scroll to selected node
  useEffect(() => {
    if (!selectedId || !shellRef.current) return;
    const node = nodes.find((n) => n.id === selectedId);
    if (!node) return;

    const shell = shellRef.current;
    const { width: shellW, height: shellH } = shell.getBoundingClientRect();
    const pos = getMindNodePosition(node);
    const { width: nodeW, height: nodeH } = getMindNodeSize(node);
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

  // Reset pan to center on root when layout changes (e.g. auto-balance)
  useEffect(() => {
    if (layoutVersion === 0 || !shellRef.current) return;
    const root = nodes.find((n) => n.kind === 'root');
    if (!root) return;
    const shell = shellRef.current;
    const { width: shellW, height: shellH } = shell.getBoundingClientRect();
    const pos = getMindNodePosition(root);
    const { width: rootW, height: rootH } = getMindNodeSize(root);
    setPanX(shellW / 2 - (pos.x + rootW / 2) * zoom);
    setPanY(shellH / 2 - (pos.y + rootH / 2) * zoom);
  }, [layoutVersion]);

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
  const canvasSize = getMindMapBounds(visibleNodes);

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
        <div
          className="canvas"
          style={{
            width: canvasSize.width,
            height: canvasSize.height,
            transform: `translate(${panX}px, ${panY}px) scale(${zoom})`
          }}
        >
          <svg
            className="connectors"
            viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            {visibleNodes
              .filter((node) => node.parentId)
              .map((node) => {
                const parent = nodeMap.get(node.parentId!);
                if (!parent) {
                  return null;
                }
                const from = getMindNodeBox(parent);
                const to = getMindNodeBox(node);
                const childIsLeft = to.x + to.width / 2 < from.x + from.width / 2;
                const startX = childIsLeft ? from.x : from.x + from.width;
                const startY = from.y + from.height / 2;
                const endX = childIsLeft ? to.x + to.width + 18 : to.x - 18;
                const endY = to.y + to.height / 2;
                const midX = childIsLeft
                  ? startX - Math.max(60, (startX - endX) / 2)
                  : startX + Math.max(60, (endX - startX) / 2);
                return (
                  <path
                    d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                    key={`${node.parentId}-${node.id}`}
                  />
                );
              })}
          </svg>
          {visibleNodes.map((node) => {
            const position = getMindNodePosition(node);
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
      {showHint && (
        <div className="canvas-hint" onClick={dismissHint}>
          <span>滚轮平移</span>
          <span className="hint-sep">·</span>
          <span>Ctrl+滚轮缩放</span>
          <span className="hint-sep">·</span>
          <span>空格+拖拽移动</span>
        </div>
      )}
    </main>
  );
}
