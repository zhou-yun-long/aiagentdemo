import type { GenerateStage, StageArtifact } from '../types/generation';

export type ArtifactDisplaySection = {
  title: string;
  items: string[];
};

const stageFallbackTitles: Record<GenerateStage, string> = {
  e1: '需求分析',
  e2: '拆解对象',
  e3: '用例结果',
  critic: '评审报告'
};

const e1Sections: Array<{ title: string; keys: string[] }> = [
  { title: '业务目标', keys: ['businessGoals', 'goals', '业务目标'] },
  { title: '用户动作', keys: ['userActions', 'actions', '用户动作'] },
  { title: '系统行为', keys: ['systemBehaviors', 'behaviors', '系统行为'] },
  { title: '约束条件', keys: ['constraints', 'rules', '约束条件'] },
  { title: '风险点', keys: ['risks', 'riskPoints', '风险'] },
  { title: '验收标准', keys: ['acceptanceCriteria', 'criteria', '验收标准'] },
  { title: '待澄清', keys: ['openQuestions', 'questions', '待澄清问题'] }
];

function normalizeText(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value.replace(/\s+/g, ' ').trim();
  }
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function compactLine(text: string, maxLength = 58) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function stripCodeFence(text: string) {
  let cleaned = text.trim();

  // Extract from fenced code block (anywhere in text)
  const fenceStart = cleaned.indexOf('```');
  if (fenceStart >= 0) {
    const contentStart = cleaned.indexOf('\n', fenceStart);
    const start = contentStart >= 0 ? contentStart + 1 : fenceStart + 3;
    const fenceEnd = cleaned.lastIndexOf('```');
    if (fenceEnd > start) {
      cleaned = cleaned.substring(start, fenceEnd).trim();
    }
  }

  // Strip leading fences if still present
  cleaned = cleaned.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim();
  return cleaned;
}

/** Try to extract a JSON object or array from mixed prose + JSON text. */
function extractJsonBlock(text: string): string | null {
  const objIdx = text.indexOf('{');
  const arrIdx = text.indexOf('[');
  let start: number;
  let open: string;
  let close: string;
  if (objIdx >= 0 && (arrIdx < 0 || objIdx < arrIdx)) {
    start = objIdx;
    open = '{';
    close = '}';
  } else if (arrIdx >= 0) {
    start = arrIdx;
    open = '[';
    close = ']';
  } else {
    return null;
  }
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === open) depth++;
    if (c === close) {
      depth--;
      if (depth === 0) return text.substring(start, i + 1).trim();
    }
  }
  return null;
}

/** Fix common LLM JSON malformations. */
function fixCommonIssues(json: string): string {
  return json
    .replace(/,\s*([}\]])/g, '$1')        // remove trailing commas
    .trim();
}

export function parseArtifactJson(text: string): unknown | null {
  let cleaned = stripCodeFence(text);

  // If text doesn't start with { or [, try to extract JSON block from mixed content
  if (cleaned && !cleaned.startsWith('{') && !cleaned.startsWith('[')) {
    const extracted = extractJsonBlock(cleaned);
    if (extracted) cleaned = extracted;
  }

  if (!cleaned || (!cleaned.startsWith('{') && !cleaned.startsWith('['))) {
    return null;
  }

  cleaned = fixCommonIssues(cleaned);

  try {
    return JSON.parse(cleaned);
  } catch {
    // Second attempt: try more aggressive fixing
    try {
      return JSON.parse(fixCommonIssues(cleaned));
    } catch {
      console.warn('[parseArtifactJson] Failed to parse LLM JSON:', cleaned.slice(0, 120));
      return null;
    }
  }
}

function valueToItems(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const text = normalizeText(item);
      if (text) return [text];
      if (item && typeof item === 'object') {
        return [objectToLine(item as Record<string, unknown>)].filter(Boolean);
      }
      return [];
    });
  }

  const text = normalizeText(value);
  if (text) return [text];

  if (value && typeof value === 'object') {
    return [objectToLine(value as Record<string, unknown>)].filter(Boolean);
  }

  return [];
}

function pickList(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const items = valueToItems(source[key]);
    if (items.length > 0) {
      return items;
    }
  }
  return [];
}

function objectToLine(item: Record<string, unknown>) {
  const name = normalizeText(item.name ?? item.title ?? item.objectName ?? item.module ?? item.type);
  const priority = normalizeText(item.priority);
  const reason = normalizeText(item.reason);
  const expected = normalizeText(item.expected ?? item.expectedResult);
  const dimensions = valueToItems(item.dimensions).slice(0, 3).join('、');
  const steps = valueToItems(item.steps).slice(0, 2).join('；');

  const head = [priority, name].filter(Boolean).join(' ');
  const detail = dimensions || reason || expected || steps;
  if (head && detail) {
    return `${head}：${detail}`;
  }
  return head || detail;
}

