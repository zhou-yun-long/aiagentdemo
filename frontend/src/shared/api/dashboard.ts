import type { DashboardDto } from '../types/dashboard';
import { request } from './request';

const MOCK_DASHBOARD: DashboardDto = {
  totalCases: 42,
  coveredCases: 40,
  passedCases: 35,
  failedCases: 5,
  blockedCases: 2,
  passRate: 83.3,
  recentActivity: [
    { type: 'case_created', description: '新建用例: 登录功能验证', timestamp: '2026-05-18T10:00:00Z' },
    { type: 'case_passed', description: '用例通过: 注册流程测试', timestamp: '2026-05-17T15:30:00Z' },
    { type: 'plan_created', description: '创建计划: 回归测试计划', timestamp: '2026-05-16T09:00:00Z' },
  ],
};

export function getDashboard(projectId: number): Promise<DashboardDto> {
  if (import.meta.env.VITE_TREEIFY_API_MODE === 'mock') {
    return Promise.resolve(MOCK_DASHBOARD);
  }
  return request<DashboardDto>(`/api/v1/projects/${projectId}/dashboard`);
}
