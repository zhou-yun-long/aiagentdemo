import type { GeneratedCaseDraft, StageArtifact } from '../types/generation';
import type { TestCaseDto, TraceEdgeDto, TraceGraphDto, TraceNodeDto } from '../shared/types/treeify';
import type { MindNode } from '../shared/types/workspace';
import { parseArtifactJson } from './stageArtifactFormat';

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function list(value: unknown) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function firstListText(value: unknown) {
  return list(value)[0] || '';
}

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function collection(value: unknown, keys: string[]) {
  if (Array.isArray(value)) return value.map(record).filter(Boolean) as Record<string, unknown>[];
  const obj = record(value);
  if (!obj) return [];
  for (const key of keys) {
    if (Array.isArray(obj[key])) {
      return (obj[key] as unknown[]).map(record).filter(Boolean) as Record<string, unknown>[];
    }
  }
  return [];
}

function edgeId(fromId: string, toId: string) {
  return `${fromId}->${toId}`;
}

function uniqueEdges(edges: TraceEdgeDto[]) {
  return Array.from(new Map(edges.map((edge) => [edge.id, edge])).values());
}

export function buildTraceGraphFromArtifacts(
  projectId: number,
  taskId: string | undefined,
  artifacts: Partial<Record<string, StageArtifact>>,
  cases: GeneratedCaseDraft[]
): TraceGraphDto | null {
  const e1 = parseArtifactJson(artifacts.e1?.aiResult || '');
  const e2 = parseArtifactJson(artifacts.e2?.aiResult || '');
  const e3 = parseArtifactJson(artifacts.e3?.aiResult || '');

  let requirements = collection(e1, ['requirements', 'items', 'analysisPoints', 'requirementAnalysis']);
  const objects = collection(e2, ['objects', 'items', 'testObjects', 'decompositions']);
  let generatedCases = collection(e3, ['cases', 'items', 'testCases', 'generatedCases']);

  if (!generatedCases.length && cases.length) {
    generatedCases = cases.map((item) => ({
      draftCaseId: item.draftCaseId || item.id,
      title: item.title,
      expected: item.expected,
      priority: item.priority,
      pathType: item.pathType,
      objectIds: item.objectIds,
      requirementIds: item.requirementIds,
      steps: item.steps
    }));
  }

  if (!objects.length || !generatedCases.length) {
    return null;
  }

  // If E1 has no structured requirements, synthesize from available E1 data
  if (!requirements.length && e1 && typeof e1 === 'object' && !Array.isArray(e1)) {
    const e1Obj = e1 as Record<string, unknown>;
    const syntheticReq: Record<string, unknown> = {
      requirementId: 'req-e1-analysis',
      title: 'E1 需求分析',
      summary: firstListText(e1Obj.businessGoals) || text(e1Obj.summary) || '需求分析结果'
    };
    requirements = [syntheticReq];
  }

  const nodes: TraceNodeDto[] = [];
  const edges: TraceEdgeDto[] = [];

  for (const item of requirements) {
    const id = text(item.requirementId) || text(item.id) || `req-${nodes.filter((n) => n.kind === 'requirement').length}`;
    if (!id) continue;
    nodes.push({
      id,
      kind: 'requirement',
      title: text(item.title) || text(item.name) || id,
      summary: text(item.summary) || text(item.description),
      raw: item
    });
  }

  const requirementIds = new Set(nodes.filter((node) => node.kind === 'requirement').map((node) => node.id));
  const firstRequirementId = requirementIds.size > 0 ? [...requirementIds][0] : null;

  for (let i = 0; i < objects.length; i++) {
    const item = objects[i];
    const id = text(item.objectId) || text(item.id) || `obj-${i}`;
    nodes.push({
      id,
      kind: 'object',
      title: text(item.title) || text(item.name) || id,
      summary: text(item.summary) || list(item.dimensions).slice(0, 3).join('、') || text(item.reason),
      priority: text(item.priority) as TraceNodeDto['priority'],
      raw: item
    });

    const itemReqIds = list(item.requirementIds);
    if (itemReqIds.length > 0) {
      for (const requirementId of itemReqIds) {
        if (requirementIds.has(requirementId)) {
          edges.push({ id: edgeId(requirementId, id), fromId: requirementId, toId: id, relation: 'covers' });
        }
      }
    } else if (firstRequirementId) {
      // Link to first requirement when requirementIds is missing
      edges.push({ id: edgeId(firstRequirementId, id), fromId: firstRequirementId, toId: id, relation: 'covers' });
    }
  }

  const objectIds = new Set(nodes.filter((node) => node.kind === 'object').map((node) => node.id));
  const firstObjectId = objectIds.size > 0 ? [...objectIds][0] : null;

  generatedCases.forEach((item, index) => {
    const id = text(item.draftCaseId) || text(item.id) || `case-${index}`;
    const matchedDraft = cases.find((draft) => draft.draftCaseId === id)
      || cases.find((draft) => draft.title === text(item.title))
      || cases[index];
    nodes.push({
      id,
      kind: 'case',
      title: text(item.title) || matchedDraft?.title || id,
      summary: text(item.expected) || matchedDraft?.expected || list(item.steps).slice(0, 2).join('；'),
      priority: (text(item.priority) || matchedDraft?.priority) as TraceNodeDto['priority'],
      draftCaseId: id,
      raw: item
    });

    const caseObjIds = list(item.objectIds);
    if (caseObjIds.length > 0) {
      for (const objectId of caseObjIds) {
        if (objectIds.has(objectId)) {
          edges.push({ id: edgeId(objectId, id), fromId: objectId, toId: id, relation: 'generates' });
        }
      }
    } else if (firstObjectId) {
      edges.push({ id: edgeId(firstObjectId, id), fromId: firstObjectId, toId: id, relation: 'generates' });
    }

    const caseReqIds = list(item.requirementIds);
    if (caseReqIds.length > 0) {
      for (const requirementId of caseReqIds) {
        if (requirementIds.has(requirementId)) {
          edges.push({ id: edgeId(requirementId, id), fromId: requirementId, toId: id, relation: 'traces' });
        }
      }
    } else if (firstRequirementId) {
      edges.push({ id: edgeId(firstRequirementId, id), fromId: firstRequirementId, toId: id, relation: 'traces' });
    }
  });

  const kinds = new Set(nodes.map((node) => node.kind));
  if (!kinds.has('requirement') || !kinds.has('object') || !kinds.has('case') || edges.length === 0) {
    return null;
  }

  return {
    projectId,
    taskId,
    nodes,
    edges: uniqueEdges(edges),
    updatedAt: new Date().toISOString()
  };
}

