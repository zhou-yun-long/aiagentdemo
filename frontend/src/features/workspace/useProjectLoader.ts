import { useCallback, useEffect } from 'react';
import { initialMindNodes } from '../../data/mindMap';
import { getMindmap, getProjectCases, getTreeifyApiMode, listProjects } from '../../shared/api/treeify';
import type { TestCaseDto } from '../../shared/types/treeify';
import type { MindNode } from '../../shared/types/workspace';
import { mindNodeFromDto, testCasesToMindNodes } from '../../shared/transforms/treeifyTransforms';
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

export function useProjectLoader() {
  const setNodes = useWorkspaceStore((state) => state.setNodes);
  const setPageStatus = useWorkspaceStore((state) => state.setPageStatus);
  const pageStatus = useWorkspaceStore((state) => state.pageStatus);
  const pageError = useWorkspaceStore((state) => state.pageError);

  const loadCasesFromCasesApi = useCallback(
    async (projectId: number, projectName: string) => {
      const cases = await getProjectCases(projectId);
      const nodes = buildNodeTree(projectName, cases);
      setNodes(nodes);
      setPageStatus(cases.length ? 'ready' : 'empty');
    },
    [setNodes, setPageStatus]
  );

  const loadCases = useCallback(
    async (projectId: number, projectName: string) => {
      try {
        const mindmapNodes = await getMindmap(projectId);
        if (mindmapNodes && mindmapNodes.length > 0) {
          const nodes = mindmapNodes.map(mindNodeFromDto);
          setNodes(nodes);
          setPageStatus('ready');
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
      setPageStatus('empty');
      return;
    }

    useWorkspaceStore.setState({ currentProjectId: activeProject.id });
    await loadCases(activeProject.id, activeProject.name);
  }, [loadCases, setNodes, setPageStatus]);

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
    const apiMode = getTreeifyApiMode();

    if (apiMode === 'mock') {
      setPageStatus('ready');
      return;
    }

    loadFromApi().catch((error) => {
      if (apiMode === 'real') {
        const message = error instanceof Error ? error.message : '加载项目数据失败';
        setPageStatus('error', message);
        return;
      }
      setPageStatus('ready');
    });
  }, [loadFromApi, setPageStatus]);

  return { reloadCases, pageStatus, pageError };
}
