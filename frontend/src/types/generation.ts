export type GenerateSseEventName =
  | 'stage_started'
  | 'stage_chunk'
  | 'stage_done'
  | 'generation_complete';

export type GenerateStage = 'e1' | 'e2' | 'e3' | 'critic';

export type GenerationMode = 'auto' | 'step';

export type GenerationTaskStatus = 'idle' | 'running' | 'waiting_confirm' | 'done' | 'failed' | 'cancelled';

export type StageStatus = 'idle' | 'running' | 'done' | 'waiting_confirm';

export type GenerateSseEvent<TPayload = unknown> = {
  event: GenerateSseEventName;
  taskId: string;
  stage: GenerateStage | null;
  sequence: number;
  timestamp: string;
  payload: TPayload;
};

export type StageChunkPayload = {
  content: string;
};

export type StageDonePayload<TResult = unknown> = {
  result: TResult;
  needConfirm: boolean;
};

export type GenerationCompletePayload<TCase = unknown> = {
  criticScore: number;
  cases: TCase[];
};

export type StageViewState = {
  stage: GenerateStage;
  title: string;
  status: StageStatus;
  content: string;
  result?: string;
  needConfirm?: boolean;
};

export type GeneratedCaseDraft = {
  id: string;
  title: string;
  precondition: string;
  steps: string[];
  expected: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  tags?: string[];
  source?: string;
  pathType?: string;
};
