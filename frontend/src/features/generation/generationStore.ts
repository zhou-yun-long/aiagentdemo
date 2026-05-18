import { create } from 'zustand';
import type {
  CriticVisualReport,
  GeneratedCaseDraft,
  GenerationConfig,
  GenerationMode,
  GenerationTaskStatus,
  GenerateStage,
  PointsResult,
  StageArtifact,
  StageViewState
} from '../../types/generation';
import type { TraceGraphDto } from '../../shared/types/treeify';

const stageTitles: Record<GenerateStage, string> = {
  e1: 'E1 需求理解',
  e2: 'E2 场景拆解',
  e3: 'E3 用例生成',
  critic: 'Critic 质量评审'
};

const artifactTitles: Record<GenerateStage, string> = {
  e1: '需求分析',
  e2: '拆解对象',
  e3: '用例结果',
  critic: '评审报告'
};

const initialStages: Record<GenerateStage, StageViewState> = {
  e1: { stage: 'e1', title: stageTitles.e1, status: 'idle', content: '' },
  e2: { stage: 'e2', title: stageTitles.e2, status: 'idle', content: '' },
  e3: { stage: 'e3', title: stageTitles.e3, status: 'idle', content: '' },
  critic: { stage: 'critic', title: stageTitles.critic, status: 'idle', content: '' }
};

const defaultConfig: GenerationConfig = {
  taskKind: 'cases',
  businessScenarios: [],
  dimensions: [],
  granularity: 'M',
  targetPlatforms: [],
  outputFormat: 'table',
  customPrompt: '',
  referenceCases: [],
};

type GenerationState = {
  mode: GenerationMode;
  input: string;
  taskId?: string;
  status: GenerationTaskStatus;
  activeStage: GenerateStage | null;
  stages: Record<GenerateStage, StageViewState>;
  criticScore?: number;
  cases: GeneratedCaseDraft[];
  error?: string;
  artifacts: Partial<Record<GenerateStage, StageArtifact>>;
  traceGraph?: TraceGraphDto;
  config: GenerationConfig;
  pointsResult?: PointsResult;
  setMode: (mode: GenerationMode) => void;
  setInput: (input: string) => void;
  setConfig: (patch: Partial<GenerationConfig>) => void;
  resetConfig: () => void;
  setPointsResult: (result: PointsResult) => void;
  beginTask: (taskId: string, input: string, mode: GenerationMode) => void;
  stageStarted: (stage: GenerateStage) => void;
  appendStageChunk: (stage: GenerateStage, content: string) => void;
  stageDone: (stage: GenerateStage, result: string, needConfirm: boolean) => void;
  completeGeneration: (criticScore: number, cases: GeneratedCaseDraft[]) => void;
  confirmCurrentStage: () => void;
  cancelTask: () => void;
  failTask: (message: string) => void;
  retryTask: () => void;
  resetTask: () => void;
  updateCase: (id: string, patch: Partial<GeneratedCaseDraft>) => void;
  removeCase: (id: string) => void;
  setArtifactSupplement: (stage: GenerateStage, value: string) => void;
  toggleArtifactCanvasVisible: (stage: GenerateStage) => void;
  setCriticReport: (report: CriticVisualReport) => void;
  setTraceGraph: (graph?: TraceGraphDto) => void;
};

function resetStages() {
  return {
    e1: { ...initialStages.e1 },
    e2: { ...initialStages.e2 },
    e3: { ...initialStages.e3 },
    critic: { ...initialStages.critic }
  };
}

