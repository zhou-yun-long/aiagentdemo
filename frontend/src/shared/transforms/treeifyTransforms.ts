import type { GeneratedCaseDraft, GenerateStage } from '../../types/generation';
import type { GeneratedCaseDto, GenerateSsePayload, MindmapNodeDto, TestCaseDto } from '../types/treeify';
import type { MindNode, Priority } from '../types/workspace';

const lanes: MindNode['lane'][] = ['upper', 'middle', 'lower'];

export function normalizePriority(value: unknown): Priority {
  return value === 'P0' || value === 'P1' || value === 'P2' || value === 'P3' ? value : 'P1';
}

export function stringifyStageResult(value: unknown) {
  if (typeof value === 'string') {
    return value;
  }
  if (value === null || value === undefined) {
    return '';
  }
  return JSON.stringify(value, null, 2);
}

export function getStagePayloadContent(payload: GenerateSsePayload | undefined) {
  return typeof payload?.content === 'string' ? payload.content : '';
}

export function getStagePayloadResult(payload: GenerateSsePayload | undefined) {
  return stringifyStageResult(payload?.result);
}

export function getStageNeedConfirm(payload: GenerateSsePayload | undefined) {
  return Boolean(payload?.needConfirm);
}

export function generatedCaseDtoToDraft(item: GeneratedCaseDto, index: number): GeneratedCaseDraft {
  return {
    id: `api-draft-${index}-${item.title}`,
    title: item.title || '未命名测试用例',
    precondition: item.precondition || '',
    steps: Array.isArray(item.steps) ? item.steps : [],
    expected: item.expected || '',
    priority: normalizePriority(item.priority),
    tags: item.tags || ['AI'],
    source: item.source || 'ai',
    pathType: item.pathType
  };
}

export function generatedCaseDtosToDrafts(items: GeneratedCaseDto[] = []) {
  return items.map(generatedCaseDtoToDraft);
}

export function draftToGeneratedCaseDto(item: GeneratedCaseDraft): GeneratedCaseDto {
  return {
    title: item.title,
    precondition: item.precondition,
    steps: item.steps,
    expected: item.expected,
    priority: normalizePriority(item.priority),
    tags: item.tags || ['AI'],
    source: item.source || 'ai',
    pathType: item.pathType
  };
}

export function generatedCaseDraftsToRows(cases: GeneratedCaseDraft[]) {
  return cases.map((item) => [item.title, item.precondition, item.steps.join('；'), item.expected, item.priority]);
}

export function testCasesToRows(cases: TestCaseDto[]) {
  return cases.map((item) => [
    item.title,
    item.precondition,
    item.steps.join('；'),
    item.expected,
    normalizePriority(item.priority)
  ]);
}

export function testCaseToMindNodes(testCase: TestCaseDto, index: number): MindNode[] {
  const lane = lanes[index % lanes.length];
  const order = Math.floor(index / lanes.length);
  const caseId = `api-case-${testCase.id}`;
  const conditionId = `${caseId}-condition`;
  const stepId = `${caseId}-steps`;

  return [
    {
      id: caseId,
      caseId: String(testCase.id),
      projectId: String(testCase.projectId),
      title: testCase.title,
      kind: 'case',
      priority: normalizePriority(testCase.priority),
      tags: testCase.tags,
      ai: testCase.source === 'ai',
      status: testCase.executionStatus === 'passed' ? 'pass' : testCase.executionStatus === 'failed' ? 'fail' : 'warn',
      executionStatus: testCase.executionStatus,
      source: testCase.source === 'ai' ? 'ai' : 'manual',
      version: testCase.version,
      lane,
      depth: 2,
      order
    },
    {
      id: conditionId,
      parentId: caseId,
      caseId: String(testCase.id),
      projectId: String(testCase.projectId),
      title: testCase.precondition || '无前置条件',
      kind: 'condition',
      tags: ['前置条件'],
      source: testCase.source === 'ai' ? 'ai' : 'manual',
      version: testCase.version,
      lane,
      depth: 3,
      order
    },
    {
      id: stepId,
      parentId: caseId,
      caseId: String(testCase.id),
      projectId: String(testCase.projectId),
      title: testCase.steps.join('；'),
      kind: 'step',
      tags: ['执行步骤'],
      source: testCase.source === 'ai' ? 'ai' : 'manual',
      version: testCase.version,
      lane,
      depth: 4,
      order
    },
    {
      id: `${caseId}-expected`,
      parentId: stepId,
      caseId: String(testCase.id),
      projectId: String(testCase.projectId),
      title: testCase.expected,
      kind: 'expected',
      tags: ['预期结果'],
      source: testCase.source === 'ai' ? 'ai' : 'manual',
      version: testCase.version,
      lane,
      depth: 5,
      order
    }
  ];
}

export function testCasesToMindNodes(cases: TestCaseDto[]) {
  return cases.flatMap(testCaseToMindNodes);
}

export function isGenerateStage(value: unknown): value is GenerateStage {
  return value === 'e1' || value === 'e2' || value === 'e3' || value === 'critic';
}

export function mindNodeToDto(node: MindNode): MindmapNodeDto {
  return {
    id: node.id,
    parentId: node.parentId,
    caseId: node.caseId,
    projectId: node.projectId,
    title: node.title,
    kind: node.kind,
    priority: node.priority,
    tags: node.tags ? [...node.tags] : undefined,
    status: node.status,
    executionStatus: node.executionStatus,
    source: node.source,
    version: node.version || 1,
    lane: node.lane,
    depth: node.depth,
    order: node.order,
    layout: node.layout ? { ...node.layout } : undefined
  };
}

export function mindNodeFromDto(dto: MindmapNodeDto): MindNode {
  return {
    id: dto.id,
    parentId: dto.parentId,
    caseId: dto.caseId,
    projectId: dto.projectId,
    title: dto.title,
    kind: dto.kind as MindNode['kind'],
    priority: dto.priority,
    tags: dto.tags ? [...dto.tags] : undefined,
    status: dto.status as MindNode['status'],
    executionStatus: dto.executionStatus,
    source: dto.source as MindNode['source'],
    version: dto.version,
    lane: dto.lane as MindNode['lane'],
    depth: dto.depth,
    order: dto.order,
    layout: dto.layout ? { ...dto.layout } : undefined
  };
}
