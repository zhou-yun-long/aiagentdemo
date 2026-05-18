export type PriorityDistribution = {
  priority: string;
  count: number;
};

export type FailedCaseDto = {
  caseId: number;
  title: string;
  priority: string;
  errorMessage: string;
};

export type ReportSummaryDto = {
  totalCases: number;
  passed: number;
  failed: number;
  blocked: number;
  skipped: number;
  notRun: number;
  passRate: number;
  failedCases: FailedCaseDto[];
  blockedCases: FailedCaseDto[];
  priorityDistribution: PriorityDistribution[];
};

export type TestReportDto = {
  id: number;
  projectId: number;
  planId: number;
  name: string;
  planName: string;
  passRate: number;
  totalCases: number;
  passed: number;
  failed: number;
  createdAt: string;
};
