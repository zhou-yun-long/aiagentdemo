import { create } from 'zustand';
import type {
  GeneratedCaseDraft,
  GenerationMode,
  GenerationTaskStatus,
  GenerateStage,
  StageViewState
} from '../../types/generation';

const stageTitles: Record<GenerateStage, string> = {
  e1: 'E1 需求理解',
  e2: 'E2 场景拆解',
  e3: 'E3 用例生成',
  critic: 'Critic 质量评审'
};

const initialStages: Record<GenerateStage, StageViewState> = {
  e1: { stage: 'e1', title: stageTitles.e1, status: 'idle', content: '' },
  e2: { stage: 'e2', title: stageTitles.e2, status: 'idle', content: '' },
  e3: { stage: 'e3', title: stageTitles.e3, status: 'idle', content: '' },
  critic: { stage: 'critic', title: stageTitles.critic, status: 'idle', content: '' }
};

type GenerationState = {
  mode: GenerationMode;
  input: string;
  taskId?: string;
  status: GenerationTaskStatus;
  source: 'mock' | 'real';
  activeStage: GenerateStage | null;
  stages: Record<GenerateStage, StageViewState>;
  criticScore?: number;
  cases: GeneratedCaseDraft[];
  error?: string;
  setMode: (mode: GenerationMode) => void;
  setInput: (input: string) => void;
  beginTask: (taskId: string, input: string, mode: GenerationMode, source: 'mock' | 'real') => void;
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
  source: 'mock',
  activeStage: null,
  stages: resetStages(),
  cases: [],
  setMode: (mode) => set({ mode }),
  setInput: (input) => set({ input }),
  beginTask: (taskId, input, mode, source) =>
    set({
      taskId,
      input,
      mode,
      source,
      status: 'running',
      activeStage: null,
      stages: resetStages(),
      criticScore: undefined,
      cases: [],
      error: undefined
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
    set((state) => ({
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
      }
    })),
  completeGeneration: (criticScore, cases) =>
    set((state) => ({
      status: 'done',
      activeStage: null,
      criticScore,
      cases,
      stages: {
        ...state.stages,
        critic: {
          ...state.stages.critic,
          status: 'done',
          content: `质量评分 ${criticScore}。结构完整，可进入人工确认。`,
          result: `生成 ${cases.length} 条候选用例，建议先确认 P0/P1 场景。`
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
      source: 'mock',
      activeStage: null,
      stages: resetStages(),
      criticScore: undefined,
      cases: [],
      error: undefined
    }),
  updateCase: (id, patch) =>
    set((state) => ({
      cases: state.cases.map((item) => (item.id === id ? { ...item, ...patch } : item))
    })),
  removeCase: (id) =>
    set((state) => ({
      cases: state.cases.filter((item) => item.id !== id)
    }))
}));
