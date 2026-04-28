import { useCallback, useEffect } from 'react';
import { initialMindNodes } from '../../data/mindMap';
import { getMindmap, getProjectCases, getProjectCaseStats, getTreeifyApiMode, listProjects } from '../../shared/api/treeify';
import type { TestCaseDto } from '../../shared/types/treeify';
import type { MindNode } from '../../shared/types/workspace';
import { mindNodeFromDto, statsFromServer, testCasesToMindNodes } from '../../shared/transforms/treeifyTransforms';
import { useWorkspaceStore } from './workspaceStore';

function buildNodeTree(projectName: string, cases: TestCaseDto[]): MindNode[] {
  const root: MindNode = {
    id: 'root',
    title: projectName,
    kind: 'root',
    source: 'manual',
    version: 1,
    lane: 'middle',
    depth: 0,
    order: 0
  };

  const group: MindNode = {
    id: 'default-group',
    parentId: 'root',
    title: '默认模块',
    kind: 'group',
    priority: 'P1',
    source: 'manual',
    version: 1,
    lane: 'middle',
    depth: 1,
    order: 0
  };

  if (!cases.length) {
    return [root, group];
  }

  const caseNodes = testCasesToMindNodes(cases).map((node) => {
    if (node.kind === 'case' && !node.parentId) {
      return { ...node, parentId: group.id, depth: 2 };
    }
    return node;
  });

  return [root, group, ...caseNodes];
}

function normalizeMindmapTree(projectName: string, nodes: MindNode[]): MindNode[] {
  const existingRoot = nodes.find((node) => node.kind === 'root');
  const root: MindNode =
    existingRoot ?? {
      id: 'root',
      title: projectName,
      kind: 'root',
      source: 'manual',
      version: 1,
      lane: 'middle',
      depth: 0,
      order: 0
    };

  const existingGroup = nodes.find((node) => node.kind === 'group');
  const group: MindNode =
    existingGroup ?? {
      id: 'default-group',
      parentId: root.id,
      title: '默认模块',
      kind: 'group',
      priority: 'P1',
      source: 'manual',
      version: 1,
      lane: 'middle',
      depth: 1,
      order: 0
    };

  const normalizedNodes = nodes.map((node) => {
    if (node.id === root.id) {
      return { ...node, parentId: undefined, depth: 0 };
    }

    if (node.kind === 'group' && !node.parentId) {
      return { ...node, parentId: root.id, depth: 1 };
    }

    if (node.kind === 'case' && !node.parentId) {
      return { ...node, parentId: group.id, depth: Math.max(node.depth, group.depth + 1) };
    }

    return node;
  });

  return [
    ...(existingRoot ? [] : [root]),
    ...(existingGroup ? [] : [group]),
    ...normalizedNodes
  ];
}

export function useProjectLoader() {
  const setNodes = useWorkspaceStore((state) => state.setNodes);
  const setServerStats = useWorkspaceStore((state) => state.setServerStats);
  const setPageStatus = useWorkspaceStore((state) => state.setPageStatus);
  const pageStatus = useWorkspaceStore((state) => state.pageStatus);
  const pageError = useWorkspaceStore((state) => state.pageError);
  const readOnly = useWorkspaceStore((state) => state.readOnly);

  const loadCasesFromCasesApi = useCallback(
    async (projectId: number, projectName: string) => {
      const cases = await getProjectCases(projectId);
      const nodes = buildNodeTree(projectName, cases);
      setNodes(nodes);
      setPageStatus(cases.length ? 'ready' : 'empty');
      getProjectCaseStats(projectId)
        .then((stats) => setServerStats(statsFromServer(stats)))
        .catch(() => setServerStats(null));
    },
    [setNodes, setPageStatus, setServerStats]
  );

  const loadCases = useCallback(
    async (projectId: number, projectName: string) => {
      try {
        const mindmapNodes = await getMindmap(projectId);
        if (mindmapNodes && mindmapNodes.length > 0) {
          const nodes = normalizeMindmapTree(projectName, mindmapNodes.map(mindNodeFromDto));
          setNodes(nodes);
          setPageStatus('ready');
          getProjectCaseStats(projectId)
            .then((stats) => setServerStats(statsFromServer(stats)))
            .catch(() => setServerStats(null));
          return;
        }
      } catch {
        // mindmap not available, fall through to cases API
      }
      await loadCasesFromCasesApi(projectId, projectName);
    },
    [setNodes, setPageStatus, loadCasesFromCasesApi]
  );

  const loadFromApi = useCallback(async () => {
    const projects = await listProjects();
    const activeProject = projects.find((project) => project.status === 'active');

    if (!activeProject) {
      setNodes(initialMindNodes);
      setServerStats(null);
      setPageStatus('empty');
      return;
    }

    useWorkspaceStore.setState({ currentProjectId: activeProject.id });
    await loadCases(activeProject.id, activeProject.name);
  }, [loadCases, setNodes, setPageStatus, setServerStats]);

  const reloadCases = useCallback(async () => {
    const projectId = useWorkspaceStore.getState().currentProjectId;
    if (!projectId) {
      return;
    }

    try {
      const projects = await listProjects();
      const project = projects.find((project) => project.id === projectId);
      if (!project) {
        return;
      }
      await loadCases(projectId, project.name);
    } catch {
      setPageStatus('error', '刷新用例列表失败');
    }
  }, [loadCases, setPageStatus]);

  useEffect(() => {
    if (readOnly) {
      return;
    }

    const apiMode = getTreeifyApiMode();

    if (apiMode === 'mock') {
      setPageStatus('ready');
      setServerStats(null);
      return;
    }

    loadFromApi().catch((error) => {
      if (apiMode === 'real') {
        const message = error instanceof Error ? error.message : '加载项目数据失败';
        setPageStatus('error', message);
        return;
      }
      setPageStatus('ready');
      setServerStats(null);
    });
  }, [readOnly, loadFromApi, setPageStatus, setServerStats]);

  return { reloadCases, pageStatus, pageError };
}
