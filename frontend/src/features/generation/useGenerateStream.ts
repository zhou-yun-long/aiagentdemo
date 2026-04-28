import { useCallback, useEffect, useRef } from 'react';
import type { GeneratedCaseDraft, GenerationMode, GenerateStage } from '../../types/generation';
import {
  cancelGenerateTask,
  confirmGenerateTask,
  createGenerateTask,
  getDefaultProjectId,
  getGenerateStreamUrl,
  getTreeifyApiMode
} from '../../shared/api/treeify';
import type { GenerateSseEventDto } from '../../shared/types/treeify';
import {
  generatedCaseDtosToDrafts,
  getStageNeedConfirm,
  getStagePayloadContent,
  getStagePayloadResult,
  isGenerateStage
} from '../../shared/transforms/treeifyTransforms';
import { useGenerationStore } from './generationStore';
import { useWorkspaceStore } from '../workspace/workspaceStore';

type Timer = ReturnType<typeof window.setTimeout>;

const stageOrder: GenerateStage[] = ['e1', 'e2', 'e3'];

const mockChunks: Record<GenerateStage, string[]> = {
  e1: [
    '识别主流程：手机号登录、密码校验、登录成功跳转。\n',
    '识别异常约束：手机号格式、密码长度、错误密码提示。\n',
    '识别风控规则：连续失败 5 次后账号临时锁定。\n'
  ],
  e2: [
    '拆解正向路径：合法手机号 + 合法密码 -> 登录成功。\n',
    '拆解输入校验：手机号为空、位数不足、密码为空、密码过短。\n',
    '拆解安全边界：错误密码累计、锁定后再次登录、锁定恢复提示。\n'
  ],
  e3: [
    '生成 P0 用例：正确手机号密码登录成功。\n',
    '生成 P1 用例：手机号格式错误、密码长度非法、错误密码提示。\n',
    '生成 P1 安全用例：连续 5 次失败后锁定账号。\n'
  ],
  critic: ['']
};

const mockResults: Record<GenerateStage, string> = {
  e1: '需求边界已收敛为登录主流程、输入校验、失败锁定三类能力。',
  e2: '测试场景覆盖正向、异常输入、安全限制和恢复提示。',
  e3: '已生成 4 条候选用例，覆盖 P0/P1 核心路径。',
  critic: '质量评分完成。'
};

function makeCaseId(index: number) {
  return `draft-${Date.now().toString(36)}-${index}`;
}

function buildMockCases(): GeneratedCaseDraft[] {
  return [
    {
      id: makeCaseId(1),
      title: '正确手机号密码登录成功',
      precondition: '用户已注册有效手机号，账号状态正常',
      steps: ['打开登录页', '输入合法手机号和正确密码', '点击登录按钮'],
      expected: '登录成功并跳转到系统首页',
      priority: 'P0',
      tags: ['Web', 'AI'],
      source: 'ai',
      pathType: 'happy'
    },
    {
      id: makeCaseId(2),
      title: '手机号格式错误时阻止提交',
      precondition: '系统处于正常运行状态',
      steps: ['打开登录页', '输入不足 11 位手机号', '输入合法密码并提交'],
      expected: '页面提示手机号格式不正确，登录请求不提交',
      priority: 'P1',
      tags: ['Web', 'AI'],
      source: 'ai',
      pathType: 'boundary'
    },
    {
      id: makeCaseId(3),
      title: '密码长度低于 6 位时提示失败',
      precondition: '用户停留在登录页',
      steps: ['输入合法手机号', '输入 5 位密码', '点击登录按钮'],
      expected: '页面提示密码长度需为 6-20 位',
      priority: 'P1',
      tags: ['Web', 'AI'],
      source: 'ai',
      pathType: 'boundary'
    },
    {
      id: makeCaseId(4),
      title: '连续 5 次错误密码后账号临时锁定',
      precondition: '用户已注册有效手机号，账号未锁定',
      steps: ['输入合法手机号', '连续 5 次输入错误密码并提交', '再次输入正确密码提交'],
      expected: '系统提示账号已临时锁定，暂不允许登录',
      priority: 'P1',
      tags: ['Web', 'AI'],
      source: 'ai',
      pathType: 'security'
    }
  ];
}

function parseSseEvent(raw: MessageEvent<string>): GenerateSseEventDto | null {
  try {
    return JSON.parse(raw.data) as GenerateSseEventDto;
  } catch {
    return null;
  }
}

