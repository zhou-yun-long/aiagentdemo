import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set());
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const panel = (e.currentTarget as HTMLElement).parentElement!;
    dragRef.current = { startX: e.clientX, startWidth: panel.offsetWidth };
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = e.clientX - dragRef.current.startX;
      const newWidth = Math.min(600, Math.max(180, dragRef.current.startWidth + delta));
      document.documentElement.style.setProperty('--outline-width', `${newWidth}px`);
    };
    const onMouseUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const visibleNodes = useMemo(() => {
    // First filter by kind
    const kindFiltered = nodes.filter(
      (node) => node.kind === 'root' || node.kind === 'group' || node.kind === 'case'
    );

    // Apply keyword and status filters
    const filtered = kindFiltered.filter((node) => {
      const matchKeyword = !keyword || node.title.toLowerCase().includes(keyword.toLowerCase());
      const matchStatus = statusFilter === 'all' || node.executionStatus === statusFilter;
      return matchKeyword && matchStatus;
    });

    // When searching, show all matches regardless of collapse
    if (keyword) return filtered;

    // Build set of visible ids: walk the tree, skip children of collapsed nodes
    const filteredIds = new Set(filtered.map((n) => n.id));
    const result: MindNode[] = [];
    const childMap = new Map<string, MindNode[]>();
    for (const node of kindFiltered) {
      const parentId = node.parentId ?? '';
      if (!childMap.has(parentId)) childMap.set(parentId, []);
      childMap.get(parentId)!.push(node);
    }

    function walk(parentId: string) {
      const children = childMap.get(parentId) || [];
      for (const child of children) {
        if (!filteredIds.has(child.id)) continue;
        result.push(child);
        if (!collapsed.has(child.id)) {
          walk(child.id);
        }
      }
    }

    walk('');
    return result;
  }, [keyword, nodes, statusFilter, collapsed]);

  const toggleCollapse = (nodeId: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

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
        {visibleNodes.map((node) => {
          const hasChildren = nodes.some((n) => n.parentId === node.id && (n.kind === 'root' || n.kind === 'group' || n.kind === 'case'));
          const isCollapsed = collapsed.has(node.id);
          return (
            <button
              className={`tree-item depth-${node.depth} ${selectedId === node.id ? 'selected' : ''}`}
              key={node.id}
              onClick={() => onSelect(node.id)}
            >
              {hasChildren ? (
                <span
                  className={`chevron ${isCollapsed ? '' : 'expanded'}`}
                  onClick={(e) => { e.stopPropagation(); toggleCollapse(node.id); }}
                >
                  ›
                </span>
              ) : (
                <span className="chevron-placeholder" />
              )}
              <span>{node.title}</span>
              {node.executionStatus && <span className={`status-dot ${node.executionStatus}`} />}
            </button>
          );
        })}
      </div>
      <div className="outline-resize-handle" onMouseDown={handleResizeMouseDown} />
    </aside>
  );
}
