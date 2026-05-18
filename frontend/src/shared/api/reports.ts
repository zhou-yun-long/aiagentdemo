import type { TestReportDto, ReportSummaryDto } from '../types/report';
import { request } from './request';

const MOCK_REPORTS: TestReportDto[] = [
  {
    id: 1,
    projectId: 1,
    planId: 1,
    name: '第一轮测试报告',
    planName: '回归测试计划',
    passRate: 85.0,
    totalCases: 20,
    passed: 17,
    failed: 3,
    createdAt: '2026-05-15T18:00:00Z',
  },
  {
    id: 2,
    projectId: 1,
    planId: 2,
    name: '冒烟测试报告',
    planName: '冒烟测试计划',
    passRate: 100.0,
    totalCases: 5,
    passed: 5,
    failed: 0,
    createdAt: '2026-04-20T18:00:00Z',
  },
];

const MOCK_REPORT_SUMMARY: ReportSummaryDto = {
  totalCases: 20,
  passed: 17,
  failed: 2,
  blocked: 1,
  skipped: 0,
  notRun: 0,
  passRate: 85.0,
  failedCases: [
    { caseId: 3, title: '支付回调验证', priority: 'P0', errorMessage: '接口返回 500' },
    { caseId: 5, title: '订单取消流程', priority: 'P1', errorMessage: '状态未更新' },
  ],
  blockedCases: [
    { caseId: 8, title: '第三方登录集成', priority: 'P1', errorMessage: '测试环境不可用' },
  ],
  priorityDistribution: [
    { priority: 'P0', count: 5 },
    { priority: 'P1', count: 8 },
    { priority: 'P2', count: 7 },
  ],
};

export function listReports(projectId: number): Promise<TestReportDto[]> {
  if (import.meta.env.VITE_TREEIFY_API_MODE === 'mock') {
    return Promise.resolve(MOCK_REPORTS);
  }
  return request<TestReportDto[]>(`/api/v1/projects/${projectId}/reports`);
}

export function getReport(reportId: number): Promise<ReportSummaryDto> {
  if (import.meta.env.VITE_TREEIFY_API_MODE === 'mock') {
    return Promise.resolve(MOCK_REPORT_SUMMARY);
  }
  return request<ReportSummaryDto>(`/api/v1/reports/${reportId}`);
}

export async function exportReport(reportId: number, format: 'excel' | 'pdf') {
  const response = await fetch(`/api/v1/reports/${reportId}/export?format=${format}`);
  if (!response.ok) {
    throw new Error(`Export failed: ${response.statusText}`);
  }
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${reportId}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
