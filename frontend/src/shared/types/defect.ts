export interface DefectDto {
  id: number;
  projectId: number;
  title: string;
  description: string;
  severity: string;
  status: string;
  caseId: number | null;
  planId: number | null;
  reporter: string;
  assignee: string;
  resolution: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDefectRequest {
  title: string;
  description?: string;
  severity?: string;
  caseId?: number;
  planId?: number;
  reporter?: string;
  assignee?: string;
}

export interface UpdateDefectRequest {
  title?: string;
  description?: string;
  severity?: string;
  assignee?: string;
}

export interface TransitionDefectRequest {
  targetStatus: string;
  resolution?: string;
}

export interface DefectStatsDto {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  reopened: number;
}
