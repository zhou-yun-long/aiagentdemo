import { useCallback, useEffect, useRef } from 'react';
import type { GeneratedCaseDraft, GenerationMode, GenerateStage, TaskKind } from '../../types/generation';

/** Convert simple {score, issues} to CriticVisualReport if the LLM didn't return the rich format. */
function toCriticVisualReport(raw: unknown): import('../../types/generation').CriticVisualReport | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  // Already rich format
  if ('overallScore' in obj && Array.isArray(obj.dimensions)) return obj as unknown as import('../../types/generation').CriticVisualReport;
  // Simple format: {score, issues, retryCount}
  if ('score' in obj && typeof obj.score === 'number') {
    const score = obj.score as number;
    const issues = Array.isArray(obj.issues) ? (obj.issues as string[]) : [];
    const issuesText = issues.length ? issues.join('；') : '未返回具体问题';
    return {
      overallScore: score,
      dimensions: [
        { key: 'coverage', label: '覆盖完整度', score: Math.min(100, score + 3), status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'danger', summary: issuesText.slice(0, 60) },
        { key: 'priority', label: '优先级合理性', score: Math.min(100, score - 2), status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'danger', summary: '基于总分推算' },
        { key: 'executability', label: '可执行性', score: Math.min(100, score + 1), status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'danger', summary: '基于总分推算' },
        { key: 'clarity', label: '表达清晰度', score: Math.min(100, score + 2), status: score >= 80 ? 'good' : score >= 60 ? 'warning' : 'danger', summary: '基于总分推算' },
        { key: 'risk', label: '风险控制', score: Math.max(0, score - 10), status: score >= 80 ? 'warning' : 'danger', summary: issuesText.slice(0, 60) }
      ],
      coverageMatrix: [],
      priorityDistribution: { P0: 0, P1: 0, P2: 0, P3: 0 },
      risks: issues.map((issue) => ({ level: score < 70 ? 'high' : 'medium' as const, title: issue.slice(0, 40), suggestion: issue })),
      improvements: issues.slice(0, 5)
    };
  }
  return null;
}
import {
  cancelGenerateTask,
  confirmGenerateTask,
  createGenerateTask,
  getDefaultProjectId,
  getGenerateStreamUrl
} from '../../shared/api/treeify';
import type { GenerateSseEventDto, GenerationAttachmentRequest } from '../../shared/types/treeify';
import {
  generatedCaseDtosToDrafts,
  getStageNeedConfirm,
  getStagePayloadContent,
  getStagePayloadResult,
  isGenerateStage
} from '../../shared/transforms/treeifyTransforms';
import { useGenerationStore } from './generationStore';
import { useWorkspaceStore } from '../workspace/workspaceStore';
import { buildTraceGraphFromArtifacts } from '../../utils/traceGraph';

function refreshTraceGraph(projectId?: number) {
  const state = useGenerationStore.getState();
  const pid = projectId || useWorkspaceStore.getState().currentProjectId || getDefaultProjectId();
  const graph = buildTraceGraphFromArtifacts(
    pid,
    state.taskId,
    state.artifacts,
    state.cases
  );
  useGenerationStore.getState().setTraceGraph(graph || undefined);
}

function parseSseEvent(raw: MessageEvent<string>): GenerateSseEventDto | null {
  try {
    return JSON.parse(raw.data) as GenerateSseEventDto;
  } catch {
    return null;
  }
}

