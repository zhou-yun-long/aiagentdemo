import type {
  CreateTestPlanRequest,
  PlanCaseDto,
  PlanDetailDto,
  TestPlanDto,
  UpdatePlanCaseResultRequest
} from '../types/plan';
import { request } from './request';

const MOCK_PLANS: TestPlanDto[] = [
  {
    id: 1,
    projectId: 1,
    name: '回归测试计划',
    description: 'V2.0 版本回归测试',
    status: 'active',
    startDate: '2026-05-01',
    endDate: '2026-05-30',
    createdAt: '2026-05-01T08:00:00Z',
    updatedAt: '2026-05-18T10:00:00Z',
    caseCount: 10,
    passedCount: 7,
  },
  {
    id: 2,
    projectId: 1,
    name: '冒烟测试计划',
    description: '核心流程冒烟验证',
    status: 'done',
    startDate: '2026-04-15',
    endDate: '2026-04-20',
    createdAt: '2026-04-15T08:00:00Z',
    updatedAt: '2026-04-20T18:00:00Z',
    caseCount: 5,
    passedCount: 5,
  },
];

const MOCK_PLAN_DETAIL: PlanDetailDto = {
  plan: MOCK_PLANS[0],
  cases: [
    {
      id: 1,
      planId: 1,
      caseId: 1,
      caseTitle: '登录功能验证',
      assigneeId: null,
      executionResult: 'pass',
      note: null,
      createdAt: '2026-05-01T08:00:00Z',
      updatedAt: '2026-05-10T10:00:00Z',
    },
    {
      id: 2,
      planId: 1,
      caseId: 2,
      caseTitle: '注册流程测试',
      assigneeId: null,
      executionResult: 'fail',
      note: '验证码接口超时',
      createdAt: '2026-05-01T08:00:00Z',
      updatedAt: '2026-05-12T14:00:00Z',
    },
  ],
};

export function listPlans(projectId: number): Promise<TestPlanDto[]> {
  if (import.meta.env.VITE_TREEIFY_API_MODE === 'mock') {
    return Promise.resolve(MOCK_PLANS);
  }
  return request<TestPlanDto[]>(`/api/v1/projects/${projectId}/plans`);
}

export function getPlan(planId: number): Promise<PlanDetailDto> {
  if (import.meta.env.VITE_TREEIFY_API_MODE === 'mock') {
    return Promise.resolve(MOCK_PLAN_DETAIL);
  }
  return request<PlanDetailDto>(`/api/v1/plans/${planId}`);
}

export function createPlan(data: CreateTestPlanRequest) {
  return request<TestPlanDto>('/api/v1/plans', {
    method: 'POST',
    body: JSON.stringify(data)
  });
}

export function updatePlan(planId: number, data: CreateTestPlanRequest) {
  return request<TestPlanDto>(`/api/v1/plans/${planId}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export function deletePlan(planId: number) {
  return request<void>(`/api/v1/plans/${planId}`, {
    method: 'DELETE'
  });
}

export function updateCaseResult(planId: number, caseId: number, data: UpdatePlanCaseResultRequest) {
  return request<PlanCaseDto>(`/api/v1/plans/${planId}/cases/${caseId}/result`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

export function recomputeStatus(planId: number) {
  return request<TestPlanDto>(`/api/v1/plans/${planId}/recompute`, {
    method: 'POST'
  });
}
