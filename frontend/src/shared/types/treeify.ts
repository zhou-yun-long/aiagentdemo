import type { ExecutionStatus, Priority } from './workspace';
import type { GeneratedCaseDraft, GenerationMode, GenerateStage } from '../../types/generation';

export type TreeifyApiMode = 'auto' | 'mock' | 'real';

export type ProjectDto = {
  id: number;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateGenerateTaskRequest = {
  mode: GenerationMode;
  input: string;
  prdDocumentId?: number;
  contextCaseIds?: number[];
  selectedNodeId?: string;
};

export type ConfirmGenerateTaskRequest = {
  stage?: GenerateStage;
  feedback?: string;
};

export type GenerateTaskDto = {
  taskId: string;
  projectId: number;
  mode: GenerationMode;
  status: string;
  currentStage: GenerateStage | null;
  streamUrl: string;
  criticScore?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
};

export type GeneratedCaseDto = {
  title: string;
  precondition: string;
  steps: string[];
  expected: string;
  priority: Priority;
  tags?: string[];
  source?: string;
  pathType?: string;
};

export type TestCaseDto = {
  id: number;
  projectId: number;
  parentId?: number | null;
  title: string;
  precondition: string;
  steps: string[];
  expected: string;
  priority: Priority;
  tags: string[];
  source: string;
  executionStatus: ExecutionStatus;
  layout?: Record<string, unknown>;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type CaseStatsDto = {
  total: number;
  measured: number;
  passed: number;
  passRate: number;
};

export type GenerateSsePayload = {
  stage?: GenerateStage;
  content?: string;
  result?: unknown;
  needConfirm?: boolean;
  criticScore?: number;
  cases?: GeneratedCaseDto[];
};

export type GenerateSseEventDto = {
  event: 'stage_started' | 'stage_chunk' | 'stage_done' | 'generation_complete';
  taskId: string;
  stage: GenerateStage | null;
  sequence: number;
  timestamp: string;
  payload: GenerateSsePayload;
};

export type BatchConfirmCasesRequest = {
  projectId: number;
  cases: GeneratedCaseDto[];
};

export type CaseImportResult = {
  source: 'local' | 'api';
  cases: GeneratedCaseDraft[];
};

export type MindmapNodeDto = {
  id: string;
  parentId?: string;
  caseId?: string;
  projectId?: string;
  title: string;
  kind: string;
  priority?: Priority;
  tags?: string[];
  status?: string;
  executionStatus?: ExecutionStatus;
  source?: string;
  version: number;
  lane: string;
  depth: number;
  order: number;
  layout?: { x?: number; y?: number; width?: number; height?: number };
};

export type SaveMindmapRequest = {
  nodes: MindmapNodeDto[];
};
