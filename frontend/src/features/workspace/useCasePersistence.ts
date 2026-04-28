import { useEffect } from 'react';
import {
  deleteCase,
  getProjectCaseStats,
  getTreeifyApiMode,
  updateCase,
  updateCaseExecutionStatus
} from '../../shared/api/treeify';
import { buildTestCaseRequest, statsFromServer } from '../../shared/transforms/treeifyTransforms';
import { useWorkspaceStore } from './workspaceStore';

async function refreshStats(projectId: number) {
  const stats = await getProjectCaseStats(projectId);
  useWorkspaceStore.getState().setServerStats(statsFromServer(stats));
}

export function useCasePersistence() {
  const caseDirtyIds = useWorkspaceStore((state) => state.caseDirtyIds);
  const statusDirtyIds = useWorkspaceStore((state) => state.statusDirtyIds);
  const deletedCaseIds = useWorkspaceStore((state) => state.deletedCaseIds);
  const currentProjectId = useWorkspaceStore((state) => state.currentProjectId);

  useEffect(() => {
    if (!deletedCaseIds.length || !currentProjectId) {
      return;
    }

    const caseIds = [...deletedCaseIds];
    const numericCaseIds = caseIds.map(Number).filter((caseId) => Number.isFinite(caseId) && caseId > 0);

    if (getTreeifyApiMode() === 'mock' || numericCaseIds.length === 0) {
      useWorkspaceStore.getState().markDeletedCasesClean(caseIds);
      return;
    }

    let canceled = false;
    Promise.all(numericCaseIds.map((caseId) => deleteCase(caseId)))
      .then(() => {
        if (canceled) {
          return;
        }
        useWorkspaceStore.getState().markDeletedCasesClean(caseIds);
        return refreshStats(currentProjectId);
      })
      .catch(() => {
        // Leave IDs queued so a later user action or reload can retry.
      });

    return () => {
      canceled = true;
    };
  }, [deletedCaseIds, currentProjectId]);

  useEffect(() => {
    if (!statusDirtyIds.length || !currentProjectId) {
      return;
    }

    const timer = window.setTimeout(() => {
      const { nodes: latestNodes, statusDirtyIds: latestStatusDirtyIds, currentProjectId: latestProjectId } = useWorkspaceStore.getState();
      if (!latestProjectId) {
        return;
      }

      const requests = latestStatusDirtyIds
        .map((caseId) => {
          const numericCaseId = Number(caseId);
          const caseNode = latestNodes.find((node) => node.kind === 'case' && node.caseId === caseId);
          if (!Number.isFinite(numericCaseId) || numericCaseId <= 0 || !caseNode?.executionStatus) {
            return null;
          }
          return { caseId, numericCaseId, executionStatus: caseNode.executionStatus };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (getTreeifyApiMode() === 'mock' || requests.length === 0) {
        useWorkspaceStore.getState().markStatusCasesClean(latestStatusDirtyIds);
        return;
      }

      Promise.all(requests.map((item) => updateCaseExecutionStatus(item.numericCaseId, item.executionStatus)))
        .then(() => {
          useWorkspaceStore.getState().markStatusCasesClean(requests.map((item) => item.caseId));
          return refreshStats(latestProjectId);
        })
        .catch(() => {
          // Keep IDs queued so autosave can retry after the user makes another edit.
        });
    }, 600);

    return () => window.clearTimeout(timer);
  }, [statusDirtyIds, currentProjectId]);

  useEffect(() => {
    if (!caseDirtyIds.length || !currentProjectId) {
      return;
    }

    const timer = window.setTimeout(() => {
      const { nodes: latestNodes, caseDirtyIds: latestCaseDirtyIds, currentProjectId: latestProjectId } = useWorkspaceStore.getState();
      if (!latestProjectId) {
        return;
      }

      const caseIds = [...latestCaseDirtyIds];
      const requests = caseIds
        .map((caseId) => {
          const numericCaseId = Number(caseId);
          const body = buildTestCaseRequest(latestNodes, caseId);
          if (!Number.isFinite(numericCaseId) || numericCaseId <= 0 || !body) {
            return null;
          }
          return { caseId, numericCaseId, body };
        })
        .filter((item): item is NonNullable<typeof item> => Boolean(item));

      if (getTreeifyApiMode() === 'mock' || requests.length === 0) {
        useWorkspaceStore.getState().markCasesClean(caseIds);
        return;
      }

      Promise.all(
        requests.map((item) => updateCase(item.numericCaseId, item.body))
      )
        .then(() => {
          useWorkspaceStore.getState().markCasesClean(requests.map((item) => item.caseId));
          return refreshStats(latestProjectId);
        })
        .catch(() => {
          // Keep IDs queued so autosave can retry after the user makes another edit.
        });
    }, 900);

    return () => window.clearTimeout(timer);
  }, [caseDirtyIds, currentProjectId]);
}
