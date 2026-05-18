import { request } from './request';

export type DimensionItem = {
  key: string;
  label: string;
  priority: 'P0' | 'P1' | 'P2' | 'P3';
};

export type DimensionCategory = {
  key: string;
  label: string;
  items: DimensionItem[];
};

export type DimensionDictionary = {
  businessScenarios: Array<{ key: string; label: string }>;
  categories: DimensionCategory[];
};

const MOCK_DIMENSIONS: DimensionDictionary = {
  businessScenarios: [
    { key: 'login', label: '用户登录' },
    { key: 'registration', label: '用户注册' },
    { key: 'payment', label: '支付结算' },
  ],
  categories: [
    {
      key: 'functional',
      label: '功能测试',
      items: [
        { key: 'happy_path', label: '正常流程', priority: 'P0' },
        { key: 'edge_case', label: '边界条件', priority: 'P1' },
        { key: 'error_handling', label: '异常处理', priority: 'P1' },
      ],
    },
    {
      key: 'nonfunctional',
      label: '非功能测试',
      items: [
        { key: 'performance', label: '性能测试', priority: 'P2' },
        { key: 'security', label: '安全测试', priority: 'P1' },
        { key: 'usability', label: '易用性测试', priority: 'P3' },
      ],
    },
  ],
};

export function getDimensions(): Promise<DimensionDictionary> {
  if (import.meta.env.VITE_TREEIFY_API_MODE === 'mock') {
    return Promise.resolve(MOCK_DIMENSIONS);
  }
  return request<DimensionDictionary>('/api/v1/generation/dimensions');
}
