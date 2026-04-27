import { useMemo } from 'react';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { MindMapCanvas } from './components/MindMapCanvas';
import { OutlinePanel } from './components/OutlinePanel';
import { SelectionBar } from './components/SelectionBar';
import { Toolbar } from './components/Toolbar';
import { getWorkspaceStats, useWorkspaceStore } from './features/workspace/workspaceStore';
import { useMindmapSave } from './features/workspace/useMindmapSave';
import { useProjectLoader } from './features/workspace/useProjectLoader';
import type { MindNode } from './shared/types/workspace';

function collectDescendants(nodes: MindNode[], parentId: string) {
  const descendants: MindNode[] = [];
  const queue = [parentId];

  while (queue.length) {
    const currentId = queue.shift();
    const children = nodes.filter((node) => node.parentId === currentId);
    descendants.push(...children);
    queue.push(...children.map((node) => node.id));
  }

  return descendants;
}

function buildCaseExport(nodes: MindNode[]) {
  return nodes
    .filter((node) => node.kind === 'case')
    .map((caseNode) => {
      const descendants = collectDescendants(nodes, caseNode.id);
      const condition = nodes.find((node) => node.parentId === caseNode.id && node.kind === 'condition');
      const step = nodes.find((node) => node.parentId === caseNode.id && node.kind === 'step');
      const expected = step ? nodes.find((node) => node.parentId === step.id && node.kind === 'expected') : undefined;

      return {
        id: caseNode.caseId || caseNode.id,
        title: caseNode.title,
        priority: caseNode.priority,
        executionStatus: caseNode.executionStatus,
        source: caseNode.source,
        tags: caseNode.tags || [],
        precondition: condition?.title || '',
        steps: step ? [step.title] : descendants.filter((node) => node.kind === 'step').map((node) => node.title),
        expected: expected?.title || ''
      };
    });
}

export default function App() {
  const nodes = useWorkspaceStore((state) => state.nodes);
  const theme = useWorkspaceStore((state) => state.theme);
  const selectedId = useWorkspaceStore((state) => state.selectedId);
  const assistantOpen = useWorkspaceStore((state) => state.assistantOpen);
  const outlineOpen = useWorkspaceStore((state) => state.outlineOpen);
  const zoom = useWorkspaceStore((state) => state.zoom);
  const lastSnapshotAt = useWorkspaceStore((state) => state.lastSnapshotAt);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const toggleTheme = useWorkspaceStore((state) => state.toggleTheme);
  const toggleAssistant = useWorkspaceStore((state) => state.toggleAssistant);
  const closeAssistant = useWorkspaceStore((state) => state.closeAssistant);
  const toggleOutline = useWorkspaceStore((state) => state.toggleOutline);
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const addChildNode = useWorkspaceStore((state) => state.addChildNode);
  const addSiblingNode = useWorkspaceStore((state) => state.addSiblingNode);
  const deleteSelectedNode = useWorkspaceStore((state) => state.deleteSelectedNode);
  const moveSelectedNode = useWorkspaceStore((state) => state.moveSelectedNode);
  const setZoom = useWorkspaceStore((state) => state.setZoom);
  const fitZoom = useWorkspaceStore((state) => state.fitZoom);
  const clearExecutionRecords = useWorkspaceStore((state) => state.clearExecutionRecords);
  const snapshotCurrentResult = useWorkspaceStore((state) => state.snapshotCurrentResult);
  const dirty = useWorkspaceStore((state) => state.dirty);
  const appendAiRows = useWorkspaceStore((state) => state.appendAiRows);

  const { pageStatus, pageError } = useProjectLoader();
  const { save, saving, saveResult } = useMindmapSave();

  const selectedNode = nodes.find((node) => node.id === selectedId);
  const stats = useMemo(() => getWorkspaceStats(nodes), [nodes]);

  const handleExportCases = () => {
    const cases = buildCaseExport(nodes);
    const blob = new Blob([JSON.stringify({ product: 'speccase', exportedAt: new Date().toISOString(), cases }, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `speccase-cases-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`app ${theme}`}>
      <Toolbar
        stats={stats}
        theme={theme}
        assistantOpen={assistantOpen}
        onToggleAssistant={toggleAssistant}
        onToggleTheme={toggleTheme}
        onAddChild={addChildNode}
        onAddSibling={addSiblingNode}
        onDelete={deleteSelectedNode}
        onMoveUp={() => moveSelectedNode('up')}
        onMoveDown={() => moveSelectedNode('down')}
        onExportCases={handleExportCases}
        dirty={dirty}
        saving={saving}
        saveResult={saveResult}
        onSave={save}
      />
      <div className={`workspace ${assistantOpen ? '' : 'assistant-closed'} ${outlineOpen ? '' : 'outline-hidden'}`}>
        {outlineOpen && <OutlinePanel nodes={nodes} selectedId={selectedId} onSelect={selectNode} onClose={toggleOutline} />}
        <section className="work-area">
          {pageStatus === 'loading' ? (
            <div className="page-status loading">
              <div className="spinner" />
              <p>正在加载项目...</p>
            </div>
          ) : pageStatus === 'empty' ? (
            <div className="page-status empty">
              <p>暂无项目或用例，请先创建项目</p>
            </div>
          ) : (
            <>
              {pageStatus === 'error' && pageError && (
                <div className="page-status error-banner">{pageError}</div>
              )}
              <MindMapCanvas
                nodes={nodes}
                selectedId={selectedId}
                zoom={zoom}
                outlineOpen={outlineOpen}
                onSelect={selectNode}
                onZoomIn={() => setZoom(zoom + 0.1)}
                onZoomOut={() => setZoom(zoom - 0.1)}
                onFit={fitZoom}
                onToggleOutline={toggleOutline}
                onClearExecution={clearExecutionRecords}
                onSnapshot={snapshotCurrentResult}
              />
              <SelectionBar
                node={selectedNode}
                lastSnapshotAt={lastSnapshotAt}
                onUpdate={updateNode}
                onAddChild={addChildNode}
                onDelete={deleteSelectedNode}
              />
            </>
          )}
        </section>
        <AiAssistantPanel
          open={assistantOpen}
          selectedNode={selectedNode}
          onClose={closeAssistant}
          onImportRows={appendAiRows}
        />
      </div>
    </div>
  );
}
