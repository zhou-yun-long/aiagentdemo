import { useEffect, useMemo, useState } from 'react';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { IntegrationPanel } from './components/IntegrationPanel';
import { KnowledgePanel } from './components/KnowledgePanel';
import { MindMapCanvas } from './components/MindMapCanvas';
import { OutlinePanel } from './components/OutlinePanel';
import { SelectionBar } from './components/SelectionBar';
import { SharePanel } from './components/SharePanel';
import { SnapshotPanel } from './components/SnapshotPanel';
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
      const expected =
        (step ? nodes.find((node) => node.parentId === step.id && node.kind === 'expected') : undefined) ||
        descendants.find((node) => node.kind === 'expected');

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
  const readOnly = useWorkspaceStore((state) => state.readOnly);
  const selectedId = useWorkspaceStore((state) => state.selectedId);
  const assistantOpen = useWorkspaceStore((state) => state.assistantOpen);
  const outlineOpen = useWorkspaceStore((state) => state.outlineOpen);
  const summaryOpen = useWorkspaceStore((state) => state.summaryOpen);
  const knowledgeOpen = useWorkspaceStore((state) => state.knowledgeOpen);
  const snapshotOpen = useWorkspaceStore((state) => state.snapshotOpen);
  const integrationOpen = useWorkspaceStore((state) => state.integrationOpen);
  const zoom = useWorkspaceStore((state) => state.zoom);
  const lastSnapshotAt = useWorkspaceStore((state) => state.lastSnapshotAt);
  const selectNode = useWorkspaceStore((state) => state.selectNode);
  const toggleCollapse = useWorkspaceStore((state) => state.toggleCollapse);
  const toggleTheme = useWorkspaceStore((state) => state.toggleTheme);
  const toggleAssistant = useWorkspaceStore((state) => state.toggleAssistant);
  const closeAssistant = useWorkspaceStore((state) => state.closeAssistant);
  const toggleOutline = useWorkspaceStore((state) => state.toggleOutline);
  const toggleSummary = useWorkspaceStore((state) => state.toggleSummary);
  const closeSummary = useWorkspaceStore((state) => state.closeSummary);
  const toggleKnowledge = useWorkspaceStore((state) => state.toggleKnowledge);
  const closeKnowledge = useWorkspaceStore((state) => state.closeKnowledge);
  const toggleSnapshot = useWorkspaceStore((state) => state.toggleSnapshot);
  const closeSnapshot = useWorkspaceStore((state) => state.closeSnapshot);
  const toggleIntegration = useWorkspaceStore((state) => state.toggleIntegration);
  const closeIntegration = useWorkspaceStore((state) => state.closeIntegration);
  const updateNode = useWorkspaceStore((state) => state.updateNode);
  const addChildNode = useWorkspaceStore((state) => state.addChildNode);
  const addSiblingNode = useWorkspaceStore((state) => state.addSiblingNode);
  const deleteSelectedNode = useWorkspaceStore((state) => state.deleteSelectedNode);
  const moveSelectedNode = useWorkspaceStore((state) => state.moveSelectedNode);
  const setZoom = useWorkspaceStore((state) => state.setZoom);
  const fitZoom = useWorkspaceStore((state) => state.fitZoom);
  const autoBalanceMap = useWorkspaceStore((state) => state.autoBalanceMap);
  const clearCanvas = useWorkspaceStore((state) => state.clearCanvas);
  const dirty = useWorkspaceStore((state) => state.dirty);
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId);
  const appendAiRows = useWorkspaceStore((state) => state.appendAiRows);
  const setNodes = useWorkspaceStore((state) => state.setNodes);
  const layoutVersion = useWorkspaceStore((state) => state.layoutVersion);
  const canUndo = useWorkspaceStore((state) => state.past.length > 0);
  const canRedo = useWorkspaceStore((state) => state.future.length > 0);
  const undo = useWorkspaceStore((state) => state.undo);
  const redo = useWorkspaceStore((state) => state.redo);

  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (isMod && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const { pageStatus, pageError, projects, switchProject } = useProjectLoader();
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

  const handleSnapshotRestore = (restoredNodes: MindNode[]) => {
    setNodes(restoredNodes);
    closeSnapshot();
  };

  const handleClearCanvas = () => {
    if (readOnly || nodes.length <= 1) {
      return;
    }

    const confirmed = window.confirm('确认清空画布？将删除中心主题之外的所有节点。');
    if (confirmed) {
      clearCanvas();
    }
  };

  return (
    <div className={`app ${theme}`}>
      {readOnly && (
        <div className="read-only-banner">
          只读模式 — 当前为分享视图，无法编辑
        </div>
      )}
      <Toolbar
        stats={stats}
        theme={theme}
        readOnly={readOnly}
        projects={projects}
        currentProjectId={currentProjectId}
        onSwitchProject={switchProject}
        assistantOpen={assistantOpen}
        onToggleAssistant={toggleAssistant}
        summaryOpen={summaryOpen}
        onToggleSummary={toggleSummary}
        knowledgeOpen={knowledgeOpen}
        onToggleKnowledge={toggleKnowledge}
        snapshotOpen={snapshotOpen}
        onToggleSnapshot={toggleSnapshot}
        outlineOpen={outlineOpen}
        onToggleOutline={toggleOutline}
        onToggleTheme={toggleTheme}
        onUndo={undo}
        canUndo={canUndo}
        onRedo={redo}
        canRedo={canRedo}
        onAddChild={addChildNode}
        onAddSibling={addSiblingNode}
        onDelete={deleteSelectedNode}
        onMoveUp={() => moveSelectedNode('up')}
        onMoveDown={() => moveSelectedNode('down')}
        onAutoBalanceMap={autoBalanceMap}
        onExportCases={handleExportCases}
        onToggleShare={() => setShareOpen((v) => !v)}
        onToggleIntegration={toggleIntegration}
        dirty={dirty}
        saving={saving}
        saveResult={saveResult}
        onSave={save}
        selectedId={selectedId}
        selectedFontFamily={selectedNode?.fontFamily}
        selectedFontSize={selectedNode?.fontSize}
        onUpdate={updateNode}
        onClearCanvas={handleClearCanvas}
        onFit={fitZoom}
        zoom={zoom}
        onZoomIn={() => setZoom(zoom + 0.1)}
        onZoomOut={() => setZoom(zoom - 0.1)}
      />
      <div className={`workspace ${assistantOpen && !readOnly ? '' : 'assistant-closed'} ${outlineOpen ? '' : 'outline-hidden'} ${summaryOpen ? 'summary-open' : ''} ${knowledgeOpen ? 'knowledge-open' : ''} ${snapshotOpen ? 'snapshot-open' : ''} ${integrationOpen ? 'integration-open' : ''}`}>
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
                layoutVersion={layoutVersion}
                onSelect={selectNode}
                onToggleCollapse={toggleCollapse}
                onZoomIn={() => setZoom(zoom + 0.1)}
                onZoomOut={() => setZoom(zoom - 0.1)}
                onFit={fitZoom}
                setZoom={setZoom}
              />
              <SelectionBar
                node={selectedNode}
                lastSnapshotAt={lastSnapshotAt}
                readOnly={readOnly}
                onUpdate={updateNode}
              />
            </>
          )}
        </section>
        {!readOnly && (
          <AiAssistantPanel
            open={assistantOpen}
            selectedNode={selectedNode}
            onClose={closeAssistant}
            onImportRows={appendAiRows}
          />
        )}
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
        {!readOnly && (
          <SnapshotPanel
            open={snapshotOpen}
            projectId={currentProjectId ?? getDefaultProjectId()}
            nodes={nodes}
            onClose={closeSnapshot}
            onRestore={handleSnapshotRestore}
          />
        )}
        {!readOnly && (
          <SharePanel
            open={shareOpen}
            projectId={currentProjectId ?? getDefaultProjectId()}
            onClose={() => setShareOpen(false)}
          />
        )}
        {!readOnly && (
          <IntegrationPanel
            open={integrationOpen}
            onClose={closeIntegration}
          />
        )}
      </div>
    </div>
  );
}
