import type {
  CreateDefectRequest,
  DefectDto,
  DefectStatsDto,
  TransitionDefectRequest,
  UpdateDefectRequest
} from '../types/defect';
import { request } from './request';

export function listDefects(projectId: number, status?: string) {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  return request<DefectDto[]>(`/api/v1/projects/${projectId}/defects${qs}`);
}

export function getDefect(defectId: number) {
  return request<DefectDto>(`/api/v1/defects/${defectId}`);
}

export function createDefect(projectId: number, data: CreateDefectRequest) {
  return request<DefectDto>(`/api/v1/projects/${projectId}/defects`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function updateDefect(defectId: number, data: UpdateDefectRequest) {
  return request<DefectDto>(`/api/v1/defects/${defectId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export function transitionDefect(defectId: number, data: TransitionDefectRequest) {
  return request<DefectDto>(`/api/v1/defects/${defectId}/transition`, {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function getDefectStats(projectId: number) {
  return request<DefectStatsDto>(`/api/v1/projects/${projectId}/defects/stats`);
}