export function useGenerateStream() {
  const timersRef = useRef<Timer[]>([]);
  const eventSourceRef = useRef<EventSource | null>(null);
  const expectedCloseRef = useRef(false);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((timer) => window.clearTimeout(timer));
    timersRef.current = [];
  }, []);

  const closeEventSource = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  const schedule = useCallback((handler: () => void, delay: number) => {
    const timer = window.setTimeout(handler, delay);
    timersRef.current.push(timer);
  }, []);

  const runMockStage = useCallback(
    (stage: GenerateStage, mode: GenerationMode) => {
      let delay = 0;
      const store = useGenerationStore.getState();

      schedule(() => store.stageStarted(stage), delay);
      delay += 320;

      mockChunks[stage].forEach((chunk) => {
        schedule(() => useGenerationStore.getState().appendStageChunk(stage, chunk), delay);
        delay += 420;
      });

      schedule(() => {
        const shouldWait = mode === 'step' && stage !== 'e3';
        useGenerationStore.getState().stageDone(stage, mockResults[stage], shouldWait);

        if (shouldWait) {
          return;
        }

        const nextIndex = stageOrder.indexOf(stage) + 1;
        const nextStage = stageOrder[nextIndex];

        if (nextStage) {
          runMockStage(nextStage, mode);
          return;
        }

        schedule(() => {
          useGenerationStore.getState().stageStarted('critic');
          useGenerationStore.getState().appendStageChunk('critic', 'Critic 正在检查用例完整性、优先级和可执行性...\n');
        }, 260);
        schedule(() => useGenerationStore.getState().completeGeneration(86, buildMockCases()), 820);
      }, delay);
    },
    [schedule]
  );

  const startMockGeneration = useCallback(
    (input: string, mode: GenerationMode) => {
      clearTimers();
      closeEventSource();
      const taskId = `mock-${Date.now().toString(36)}`;
      useGenerationStore.getState().beginTask(taskId, input, mode, 'mock');
      runMockStage('e1', mode);
    },
    [clearTimers, closeEventSource, runMockStage]
  );

  const applyRealEvent = useCallback((event: GenerateSseEventDto) => {
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
      return;
    }

    if (event.event === 'generation_complete') {
      const criticScore = typeof event.payload.criticScore === 'number' ? event.payload.criticScore : 0;
      useGenerationStore.getState().completeGeneration(criticScore, generatedCaseDtosToDrafts(event.payload.cases));
      closeEventSource();
    }
  }, [closeEventSource]);

  const openRealStream = useCallback(
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

        applyRealEvent(event);

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
          useGenerationStore.getState().failTask('SSE 连接中断，请检查后端服务或切换到 mock 模式。');
        }
        closeEventSource();
      };
    },
    [applyRealEvent, closeEventSource]
  );

  const startRealGeneration = useCallback(
    async (input: string, mode: GenerationMode) => {
      clearTimers();
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

      const task = await createGenerateTask(currentProjectId || getDefaultProjectId(), {
        mode,
        input,
        selectedNodeId: selectedId,
        contextCaseIds
      });

      useGenerationStore.getState().beginTask(task.taskId, input, mode, 'real');

      openRealStream(getGenerateStreamUrl(task));
    },
    [clearTimers, closeEventSource, openRealStream]
  );

  const startGeneration = useCallback(
    async (input: string, mode: GenerationMode) => {
      const apiMode = getTreeifyApiMode();

      if (apiMode === 'mock') {
        startMockGeneration(input, mode);
        return;
      }

      try {
        await startRealGeneration(input, mode);
      } catch (error) {
        if (apiMode === 'real') {
          const message = error instanceof Error ? error.message : '创建生成任务失败';
          useGenerationStore.getState().failTask(message);
          return;
        }
        startMockGeneration(input, mode);
      }
    },
    [startMockGeneration, startRealGeneration]
  );

  const retryGeneration = useCallback(() => {
    const { taskId, source } = useGenerationStore.getState();
    if (!taskId) return;

    useGenerationStore.getState().retryTask();

    if (source === 'real') {
      // Re-open SSE stream for the existing task — backend resumes from last persisted stage
      const streamUrl = `/api/v1/generate/${taskId}/stream`;
      openRealStream(streamUrl);
    } else {
      // Mock mode: restart from the beginning
      const { input, mode } = useGenerationStore.getState();
      startMockGeneration(input, mode);
    }
  }, [openRealStream, startMockGeneration]);

  const confirmCurrentStage = useCallback(async (feedback?: string) => {
    const { activeStage, mode, source, taskId } = useGenerationStore.getState();
    if (!activeStage) {
      return;
    }

    if (source === 'real' && taskId) {
      try {
        const task = await confirmGenerateTask(taskId, { stage: activeStage, feedback });
        useGenerationStore.getState().confirmCurrentStage();
        openRealStream(getGenerateStreamUrl(task));
      } catch (error) {
        const message = error instanceof Error ? error.message : '确认阶段失败，请重试';
        useGenerationStore.getState().failTask(message);
      }
      return;
    }

    useGenerationStore.getState().confirmCurrentStage();
    const nextStage = stageOrder[stageOrder.indexOf(activeStage) + 1];
    if (nextStage) {
      runMockStage(nextStage, mode);
    }
  }, [openRealStream, runMockStage]);

  const cancelGeneration = useCallback(async () => {
    const { source, taskId } = useGenerationStore.getState();
    clearTimers();
    expectedCloseRef.current = true;
    closeEventSource();

    if (source === 'real' && taskId) {
      await cancelGenerateTask(taskId).catch(() => undefined);
    }

    useGenerationStore.getState().cancelTask();
  }, [clearTimers, closeEventSource]);

  useEffect(
    () => () => {
      clearTimers();
      closeEventSource();
    },
    [clearTimers, closeEventSource]
  );

  return {
    startGeneration,
    confirmCurrentStage,
    cancelGeneration,
    retryGeneration
  };
}
