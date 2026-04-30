import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getShareData } from '../shared/api/treeify';
import { useWorkspaceStore } from '../features/workspace/workspaceStore';
import type { MindNode, NodeSource } from '../shared/types/workspace';
import type { MindmapNodeDto, ShareDataDto } from '../shared/types/treeify';
import { statsFromServer } from '../shared/transforms/treeifyTransforms';
import App from '../App';

function mindmapDtoToMindNode(dto: MindmapNodeDto): MindNode {
  return {
    id: dto.id,
    parentId: dto.parentId,
    caseId: dto.caseId,
    title: dto.title,
    kind: dto.kind as MindNode['kind'],
    priority: dto.priority,
    tags: dto.tags,
    status: dto.status as MindNode['status'],
    executionStatus: dto.executionStatus,
    source: dto.source as NodeSource | undefined,
    ai: dto.source === 'ai',
    version: dto.version,
    lane: dto.lane as MindNode['lane'],
    depth: dto.depth,
    order: dto.order,
    fontFamily: dto.fontFamily,
    fontSize: dto.fontSize,
    fontWeight: dto.fontWeight,
    layout: dto.layout
  };
}

export default function ShareView() {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setReadOnly = useWorkspaceStore((s) => s.setReadOnly);
  const setNodes = useWorkspaceStore((s) => s.setNodes);
  const setServerStats = useWorkspaceStore((s) => s.setServerStats);
  const setPageStatus = useWorkspaceStore((s) => s.setPageStatus);

  useEffect(() => {
    if (!shareToken) {
      setError('无效的分享链接');
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      try {
        const data: ShareDataDto = await getShareData(shareToken);
        if (cancelled) return;

        setReadOnly(true);

        if (data.mindmap && data.mindmap.length > 0) {
          const nodes = data.mindmap.map(mindmapDtoToMindNode);
          setNodes(nodes);
        }

        if (data.stats) {
          setServerStats(statsFromServer(data.stats));
        }

        setPageStatus('ready');
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        const message = err instanceof Error ? err.message : '分享链接已失效';
        setError(message);
        setPageStatus('error', message);
        setLoading(false);
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [shareToken, setReadOnly, setNodes, setServerStats, setPageStatus]);

  if (loading) {
    return (
      <div className="app light">
        <div className="page-status loading">
          <div className="spinner" />
          <p>正在加载分享内容...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app light">
        <div className="page-status empty">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return <App />;
}
