export type ThemeMode = 'light' | 'dark';

export type NodeKind = 'root' | 'group' | 'case' | 'condition' | 'step' | 'expected';

export type Priority = 'P0' | 'P1' | 'P2' | 'P3';

export type Lane = 'upper' | 'middle' | 'lower';

export type ExecutionStatus = 'not_run' | 'running' | 'passed' | 'failed' | 'blocked' | 'skipped';

export type ReviewStatus = 'pass' | 'warn' | 'fail';

export type NodeSource = 'ai' | 'manual' | 'imported';

export type MindNode = {
  id: string;
  parentId?: string;
  caseId?: string;
  projectId?: string;
  title: string;
  kind: NodeKind;
  priority?: Priority;
  tags?: string[];
  ai?: boolean;
  status?: ReviewStatus;
  executionStatus?: ExecutionStatus;
  source?: NodeSource;
  version?: number;
  collapsed?: boolean;
  lane: Lane;
  depth: number;
  order: number;
  linkUrl?: string;
  imageUrl?: string;
  fontFamily?: string;
  fontSize?: number;
  layout?: {
    x?: number;
    y?: number;
    width?: number;
    height?: number;
  };
};

export type WorkspaceStats = {
  totalCases: number;
  testedCases: number;
  passedCases: number;
  failedCases: number;
  passRate: number;
};

export const executionStatusLabels: Record<ExecutionStatus, string> = {
  not_run: '未执行',
  running: '执行中',
  passed: '通过',
  failed: '失败',
  blocked: '阻塞',
  skipped: '跳过'
};

export const priorityOptions: Priority[] = ['P0', 'P1', 'P2', 'P3'];
