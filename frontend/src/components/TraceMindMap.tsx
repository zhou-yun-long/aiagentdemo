import { useState, useEffect, useCallback, useMemo } from 'react';
import type { TraceGraphDto, TraceNodeDto } from '../shared/types/treeify';
import type { MindNode } from '../shared/types/workspace';
import { autoBalanceMindMap, singleColumnLayout } from '../utils/mindMapLayout';
import { traceToMindNodes } from '../utils/traceGraph';
import { MindMapCanvas } from './MindMapCanvas';
import { defaultNodeFontSize } from '../shared/nodeTypography';

type TraceMindMapProps = {
  graph: TraceGraphDto;
  onSelectCase: (caseId: number) => void;
};

type LayoutMode = 'double' | 'single';

const kindLabels: Record<TraceNodeDto['kind'], string> = {
  requirement: '需求分析点',
  object: '拆解对象',
  case: '测试用例'
};

function rawText(node: TraceNodeDto, key: string) {
  const raw = node.raw;
  if (!raw || typeof raw !== 'object') return '';
  const value = raw[key];
  return typeof value === 'string' ? value.trim() : '';
}

function nodeMeta(node: TraceNodeDto) {
  if (node.kind === 'requirement') return rawText(node, 'type') || kindLabels[node.kind];
  if (node.kind === 'object') return [node.priority, rawText(node, 'type')].filter(Boolean).join(' / ') || kindLabels[node.kind];
  return [node.priority, rawText(node, 'pathType')].filter(Boolean).join(' / ') || kindLabels[node.kind];
}