function normalizeCollection(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['items', 'cases', 'testCases', 'objects', '用例列表', '测试用例列表']) {
      if (Array.isArray(obj[key])) {
        return obj[key] as unknown[];
      }
    }
    return [obj];
  }
  return [];
}

function formatE1(value: unknown): ArtifactDisplaySection[] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return [];
  }

  const obj = value as Record<string, unknown>;
  return e1Sections
    .map((section) => ({ title: section.title, items: pickList(obj, section.keys).slice(0, 5) }))
    .filter((section) => section.items.length > 0);
}

function formatE2(value: unknown): ArtifactDisplaySection[] {
  const objects = normalizeCollection(value);
  const items = objects
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return normalizeText(item);
      }

      const obj = item as Record<string, unknown>;
      const name = normalizeText(obj.name ?? obj.title ?? obj.objectName);
      const priority = normalizeText(obj.priority);
      const type = normalizeText(obj.type);
      const dimensions = valueToItems(obj.dimensions).slice(0, 3).join('、');
      const negative = valueToItems(obj.negativeScenarios).slice(0, 2).join('、');
      const reason = normalizeText(obj.reason);
      const meta = [priority, type].filter(Boolean).join(' / ');
      const details = [dimensions && `维度：${dimensions}`, negative && `异常：${negative}`, reason].filter(Boolean).join('；');
      return [name, meta && `(${meta})`, details && `- ${details}`].filter(Boolean).join(' ');
    })
    .filter(Boolean);

  return items.length ? [{ title: '可测试对象', items }] : [];
}

function formatE3(value: unknown): ArtifactDisplaySection[] {
  const cases = normalizeCollection(value);
  const items = cases
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return normalizeText(item);
      }

      const obj = item as Record<string, unknown>;
      const title = normalizeText(obj.title ?? obj.name);
      const priority = normalizeText(obj.priority);
      const pathType = normalizeText(obj.pathType);
      const expected = normalizeText(obj.expected ?? obj.expectedResult);
      const steps = valueToItems(obj.steps).slice(0, 2).join('；');
      const meta = [priority, pathType].filter(Boolean).join(' / ');
      const detail = expected || steps;
      return [meta && `[${meta}]`, title, detail && `- ${detail}`].filter(Boolean).join(' ');
    })
    .filter(Boolean);

  return items.length ? [{ title: '候选用例', items }] : [];
}

export function formatArtifactSections(stage: GenerateStage, text: string): ArtifactDisplaySection[] {
  const parsed = parseArtifactJson(text);
  if (!parsed) {
    return [];
  }

  if (stage === 'e1') return formatE1(parsed);
  if (stage === 'e2') return formatE2(parsed);
  if (stage === 'e3') return formatE3(parsed);
  return [];
}

export function formatArtifactSummary(stage: GenerateStage, artifact: StageArtifact, maxItems = 3) {
  if (stage === 'critic' && artifact.criticReport) {
    return `评分 ${artifact.criticReport.overallScore} · ${artifact.criticReport.risks.length} 个风险`;
  }

  const sections = formatArtifactSections(stage, artifact.aiResult);
  const items = sections.flatMap((section) => section.items).slice(0, maxItems);
  if (items.length > 0) {
    return items.join('；');
  }

  const text = artifact.aiResult.replace(/\s+/g, ' ').trim();
  if (!text) {
    return '等待阶段结果';
  }
  return text.length > 42 ? `${text.slice(0, 42)}...` : text;
}

export function formatArtifactCanvasTitle(stage: GenerateStage, artifact: StageArtifact) {
  const lines = [artifact.title || stageFallbackTitles[stage]];
  const sections = formatArtifactSections(stage, artifact.aiResult);
  const items = sections.flatMap((section) => section.items).slice(0, 3);

  if (items.length > 0) {
    lines.push(...items.map((item) => `- ${compactLine(item)}`));
  } else {
    lines.push(formatArtifactSummary(stage, artifact, 2));
  }

  if (artifact.userSupplement.trim()) {
    const supplement = artifact.userSupplement.replace(/\s+/g, ' ').trim().replace(/^补充[:：]\s*/, '');
    lines.push(`补充：${compactLine(supplement, 44)}`);
  }

  return lines.join('\n');
}