export function traceToMindNodes(graph: TraceGraphDto): MindNode[] {
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));
  const parentMap = new Map<string, string>();

  // Build parent relationships from depth-adjacent edges
  for (const edge of graph.edges) {
    const from = nodeMap.get(edge.fromId);
    const to = nodeMap.get(edge.toId);
    if (!from || !to) continue;
    // requirement -> object
    if (from.kind === 'requirement' && to.kind === 'object' && !parentMap.has(to.id)) {
      parentMap.set(to.id, from.id);
    }
    // object -> case
    if (from.kind === 'object' && to.kind === 'case' && !parentMap.has(to.id)) {
      parentMap.set(to.id, from.id);
    }
  }

  const reqIds = graph.nodes.filter((n) => n.kind === 'requirement').map((n) => n.id);
  const objIds = graph.nodes.filter((n) => n.kind === 'object').map((n) => n.id);
  const firstReq = reqIds[0] || null;
  const firstObj = objIds[0] || null;

  const kindMap: Record<TraceNodeDto['kind'], MindNode['kind']> = {
    requirement: 'group',
    object: 'group',
    case: 'case'
  };

  const mindNodes: MindNode[] = [
    { id: 'trace-root', title: '追踪链路', kind: 'root', lane: 'middle', depth: 0, order: 0 }
  ];

  // Track cross-level edges (requirement -> case) as tags
  const crossLevelTags = new Map<string, string[]>();
  for (const edge of graph.edges) {
    const from = nodeMap.get(edge.fromId);
    const to = nodeMap.get(edge.toId);
    if (from?.kind === 'requirement' && to?.kind === 'case') {
      if (!crossLevelTags.has(to.id)) crossLevelTags.set(to.id, []);
      crossLevelTags.get(to.id)!.push(`traces:${from.id}`);
    }
  }

  const depthOrder = { requirement: 1, object: 2, case: 3 } as const;
  const orderCounter = { 1: 0, 2: 0, 3: 0 };
  const stageLabels: Record<TraceNodeDto['kind'], string> = {
    requirement: '需求分析点',
    object: '拆解对象',
    case: '测试用例'
  };

  for (const node of graph.nodes) {
    let parentId = parentMap.get(node.id);
    if (!parentId) {
      if (node.kind === 'requirement') parentId = 'trace-root';
      else if (node.kind === 'object') parentId = firstReq || 'trace-root';
      else parentId = firstObj || firstReq || 'trace-root';
    }

    const depth = depthOrder[node.kind];
    const tags = [stageLabels[node.kind], ...(node.raw?.pathType ? [String(node.raw.pathType)] : []), ...(crossLevelTags.get(node.id) || [])];

    mindNodes.push({
      id: node.id,
      parentId,
      title: node.title,
      kind: kindMap[node.kind],
      priority: node.priority,
      lane: node.kind === 'requirement' ? 'upper' : node.kind === 'object' ? 'middle' : 'lower',
      depth,
      order: orderCounter[depth]++,
      tags: tags.length ? tags : undefined,
      caseId: node.caseId?.toString() || node.draftCaseId
    });
  }

  return mindNodes;
}

export function bindTraceGraphCases(graph: TraceGraphDto, drafts: GeneratedCaseDraft[], savedCases: TestCaseDto[]): TraceGraphDto {
  const byDraftId = new Map(drafts.map((draft, index) => [draft.draftCaseId || draft.id, savedCases[index]]));
  const byTitle = new Map(savedCases.map((item) => [item.title, item]));
  return {
    ...graph,
    nodes: graph.nodes.map((node) => {
      if (node.kind !== 'case') return node;
      const saved = (node.draftCaseId && byDraftId.get(node.draftCaseId)) || byTitle.get(node.title);
      return saved ? { ...node, caseId: saved.id, title: saved.title, priority: saved.priority } : node;
    }),
    updatedAt: new Date().toISOString()
  };
}
