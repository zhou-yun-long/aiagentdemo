import type {
  BatchConfirmCasesRequest,
  CaseStatsDto,
  ConfirmGenerateTaskRequest,
  CreateGenerateTaskRequest,
  GenerateTaskDto,
  KnowledgeDocumentDto,
  McpServerInfo,
  MindmapNodeDto,
  ModelParams,
  ProjectDto,
  ProjectSummaryDto,
  ShareDataDto,
  ShareDto,
  SnapshotDto,
  TestCaseRequest,
  TestCaseDto,
  TreeifyApiMode
} from '../types/treeify';
import { request } from './request';

export function getTreeifyApiMode(): TreeifyApiMode {
  const mode = import.meta.env.VITE_TREEIFY_API_MODE;
  return mode === 'mock' || mode === 'real' || mode === 'auto' ? mode : 'auto';
}

export function getDefaultProjectId() {
  const projectId = Number(import.meta.env.VITE_TREEIFY_PROJECT_ID || 1);
  return Number.isFinite(projectId) && projectId > 0 ? projectId : 1;
}

export function listProjects() {
  return request<ProjectDto[]>('/api/v1/projects');
}

export function getProject(projectId = getDefaultProjectId()) {
  return request<ProjectDto>(`/api/v1/projects/${projectId}`);
}

export function getProjectCases(projectId = getDefaultProjectId()) {
  return request<TestCaseDto[]>(`/api/v1/projects/${projectId}/cases`);
}

export function getProjectCaseStats(projectId = getDefaultProjectId()) {
  return request<CaseStatsDto>(`/api/v1/projects/${projectId}/cases/stats`);
}

export function updateCase(caseId: number, body: TestCaseRequest) {
  return request<TestCaseDto>(`/api/v1/cases/${caseId}`, {
    method: 'PUT',
    body: JSON.stringify(body)
  });
}

export function deleteCase(caseId: number) {
  return request<{ deleted: boolean; caseId: number }>(`/api/v1/cases/${caseId}`, {
    method: 'DELETE'
  });
}

export function updateCaseExecutionStatus(caseId: number, executionStatus: TestCaseDto['executionStatus']) {
  return request<TestCaseDto>(`/api/v1/cases/${caseId}/execution-status`, {
    method: 'PATCH',
    body: JSON.stringify({ executionStatus })
  });
}