export function TraceMindMap({ graph, onSelectCase }: TraceMindMapProps) {
  const [layoutMode, setLayoutMode] = useState<LayoutMode>(() => {
    return (localStorage.getItem('trace-layout-mode') as LayoutMode) || 'double';
  });

  const rawNodes = useMemo(() => traceToMindNodes(graph), [graph]);
  const balanced = useMemo(
    () => (layoutMode === 'single' ? singleColumnLayout(rawNodes) : autoBalanceMindMap(rawNodes)),
    [rawNodes, layoutMode]
  );

  const [nodes, setNodes] = useState<MindNode[]>(balanced);
  const [selectedId, setSelectedId] = useState('');
  const [zoom, setZoom] = useState(1);
  const [layoutVersion, setLayoutVersion] = useState(0);

  useEffect(() => {
    setNodes(balanced);
    setSelectedId(balanced.length > 1 ? balanced[1].id : '');
    setLayoutVersion((v) => v + 1);
  }, [balanced]);

  const traceNodeMap = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph.nodes]);
  const selectedTraceNode = selectedId ? traceNodeMap.get(selectedId) : undefined;

  const downstreamCount = useMemo(() => {
    if (!selectedTraceNode) return 0;
    const direct = graph.edges.filter((e) => e.fromId === selectedId).map((e) => e.toId);
    if (selectedTraceNode.kind !== 'requirement') return direct.length;
    const secondLevel = graph.edges.filter((e) => direct.includes(e.fromId)).map((e) => e.toId);
    return new Set([...direct, ...secondLevel]).size;
  }, [graph.edges, selectedId, selectedTraceNode]);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    const traceNode = traceNodeMap.get(id);
    if (traceNode?.kind === 'case' && traceNode.caseId) {
      onSelectCase(traceNode.caseId);
    }
  }, [traceNodeMap, onSelectCase]);

  const handleToggleCollapse = useCallback((id: string) => {
    setNodes((prev) => prev.map((n) => (n.id === id ? { ...n, collapsed: !n.collapsed } : n)));
  }, []);

  const handleZoomIn = useCallback(() => setZoom((z) => Math.min(1.4, +(z + 0.1).toFixed(2))), []);
  const handleZoomOut = useCallback(() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(2))), []);
  const handleFit = useCallback(() => setZoom(1), []);

  const toggleLayout = useCallback(() => {
    setLayoutMode((prev) => {
      const next = prev === 'double' ? 'single' : 'double';
      localStorage.setItem('trace-layout-mode', next);
      return next;
    });
  }, []);

  const selectedMindNode = selectedId ? nodes.find((n) => n.id === selectedId) : undefined;
  const currentFontSize = selectedMindNode?.fontSize ?? defaultNodeFontSize;

  const handleFontSizeChange = useCallback((delta: number) => {
    if (!selectedId) return;
    setNodes((prev) => prev.map((n) => {
      if (n.id !== selectedId) return n;
      const next = Math.max(10, Math.min(24, (n.fontSize ?? defaultNodeFontSize) + delta));
      return { ...n, fontSize: next };
    }));
  }, [selectedId]);

  const handleFontSizeAll = useCallback((delta: number) => {
    setNodes((prev) => prev.map((n) => {
      if (n.kind === 'root') return n;
      const next = Math.max(10, Math.min(24, (n.fontSize ?? defaultNodeFontSize) + delta));
      return { ...n, fontSize: next };
    }));
  }, []);

  return (
    <main className="trace-mind-map">
      <div className="trace-canvas-area">
        <div className="trace-layout-toggle">
          <button
            className={layoutMode === 'double' ? 'active' : ''}
            onClick={toggleLayout}
            title="双列布局"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="5" width="5" height="6" rx="1" />
              <rect x="10" y="2" width="5" height="5" rx="1" />
              <rect x="10" y="9" width="5" height="5" rx="1" />
              <path d="M6 8h4M6 8l4-3M6 8l4 3" />
            </svg>
            双列
          </button>
          <button
            className={layoutMode === 'single' ? 'active' : ''}
            onClick={toggleLayout}
            title="单列布局"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="1" y="5.5" width="5" height="5" rx="1" />
              <rect x="9" y="1" width="6" height="4" rx="1" />
              <rect x="9" y="11" width="6" height="4" rx="1" />
              <path d="M6 8h3M6 8l3-4.5M6 8l3 4.5" />
            </svg>
            单列
          </button>
        </div>
        <MindMapCanvas
          nodes={nodes}
          selectedId={selectedId}
          zoom={zoom}
          layoutVersion={layoutVersion}
          onSelect={handleSelect}
          onToggleCollapse={handleToggleCollapse}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFit={handleFit}
          setZoom={setZoom}
        />
      </div>
      <aside className="trace-detail">
        <div className="trace-font-controls">
          <label>字号</label>
          <div className="trace-font-row">
            <button onClick={() => handleFontSizeChange(-1)} title="缩小选中节点">A-</button>
            <span>{currentFontSize}px</span>
            <button onClick={() => handleFontSizeChange(1)} title="放大选中节点">A+</button>
          </div>
          <div className="trace-font-row">
            <button onClick={() => handleFontSizeAll(-1)} title="缩小全部节点">全部 A-</button>
            <button onClick={() => handleFontSizeAll(1)} title="放大全部节点">全部 A+</button>
          </div>
        </div>
        {selectedTraceNode && (
          <>
            <span>{kindLabels[selectedTraceNode.kind]}</span>
            <h3>{selectedTraceNode.title}</h3>
            <p>{selectedTraceNode.summary || '暂无摘要'}</p>
            <dl>
              <dt>关联下游</dt>
              <dd>{downstreamCount}</dd>
              {selectedTraceNode.priority && (
                <>
                  <dt>优先级</dt>
                  <dd>{selectedTraceNode.priority}</dd>
                </>
              )}
              {nodeMeta(selectedTraceNode) !== kindLabels[selectedTraceNode.kind] && (
                <>
                  <dt>类型/路径</dt>
                  <dd>{nodeMeta(selectedTraceNode)}</dd>
                </>
              )}
              {selectedTraceNode.caseId && (
                <>
                  <dt>用例 ID</dt>
                  <dd>{selectedTraceNode.caseId}</dd>
                </>
              )}
            </dl>
          </>
        )}
      </aside>
    </main>
  );
}