export const useGenerationStore = create<GenerationState>((set) => ({
  mode: 'auto',
  input:
    '用户需要支持手机号登录。手机号必须为 11 位，密码 6-20 位。错误密码需要提示，连续失败 5 次后账号临时锁定。',
  status: 'idle',
  activeStage: null,
  stages: resetStages(),
  cases: [],
  artifacts: {},
  traceGraph: undefined,
  config: defaultConfig,
  setMode: (mode) => set({ mode }),
  setInput: (input) => set({ input }),
  setConfig: (patch) =>
    set((state) => ({ config: { ...state.config, ...patch } })),
  resetConfig: () => set({ config: defaultConfig }),
  setPointsResult: (result) => set({ pointsResult: result, status: 'done' }),
  beginTask: (taskId, input, mode) =>
    set({
      taskId,
      input,
      mode,
      status: 'running',
      activeStage: null,
      stages: resetStages(),
      criticScore: undefined,
      cases: [],
      error: undefined,
      artifacts: {},
      traceGraph: undefined,
      pointsResult: undefined
    }),
  stageStarted: (stage) =>
    set((state) => ({
      status: 'running',
      activeStage: stage,
      stages: {
        ...state.stages,
        [stage]: {
          ...state.stages[stage],
          status: 'running',
          content: '',
          result: undefined,
          needConfirm: false
        }
      }
    })),
  appendStageChunk: (stage, content) =>
    set((state) => ({
      stages: {
        ...state.stages,
        [stage]: {
          ...state.stages[stage],
          content: `${state.stages[stage].content}${content}`
        }
      }
    })),
  stageDone: (stage, result, needConfirm) =>
    set((state) => {
      const artifact: StageArtifact = state.artifacts[stage] ?? {
        stage,
        title: artifactTitles[stage],
        aiResult: '',
        userSupplement: '',
        visibleOnCanvas: false
      };
      return {
        status: needConfirm ? 'waiting_confirm' : state.status,
        activeStage: stage,
        stages: {
          ...state.stages,
          [stage]: {
            ...state.stages[stage],
            status: needConfirm ? 'waiting_confirm' : 'done',
            result,
            needConfirm
          }
        },
        artifacts: {
          ...state.artifacts,
          [stage]: {
            ...artifact,
            aiResult: result,
            updatedAt: new Date().toISOString()
          }
        }
      };
    }),
  completeGeneration: (criticScore, cases) =>
    set((state) => ({
      status: 'done',
      activeStage: 'critic',
      criticScore,
      cases,
      stages: {
        ...state.stages,
        critic: {
          ...state.stages.critic,
          status: 'done',
          content: `生成完成，已产出 ${cases.length} 条候选用例。\nCritic 质量评分 ${criticScore}，建议先确认 P0/P1 场景。`,
          result: `生成 ${cases.length} 条候选用例，Critic ${criticScore}。`
        }
      }
    })),
  confirmCurrentStage: () =>
    set((state) => {
      if (!state.activeStage) {
        return state;
      }

      return {
        status: 'running',
        stages: {
          ...state.stages,
          [state.activeStage]: {
            ...state.stages[state.activeStage],
            status: 'done',
            needConfirm: false
          }
        }
      };
    }),
  cancelTask: () =>
    set((state) => ({
      status: 'cancelled',
      activeStage: null,
      stages: Object.fromEntries(
        Object.entries(state.stages).map(([stage, value]) => [
          stage,
          value.status === 'running' || value.status === 'waiting_confirm' ? { ...value, status: 'idle' } : value
        ])
      ) as Record<GenerateStage, StageViewState>
    })),
  failTask: (message) =>
    set({
      status: 'failed',
      activeStage: null,
      error: message
    }),
  retryTask: () =>
    set({
      status: 'running',
      error: undefined
    }),
  resetTask: () =>
    set({
      taskId: undefined,
      status: 'idle',
      activeStage: null,
      stages: resetStages(),
      criticScore: undefined,
      cases: [],
      error: undefined,
      artifacts: {},
      traceGraph: undefined,
      pointsResult: undefined,
      config: defaultConfig
    }),
  updateCase: (id, patch) =>
    set((state) => ({
      cases: state.cases.map((item) => (item.id === id ? { ...item, ...patch } : item))
    })),
  removeCase: (id) =>
    set((state) => ({
      cases: state.cases.filter((item) => item.id !== id)
    })),
  setArtifactSupplement: (stage, value) =>
    set((state) => {
      const existing = state.artifacts[stage];
      if (!existing) return state;
      return {
        artifacts: {
          ...state.artifacts,
          [stage]: { ...existing, userSupplement: value, updatedAt: new Date().toISOString() }
        }
      };
    }),
  toggleArtifactCanvasVisible: (stage) =>
    set((state) => {
      const existing = state.artifacts[stage];
      if (!existing) return state;
      return {
        artifacts: {
          ...state.artifacts,
          [stage]: { ...existing, visibleOnCanvas: !existing.visibleOnCanvas }
        }
      };
    }),
  setCriticReport: (report) =>
    set((state) => {
      const existing = state.artifacts.critic;
      return {
        artifacts: {
          ...state.artifacts,
          critic: {
            ...(existing ?? {
              stage: 'critic' as const,
              title: artifactTitles.critic,
              aiResult: '',
              userSupplement: '',
              visibleOnCanvas: false
            }),
            aiResult: `质量评分 ${report.overallScore}，发现 ${report.risks.length} 个风险，给出 ${report.improvements.length} 条改进建议。`,
            criticReport: report,
            updatedAt: new Date().toISOString()
          }
        }
      };
    }),
  setTraceGraph: (graph) => set({ traceGraph: graph })
}));
