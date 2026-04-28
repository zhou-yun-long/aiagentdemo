import { create } from 'zustand';
import { initialMindNodes } from '../../data/mindMap';
import type { ExecutionStatus, Lane, MindNode, NodeKind, Priority, ThemeMode, WorkspaceStats } from '../../shared/types/workspace';

const laneOrder: Lane[] = ['upper', 'middle', 'lower'];

export type PageStatus = 'loading' | 'ready' | 'empty' | 'error';

type WorkspaceState = {
  nodes: MindNode[];
  serverStats: WorkspaceStats | null;
  selectedId: string;
  theme: ThemeMode;
  assistantOpen: boolean;
  outlineOpen: boolean;
  summaryOpen: boolean;
  knowledgeOpen: boolean;
  snapshotOpen: boolean;
  zoom: number;
  lastSnapshotAt?: string;
  currentProjectId: number | null;
  pageStatus: PageStatus;
  pageError: string | null;
  dirty: boolean;
  caseDirtyIds: string[];
  statusDirtyIds: string[];
  deletedCaseIds: string[];
  selectNode: (id: string) => void;
  toggleTheme: () => void;
  toggleAssistant: () => void;
  closeAssistant: () => void;
  toggleOutline: () => void;
  toggleSummary: () => void;
  closeSummary: () => void;
  toggleKnowledge: () => void;
  closeKnowledge: () => void;
  toggleSnapshot: () => void;
  closeSnapshot: () => void;
  updateNode: (id: string, patch: Partial<MindNode>) => void;
  addChildNode: () => void;
  addSiblingNode: () => void;
  deleteSelectedNode: () => void;
  moveSelectedNode: (direction: 'up' | 'down') => void;
  setZoom: (zoom: number) => void;
  fitZoom: () => void;
  clearExecutionRecords: () => void;
  snapshotCurrentResult: () => void;
  appendAiRows: (rows: string[][]) => void;
  setNodes: (nodes: MindNode[]) => void;
  setServerStats: (stats: WorkspaceStats | null) => void;
  setPageStatus: (status: PageStatus, error?: string) => void;
  markClean: () => void;
  markCasesClean: (caseIds: string[]) => void;
  markStatusCasesClean: (caseIds: string[]) => void;
  markDeletedCasesClean: (caseIds: string[]) => void;
};

function cloneNodes(nodes: MindNode[]) {
  return nodes.map((node) => ({ ...node, tags: node.tags ? [...node.tags] : undefined }));
}

