export interface ReviewDto {
  id: number;
  caseId: number;
  caseTitle: string;
  reviewer: string;
  status: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubmitReviewRequest {
  reviewer: string;
  status: string;
  comment?: string;
}

export interface ReviewStatsDto {
  pending: number;
  approved: number;
  rejected: number;
  needsRevision: number;
}
