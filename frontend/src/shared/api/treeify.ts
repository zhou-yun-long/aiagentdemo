import type {
  BatchConfirmCasesRequest,
  CaseStatsDto,
  ConfirmGenerateTaskRequest,
  CreateGenerateTaskRequest,
  GenerateTaskDto,
  MindmapNodeDto,
  ProjectDto,
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
