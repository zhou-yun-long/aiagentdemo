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

export type ProjectRequest = {
  name: string;
  description: string;
};

export type CreateGenerateTaskRequest = {
  mode: GenerationMode;
  input: string;
  prdDocumentId?: number;
  contextCaseIds?: number[];
  selectedNodeId?: string;
  attachments?: GenerationAttachmentRequest[];
};

export type GenerationAttachmentRequest = {
  kind: 'document' | 'image';
  fileName: string;
  contentType: string;
  size: number;
  content: string;
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
  selectedNodeId?: string;
  contextCaseIds?: number[];
  e1Result?: string;
  e2Result?: string;
  feedback?: string;
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

export type TestCaseRequest = {
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
  version?: number;
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
  fontFamily?: string;
  fontSize?: number;
  layout?: { x?: number; y?: number; width?: number; height?: number };
};

export type SaveMindmapRequest = {
  nodes: MindmapNodeDto[];
};

export type ProjectSummaryDto = {
  id: number;
  projectId: number;
  content: string;
  version: number;
  current: boolean;
  createdAt: string;
};

export type KnowledgeDocumentDto = {
  id: number;
  projectId: number;
  title: string;
  content: string;
  source: string;
  createdAt: string;
};

export type SnapshotDto = {
  id: number;
  projectId: number;
  name: string;
  description: string;
  caseCount: number;
  format: string;
  data: string;
  createdAt: string;
};

export type ShareDto = {
  id: number;
  projectId: number;
  shareToken: string;
  shareUrl: string;
  active: boolean;
  createdAt: string;
};

export type ShareDataDto = {
  project: ProjectDto;
  cases: TestCaseDto[];
  mindmap: MindmapNodeDto[];
  stats: CaseStatsDto;
};

export type McpServerInfo = {
  url: string;
  name: string;
  version: string;
  toolNames: string[];
  connected: boolean;
};

export type McpConnectResponse = {
  success: boolean;
  message: string;
};

export type ModelParams = {
  temperature: number;
  maxTokens: number;
  topP: number;
};