export function createGenerateTask(projectId: number, body: CreateGenerateTaskRequest) {
  return request<GenerateTaskDto>(`/api/v1/projects/${projectId}/generate`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function confirmGenerateTask(taskId: string, body: ConfirmGenerateTaskRequest = {}) {
  return request<GenerateTaskDto>(`/api/v1/generate/${taskId}/confirm`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function cancelGenerateTask(taskId: string) {
  return request<GenerateTaskDto>(`/api/v1/generate/${taskId}/cancel`, {
    method: 'POST'
  });
}

export function getGenerateTask(taskId: string) {
  return request<GenerateTaskDto>(`/api/v1/generate/${taskId}`);
}

export function batchConfirmCases(projectId: number, cases: BatchConfirmCasesRequest['cases']) {
  return request<TestCaseDto[]>('/api/v1/cases/batch-confirm', {
    method: 'POST',
    body: JSON.stringify({ projectId, cases } satisfies BatchConfirmCasesRequest)
  });
}

export function getGenerateStreamUrl(task: GenerateTaskDto) {
  return task.streamUrl || `/api/v1/generate/${task.taskId}/stream`;
}

export function saveMindmap(projectId: number, nodes: MindmapNodeDto[]) {
  return request<MindmapNodeDto[]>(`/api/v1/projects/${projectId}/mindmap`, {
    method: 'PUT',
    body: JSON.stringify({ nodes })
  });
}

export function getMindmap(projectId: number) {
  return request<MindmapNodeDto[]>(`/api/v1/projects/${projectId}/mindmap`);
}

export function getProjectSummary(projectId: number) {
  return request<ProjectSummaryDto>(`/api/v1/projects/${projectId}/summary`);
}

export function getSummaryHistory(projectId: number) {
  return request<ProjectSummaryDto[]>(`/api/v1/projects/${projectId}/summary/history`);
}

export function generateSummary(projectId: number, context?: string) {
  const qs = context ? `?context=${encodeURIComponent(context)}` : '';
  return request<ProjectSummaryDto>(`/api/v1/projects/${projectId}/summary/generate${qs}`, {
    method: 'POST'
  });
}

export function rollbackSummary(projectId: number, version: number) {
  return request<ProjectSummaryDto>(`/api/v1/projects/${projectId}/summary/rollback/${version}`, {
    method: 'POST'
  });
}

export function addKnowledgeDocument(projectId: number, body: { title: string; content: string; source: string }) {
  return request<KnowledgeDocumentDto>(`/api/v1/projects/${projectId}/knowledge`, {
    method: 'POST',
    body: JSON.stringify(body)
  });
}

export function listKnowledgeDocuments(projectId: number) {
  return request<KnowledgeDocumentDto[]>(`/api/v1/projects/${projectId}/knowledge`);
}

export function deleteKnowledgeDocument(docId: number) {
  return request<{ deleted: boolean }>(`/api/v1/knowledge/${docId}`, {
    method: 'DELETE'
  });
}

export function searchKnowledge(projectId: number, keyword: string, limit?: number) {
  const params = new URLSearchParams({ keyword });
  if (limit !== undefined) params.set('limit', String(limit));
  return request<KnowledgeDocumentDto[]>(`/api/v1/projects/${projectId}/knowledge/search?${params}`, {
    method: 'POST'
  });
}

export function listSnapshots(projectId: number) {
  return request<SnapshotDto[]>(`/api/v1/projects/${projectId}/snapshots`);
}

export function createSnapshot(projectId: number, name?: string, description?: string, data?: string) {
  return request<SnapshotDto>(`/api/v1/projects/${projectId}/snapshots`, {
    method: 'POST',
    body: JSON.stringify({ name, description, data })
  });
}

export function getSnapshot(snapshotId: number) {
  return request<SnapshotDto>(`/api/v1/snapshots/${snapshotId}`);
}

export function deleteSnapshot(snapshotId: number) {
  return request<{ deleted: boolean }>(`/api/v1/snapshots/${snapshotId}`, {
    method: 'DELETE'
  });
}

export function createShare(projectId: number) {
  return request<ShareDto>(`/api/v1/projects/${projectId}/share`, {
    method: 'POST'
  });
}

export function getShare(projectId: number) {
  return request<ShareDto | null>(`/api/v1/projects/${projectId}/share`);
}

export function revokeShare(projectId: number) {
  return request<void>(`/api/v1/projects/${projectId}/share`, {
    method: 'DELETE'
  });
}

export function getShareData(token: string) {
  return request<ShareDataDto>(`/api/v1/share/${token}`);
}

// ---- MCP / Manage API ----
// These endpoints use ChatResponse format (success/reply/error) instead of ApiResponse

type ChatApiResponse = { success: boolean; reply?: string; error?: string };

async function manageRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init
  });
  const payload = (await response.json().catch(() => null)) as ChatApiResponse | null;
  if (!response.ok || !payload || !payload.success) {
    throw new Error(payload?.error || response.statusText || '请求失败');
  }
  return payload as unknown as T;
}

export function listMcpServers() {
  return request<McpServerInfo[]>('/api/manage/mcp/list');
}

export function connectMcpServer(url: string) {
  return manageRequest<ChatApiResponse>('/api/manage/mcp/connect', {
    method: 'POST',
    body: JSON.stringify({ url })
  });
}

export function disconnectMcpServer(url: string) {
  return manageRequest<ChatApiResponse>('/api/manage/mcp/disconnect', {
    method: 'POST',
    body: JSON.stringify({ url })
  });
}

export function getModelParams() {
  return request<ModelParams>('/api/manage/model-params');
}

export function updateModelParams(params: Partial<ModelParams>) {
  return request<void>('/api/manage/model-params', {
    method: 'POST',
    body: JSON.stringify(params)
  });
}