function createNodeId(kind: NodeKind) {
  return `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getDescendantIds(nodes: MindNode[], id: string) {
  const ids = new Set<string>([id]);
  let changed = true;

  while (changed) {
    changed = false;
    nodes.forEach((node) => {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    });
  }

  return ids;
}

function appendUnique(items: string[], additions: string[]) {
  return Array.from(new Set([...items, ...additions]));
}

function getDirtyCaseIdsForNode(nodes: MindNode[], nodeId: string) {
  const node = nodes.find((item) => item.id === nodeId);
  return node?.caseId ? [node.caseId] : [];
}

function getDeletedCaseIds(nodes: MindNode[], deleteIds: Set<string>) {
  return nodes
    .filter((node) => deleteIds.has(node.id) && node.kind === 'case' && node.caseId)
    .map((node) => node.caseId as string);
}

function getNextOrder(nodes: MindNode[], parentId: string | undefined, lane: Lane, depth: number) {
  const siblingOrders = nodes
    .filter((node) => node.parentId === parentId && node.lane === lane && node.depth === depth)
    .map((node) => node.order);

  return siblingOrders.length ? Math.max(...siblingOrders) + 1 : 0;
}

function getChildKind(parent: MindNode): NodeKind {
  if (parent.kind === 'root') {
    return 'group';
  }
  if (parent.kind === 'group') {
    return 'case';
  }
  if (parent.kind === 'step') {
    return 'expected';
  }
  return 'step';
}

function getDefaultTitle(kind: NodeKind) {
  const titles: Record<NodeKind, string> = {
    root: '中心主题',
    group: '新增功能模块',
    case: '新增测试用例',
    condition: '新增前置条件',
    step: '新增执行步骤',
    expected: '新增预期结果'
  };

  return titles[kind];
}

function getDefaultTags(kind: NodeKind) {
  if (kind === 'condition') {
    return ['前置条件'];
  }
  if (kind === 'step') {
    return ['执行步骤'];
  }
  if (kind === 'expected') {
    return ['预期结果'];
  }
  return undefined;
}

function makeNode(kind: NodeKind, parent: MindNode | undefined, lane: Lane, depth: number, order: number): MindNode {
  return {
    id: createNodeId(kind),
    parentId: parent?.id,
    title: getDefaultTitle(kind),
    kind,
    priority: kind === 'group' || kind === 'case' ? 'P1' : undefined,
    tags: getDefaultTags(kind),
    ai: false,
    status: kind === 'case' ? 'warn' : undefined,
    executionStatus: kind === 'case' ? 'not_run' : undefined,
    source: 'manual',
    version: 1,
    lane,
    depth,
    order
  };
}

function readPriority(value: string | undefined): Priority {
  return value === 'P0' || value === 'P1' || value === 'P2' || value === 'P3' ? value : 'P1';
}

function compareLayout(a: MindNode, b: MindNode) {
  const laneDelta = laneOrder.indexOf(a.lane) - laneOrder.indexOf(b.lane);
  return laneDelta || a.order - b.order || a.depth - b.depth;
}

export function getWorkspaceStats(nodes: MindNode[]): WorkspaceStats {
  const caseNodes = nodes.filter((node) => node.kind === 'case');
  const testedStatuses: ExecutionStatus[] = ['passed', 'failed', 'blocked', 'skipped'];
  const testedCases = caseNodes.filter((node) => node.executionStatus && testedStatuses.includes(node.executionStatus)).length;
  const passedCases = caseNodes.filter((node) => node.executionStatus === 'passed').length;
  const failedCases = caseNodes.filter((node) => node.executionStatus === 'failed').length;

  return {
    totalCases: caseNodes.length,
    testedCases,
    passedCases,
    failedCases,
    passRate: caseNodes.length ? Math.round((passedCases / caseNodes.length) * 10000) / 100 : 0
  };
}

function getCaseParent(nodes: MindNode[], selectedId: string) {
  const selected = nodes.find((node) => node.id === selectedId);
  const root = nodes.find((node) => node.kind === 'root');

  if (!selected) {
    return root;
  }

  if (selected.kind === 'group' || selected.kind === 'root') {
    return selected;
  }

  if (selected.kind === 'case') {
    return nodes.find((node) => node.id === selected.parentId) || root;
  }

  const ownerCase = nodes.find((node) => getDescendantIds(nodes, node.id).has(selected.id) && node.kind === 'case');
  return ownerCase ? nodes.find((node) => node.id === ownerCase.parentId) || root : root;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  nodes: cloneNodes(initialMindNodes),
  serverStats: null,
  selectedId: 'success-steps',
  theme: 'light',
  assistantOpen: true,
  outlineOpen: true,
  summaryOpen: false,
  knowledgeOpen: false,
  snapshotOpen: false,
  zoom: 1,
  currentProjectId: null,
  pageStatus: 'loading',
  pageError: null,
  dirty: false,
  caseDirtyIds: [],
  statusDirtyIds: [],
  deletedCaseIds: [],
  selectNode: (id) => set({ selectedId: id }),
  toggleTheme: () => set((state) => ({ theme: state.theme === 'light' ? 'dark' : 'light' })),
  toggleAssistant: () => set((state) => ({ assistantOpen: !state.assistantOpen })),
  closeAssistant: () => set({ assistantOpen: false }),
  toggleOutline: () => set((state) => ({ outlineOpen: !state.outlineOpen })),
  toggleSummary: () => set((state) => ({ summaryOpen: !state.summaryOpen })),
  closeSummary: () => set({ summaryOpen: false }),
  toggleKnowledge: () => set((state) => ({ knowledgeOpen: !state.knowledgeOpen })),
  closeKnowledge: () => set({ knowledgeOpen: false }),
  toggleSnapshot: () => set((state) => ({ snapshotOpen: !state.snapshotOpen })),
  closeSnapshot: () => set({ snapshotOpen: false }),
  updateNode: (id, patch) =>
    set((state) => {
      const dirtyCaseIds = getDirtyCaseIdsForNode(state.nodes, id);
      const patchKeys = Object.keys(patch);
      const statusOnly = patchKeys.length === 1 && patchKeys[0] === 'executionStatus';
      return {
        nodes: state.nodes.map((node) =>
          node.id === id
            ? {
                ...node,
                ...patch,
                status:
                  patch.executionStatus === 'passed'
                    ? 'pass'
                    : patch.executionStatus === 'failed'
                      ? 'fail'
                      : patch.executionStatus
                        ? 'warn'
                        : node.status,
                version: (node.version || 1) + 1
              }
            : node
        ),
        dirty: true,
        caseDirtyIds: statusOnly ? state.caseDirtyIds : appendUnique(state.caseDirtyIds, dirtyCaseIds),
        statusDirtyIds: statusOnly ? appendUnique(state.statusDirtyIds, dirtyCaseIds) : state.statusDirtyIds
      };
    }),
  addChildNode: () =>
    set((state) => {
      const parent = state.nodes.find((node) => node.id === state.selectedId);
      if (!parent) {
        return state;
      }

      const kind = getChildKind(parent);
      const lane = parent.kind === 'root' ? 'middle' : parent.lane;
      const depth = parent.depth + 1;
      const order = getNextOrder(state.nodes, parent.id, lane, depth);
      const node = makeNode(kind, parent, lane, depth, order);

      return {
        nodes: [...state.nodes, node],
        selectedId: node.id,
        dirty: true
      };
    }),
  addSiblingNode: () =>
    set((state) => {
      const selected = state.nodes.find((node) => node.id === state.selectedId);
      if (!selected || selected.kind === 'root') {
        const root = state.nodes.find((node) => node.kind === 'root');
        if (!root) {
          return state;
        }
        const node = makeNode('group', root, 'middle', 1, getNextOrder(state.nodes, root.id, 'middle', 1));
        return { nodes: [...state.nodes, node], selectedId: node.id, dirty: true };
      }

      const parent = state.nodes.find((node) => node.id === selected.parentId);
      const order = getNextOrder(state.nodes, selected.parentId, selected.lane, selected.depth);
      const node = makeNode(selected.kind, parent, selected.lane, selected.depth, order);

      return {
        nodes: [...state.nodes, node],
        selectedId: node.id,
        dirty: true
      };
    }),
  deleteSelectedNode: () =>
    set((state) => {
      const selected = state.nodes.find((node) => node.id === state.selectedId);
      if (!selected || selected.kind === 'root') {
        return state;
      }

      const deleteIds = getDescendantIds(state.nodes, selected.id);
      return {
        nodes: state.nodes.filter((node) => !deleteIds.has(node.id)),
        selectedId: selected.parentId || 'root',
        dirty: true,
        deletedCaseIds: appendUnique(state.deletedCaseIds, getDeletedCaseIds(state.nodes, deleteIds))
      };
    }),
  moveSelectedNode: (direction) =>
    set((state) => {
      const selected = state.nodes.find((node) => node.id === state.selectedId);
      if (!selected || selected.kind === 'root') {
        return state;
      }

      const siblings = state.nodes.filter((node) => node.parentId === selected.parentId).sort(compareLayout);
      const index = siblings.findIndex((node) => node.id === selected.id);
      const target = siblings[index + (direction === 'up' ? -1 : 1)];

      if (!target) {
        return state;
      }

      const selectedIds = getDescendantIds(state.nodes, selected.id);
      const targetIds = getDescendantIds(state.nodes, target.id);

      return {
        nodes: state.nodes.map((node) => {
          if (selectedIds.has(node.id)) {
            return {
              ...node,
              lane: target.lane,
              order: node.id === selected.id ? target.order : node.order
            };
          }
          if (targetIds.has(node.id)) {
            return {
              ...node,
              lane: selected.lane,
              order: node.id === target.id ? selected.order : node.order
            };
          }
          return node;
        }),
        dirty: true
      };
    }),
  setZoom: (zoom) => set({ zoom: Math.min(1.4, Math.max(0.6, Math.round(zoom * 10) / 10)) }),
  fitZoom: () => set({ zoom: 0.8 }),
  clearExecutionRecords: () =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.kind === 'case'
          ? {
              ...node,
              executionStatus: 'not_run'
            }
          : node
      ),
      dirty: true,
      statusDirtyIds: appendUnique(
        state.statusDirtyIds,
        state.nodes.filter((node) => node.kind === 'case' && node.caseId).map((node) => node.caseId as string)
      )
    })),
  snapshotCurrentResult: () =>
    set({
      lastSnapshotAt: new Date().toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
      })
    }),
  appendAiRows: (rows) =>
    set((state) => {
      const parent = getCaseParent(state.nodes, state.selectedId);
      if (!parent) {
        return state;
      }

      const createdNodes = rows.flatMap((row, index) => {
        const lane = laneOrder[index % laneOrder.length];
        const caseDepth = parent.depth + 1;
        const order = getNextOrder([...state.nodes], parent.id, lane, caseDepth) + Math.floor(index / laneOrder.length);
        const caseNode: MindNode = {
          id: createNodeId('case'),
          parentId: parent.id,
          title: row[0] || 'AI 生成测试用例',
          kind: 'case',
          priority: readPriority(row[4]),
          tags: ['AI'],
          ai: true,
          status: 'warn',
          executionStatus: 'not_run',
          source: 'ai',
          version: 1,
          lane,
          depth: caseDepth,
          order
        };
        const conditionNode: MindNode = {
          id: createNodeId('condition'),
          parentId: caseNode.id,
          title: row[1] || '补充前置条件',
          kind: 'condition',
          tags: ['前置条件', 'AI'],
          ai: true,
          source: 'ai',
          version: 1,
          lane,
          depth: caseDepth + 1,
          order
        };
        const stepNode: MindNode = {
          id: createNodeId('step'),
          parentId: caseNode.id,
          title: row[2] || '补充执行步骤',
          kind: 'step',
          tags: ['执行步骤', 'AI'],
          ai: true,
          source: 'ai',
          version: 1,
          lane,
          depth: caseDepth + 2,
          order
        };
        const expectedNode: MindNode = {
          id: createNodeId('expected'),
          parentId: stepNode.id,
          title: row[3] || '补充预期结果',
          kind: 'expected',
          tags: ['预期结果', 'AI'],
          ai: true,
          source: 'ai',
          version: 1,
          lane,
          depth: caseDepth + 3,
          order
        };

        return [caseNode, conditionNode, stepNode, expectedNode];
      });

      return {
        nodes: [...state.nodes, ...createdNodes],
        selectedId: createdNodes[0]?.id || state.selectedId,
        dirty: true
      };
    }),
  setNodes: (nodes) => set({ nodes: cloneNodes(nodes), dirty: false, caseDirtyIds: [], statusDirtyIds: [], deletedCaseIds: [] }),
  setServerStats: (stats) => set({ serverStats: stats }),
  setPageStatus: (status, error) => set({ pageStatus: status, pageError: error ?? null }),
  markClean: () => set({ dirty: false }),
  markCasesClean: (caseIds) =>
    set((state) => ({
      caseDirtyIds: state.caseDirtyIds.filter((caseId) => !caseIds.includes(caseId))
    })),
  markStatusCasesClean: (caseIds) =>
    set((state) => ({
      statusDirtyIds: state.statusDirtyIds.filter((caseId) => !caseIds.includes(caseId))
    })),
  markDeletedCasesClean: (caseIds) =>
    set((state) => ({
      deletedCaseIds: state.deletedCaseIds.filter((caseId) => !caseIds.includes(caseId))
    }))
}));
