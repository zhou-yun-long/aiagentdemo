export type PlanStatus = 'draft' | 'active' | 'done' | 'archived';

export type PlanExecutionResult = 'pass' | 'fail' | 'blocked' | 'skipped' | null;

export type TestPlanDto = {
  id: number;
  projectId: number;
  name: string;
  description: string;
  status: PlanStatus;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  caseCount: number;
  passedCount: number;
};

export type PlanCaseDto = {
  id: number;
  planId: number;
  caseId: number;
  caseTitle: string | null;
  assigneeId: number | null;
  executionResult: PlanExecutionResult;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlanDetailDto = {
  plan: TestPlanDto;
  cases: PlanCaseDto[];
};

export type CreateTestPlanRequest = {
  projectId: number;
  name: string;
  description?: string;
  caseIds?: number[];
};

export type UpdatePlanCaseResultRequest = {
  executionResult?: string;
  note?: string;
};
