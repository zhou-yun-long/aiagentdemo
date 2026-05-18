import { request } from './request';

export type GenerateHistoryItem = {
  taskId: string;
  projectId: number;
  mode: string;
  status: string;
  currentStage: string | null;
  taskKind: string | null;
  criticScore: number | null;
  resultCount: number | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
};

export function getGenerationHistory(
  projectId: number,
  limit?: number
): Promise<GenerateHistoryItem[]> {
  const qs = limit !== undefined ? `?limit=${limit}` : '';
  return request<GenerateHistoryItem[]>(
    `/api/v1/projects/${projectId}/generate/history${qs}`
  );
}
