export type GenerateSseEventName =
  | 'stage_started'
  | 'stage_chunk'
  | 'stage_done'
  | 'generation_complete'
  | 'points_complete';

export type TaskKind = 'cases' | 'points' | 'api_cases';
export type Granularity = 'S' | 'M' | 'L';
export type OutputFormat = 'excel' | 'table' | 'json';

export type GenerationConfig = {
  taskKind: TaskKind;
  businessScenarios: string[];
  dimensions: string[];
  granularity: Granularity;
  targetPlatforms: string[];
  outputFormat: OutputFormat;
  customPrompt: string;
  referenceCases: string[];  // attachmentId[]
};

export type PointsResult = {
  points: Array<{
    objectId: string;
    title: string;
    priority: string;
    dimensions?: string[];
  }>;
};

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
  draftCaseId?: string;
  objectIds?: string[];
  requirementIds?: string[];
};

export type CriticVisualReport = {
  overallScore: number;
  dimensions: Array<{
    key: 'coverage' | 'priority' | 'executability' | 'clarity' | 'risk';
    label: string;
    score: number;
    status: 'good' | 'warning' | 'danger';
    summary: string;
  }>;
  coverageMatrix: Array<{
    objectName: string;
    coveredCount: number;
    missingCount: number;
    status: 'covered' | 'partial' | 'missing';
  }>;
  priorityDistribution: Record<'P0' | 'P1' | 'P2' | 'P3', number>;
  risks: Array<{
    level: 'high' | 'medium' | 'low';
    title: string;
    suggestion: string;
    relatedCaseTitles?: string[];
  }>;
  improvements: string[];
};

export type StageArtifact = {
  stage: GenerateStage;
  title: string;
  aiResult: string;
  userSupplement: string;
  visibleOnCanvas: boolean;
  criticReport?: CriticVisualReport;
  updatedAt?: string;
};
