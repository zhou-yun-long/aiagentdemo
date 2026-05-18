import type { ReviewDto, SubmitReviewRequest, ReviewStatsDto } from '../types/review';
import { request } from './request';

export function submitReview(caseId: number, data: SubmitReviewRequest) {
  return request<ReviewDto>(`/api/v1/cases/${caseId}/reviews`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function getReviewHistory(caseId: number) {
  return request<ReviewDto[]>(`/api/v1/cases/${caseId}/reviews`);
}

export function getReviewStats(projectId: number) {
  return request<ReviewStatsDto>(`/api/v1/projects/${projectId}/reviews/stats`);
}