export function useGenerateStream() {
  const eventSourceRef = useRef<EventSource | null>(null);
  const expectedCloseRef = useRef(false);

  const closeEventSource = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  const applyEvent = useCallback((event: GenerateSseEventDto) => {
    const stage = isGenerateStage(event.stage) ? event.stage : null;

    if (event.event === 'stage_started' && stage) {
      useGenerationStore.getState().stageStarted(stage);
      return;
    }

    if (event.event === 'stage_chunk' && stage) {
      useGenerationStore.getState().appendStageChunk(stage, getStagePayloadContent(event.payload));
      return;
    }

    if (event.event === 'stage_done' && stage) {
      useGenerationStore.getState().stageDone(stage, getStagePayloadResult(event.payload), getStageNeedConfirm(event.payload));

      if (stage === 'critic') {
        try {
          const result = event.payload?.result;
          const report = toCriticVisualReport(result);
          if (report) {
            useGenerationStore.getState().setCriticReport(report);
          }
        } catch { /* fallback to string display */ }
      }
      return;
    }

    if (event.event === 'generation_complete') {
      const criticScore = typeof event.payload.criticScore === 'number' ? event.payload.criticScore : 0;
      useGenerationStore.getState().completeGeneration(criticScore, generatedCaseDtosToDrafts(event.payload.cases));
      refreshTraceGraph((event.payload as { projectId?: number }).projectId);
      closeEventSource();
      return;
    }

    if (event.event === 'points_complete') {
      const points = Array.isArray(event.payload.points) ? event.payload.points : [];
      useGenerationStore.getState().setPointsResult({ points });
      closeEventSource();
    }
  }, [closeEventSource]);

  const openStream = useCallback(
    (streamUrl: string) => {
      closeEventSource();
      expectedCloseRef.current = false;

      const eventSource = new EventSource(streamUrl);
      eventSourceRef.current = eventSource;
      eventSource.onmessage = (message) => {
        const event = parseSseEvent(message);
        if (!event) {
          return;
        }

        applyEvent(event);

        if (event.event === 'stage_done' && getStageNeedConfirm(event.payload)) {
          expectedCloseRef.current = true;
          closeEventSource();
        }
      };
      eventSource.onerror = () => {
        if (expectedCloseRef.current) {
          expectedCloseRef.current = false;
          closeEventSource();
          return;
        }

        const status = useGenerationStore.getState().status;
        if (status !== 'done' && status !== 'cancelled' && status !== 'waiting_confirm') {
          useGenerationStore.getState().failTask('SSE 连接中断，请检查后端服务。');
        }
        closeEventSource();
      };
    },
    [applyEvent, closeEventSource]
  );

  const startGeneration = useCallback(
    async (input: string, mode: GenerationMode, attachments: GenerationAttachmentRequest[] = [], taskKind?: TaskKind) => {
      closeEventSource();

      const { currentProjectId, nodes, selectedId } = useWorkspaceStore.getState();
      const contextCaseIds = Array.from(
        new Set(
          nodes
            .filter((node) => node.kind === 'case' && node.caseId)
            .map((node) => Number(node.caseId))
            .filter((caseId) => Number.isFinite(caseId) && caseId > 0)
        )
      );

      try {
        const task = await createGenerateTask(currentProjectId || getDefaultProjectId(), {
          mode,
          input,
          taskKind,
          selectedNodeId: selectedId,
          contextCaseIds,
          attachments
        });

        useGenerationStore.getState().beginTask(task.taskId, input, mode);
        openStream(getGenerateStreamUrl(task));
      } catch (error) {
        const message = error instanceof Error ? error.message : '创建生成任务失败';
        useGenerationStore.getState().failTask(message);
      }
    },
    [closeEventSource, openStream]
  );

  const retryGeneration = useCallback(() => {
    const { taskId } = useGenerationStore.getState();
    if (!taskId) return;

    useGenerationStore.getState().retryTask();

    // Re-open SSE stream for the existing task — backend resumes from last persisted stage
    const streamUrl = `/api/v1/generate/${taskId}/stream`;
    openStream(streamUrl);
  }, [openStream]);

  const confirmCurrentStage = useCallback(async (feedback?: string) => {
    const { activeStage, taskId } = useGenerationStore.getState();
    if (!activeStage || !taskId) {
      return;
    }

    try {
      const task = await confirmGenerateTask(taskId, { stage: activeStage, feedback });
      useGenerationStore.getState().confirmCurrentStage();
      openStream(getGenerateStreamUrl(task));
    } catch (error) {
      const message = error instanceof Error ? error.message : '确认阶段失败，请重试';
      useGenerationStore.getState().failTask(message);
    }
  }, [openStream]);

  const cancelGeneration = useCallback(async () => {
    const { taskId } = useGenerationStore.getState();
    expectedCloseRef.current = true;
    closeEventSource();

    if (taskId) {
      await cancelGenerateTask(taskId).catch(() => undefined);
    }

    useGenerationStore.getState().cancelTask();
  }, [closeEventSource]);

  useEffect(
    () => () => {
      closeEventSource();
    },
    [closeEventSource]
  );

  return {
    startGeneration,
    confirmCurrentStage,
    cancelGeneration,
    retryGeneration
  };
}
