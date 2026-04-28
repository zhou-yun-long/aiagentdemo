import { useMemo } from 'react';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { KnowledgePanel } from './components/KnowledgePanel';
import { MindMapCanvas } from './components/MindMapCanvas';
import { OutlinePanel } from './components/OutlinePanel';
import { SelectionBar } from './components/SelectionBar';
import { SummaryPanel } from './components/SummaryPanel';
import { Toolbar } from './components/Toolbar';
import { getDescendantIds, getWorkspaceStats, useWorkspaceStore } from './features/workspace/workspaceStore';
import { getDefaultProjectId } from './shared/api/treeify';
import { exportCases, type ExportCase, type ExportFormat } from './utils/exportCases';
import { useCasePersistence } from './features/workspace/useCasePersistence';
import { useMindmapSave } from './features/workspace/useMindmapSave';
import { useProjectLoader } from './features/workspace/useProjectLoader';
import { useWorkspaceAutosave } from './features/workspace/useWorkspaceAutosave';
import type { MindNode } from './shared/types/workspace';

function buildCaseExport(nodes: MindNode[]) {
  return nodes
    .filter((node) => node.kind === 'case')
    .map((caseNode) => {
      const descendantIds = getDescendantIds(nodes, caseNode.id);
      const descendants = nodes.filter((node) => descendantIds.has(node.id));
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
  const serverStats = useWorkspaceStore((state) => state.serverStats);
  const theme = useWorkspaceStore((state) => state.theme);
  const selectedId = useWorkspaceStore((state) => state.selectedId);
  const assistantOpen = useWorkspaceStore((state) => state.assistantOpen);
  const outlineOpen = useWorkspaceStore((state) => state.outlineOpen);
  const summaryOpen = useWorkspaceStore((state) => state.summaryOpen);
  const knowledgeOpen = useWorkspaceStore((state) => state.knowledgeOpen);
  const zoom = useWorkspaceStore((state) => state.zoom);
  const lastSnapshotAt = useWorkspaceStore((state) => state.lastSnapshotAt);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const toggleTheme = useWorkspaceStore((state) => state.toggleTheme);
  const toggleAssistant = useWorkspaceStore((state) => state.toggleAssistant);
  const closeAssistant = useWorkspaceStore((state) => state.closeAssistant);
  const toggleOutline = useWorkspaceStore((state) => state.toggleOutline);
  const toggleSummary = useWorkspaceStore((state) => state.toggleSummary);
  const closeSummary = useWorkspaceStore((state) => state.closeSummary);
  const toggleKnowledge = useWorkspaceStore((state) => state.toggleKnowledge);
  const closeKnowledge = useWorkspaceStore((state) => state.closeKnowledge);
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
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId);
  const appendAiRows = useWorkspaceStore((state) => state.appendAiRows);

  const { pageStatus, pageError } = useProjectLoader();
  const { save, saving, saveResult } = useMindmapSave();
  useCasePersistence();
  useWorkspaceAutosave();

  const selectedNode = nodes.find((node) => node.id === selectedId);
  const localStats = useMemo(() => getWorkspaceStats(nodes), [nodes]);
  const stats = serverStats || localStats;

  const handleExportCases = (format: ExportFormat) => {
    const cases: ExportCase[] = buildCaseExport(nodes);
    exportCases(cases, format);
  };

  return (
    <div className={`app ${theme}`}>
      <Toolbar
        stats={stats}
        theme={theme}
        assistantOpen={assistantOpen}
        onToggleAssistant={toggleAssistant}
        summaryOpen={summaryOpen}
        onToggleSummary={toggleSummary}
        knowledgeOpen={knowledgeOpen}
        onToggleKnowledge={toggleKnowledge}
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
      <div className={`workspace ${assistantOpen ? '' : 'assistant-closed'} ${outlineOpen ? '' : 'outline-hidden'} ${summaryOpen ? 'summary-open' : ''} ${knowledgeOpen ? 'knowledge-open' : ''}`}>
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
        <SummaryPanel
          open={summaryOpen}
          projectId={currentProjectId ?? getDefaultProjectId()}
          onClose={closeSummary}
        />
        <KnowledgePanel
          open={knowledgeOpen}
          projectId={currentProjectId ?? getDefaultProjectId()}
          onClose={closeKnowledge}
        />
      </div>
    </div>
  );
}
