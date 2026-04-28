export type ExportCase = {
  id: string;
  title: string;
  priority?: string;
  executionStatus?: string;
  source?: string;
  tags: string[];
  precondition: string;
  steps: string[];
  expected: string;
};

export type ExportFormat = 'json' | 'csv' | 'markdown';

const statusLabels: Record<string, string> = {
  not_run: '未执行',
  running: '执行中',
  passed: '通过',
  failed: '失败',
  blocked: '阻塞',
  skipped: '跳过'
};

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function exportJson(cases: ExportCase[], date: string) {
  const content = JSON.stringify({ product: 'speccase', exportedAt: new Date().toISOString(), cases }, null, 2);
  download(content, `speccase-cases-${date}.json`, 'application/json');
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function exportCsv(cases: ExportCase[], date: string) {
  const headers = ['ID', '标题', '优先级', '执行状态', '来源', '标签', '前置条件', '执行步骤', '预期结果'];
  const rows = cases.map((c) => [
    c.id,
    c.title,
    c.priority || '',
    statusLabels[c.executionStatus || ''] || c.executionStatus || '',
    c.source || '',
    c.tags.join(';'),
    c.precondition,
    c.steps.join('\n'),
    c.expected
  ].map(escapeCsv).join(','));

  const content = '\uFEFF' + [headers.join(','), ...rows].join('\n');
  download(content, `speccase-cases-${date}.csv`, 'text/csv');
}

function exportMarkdown(cases: ExportCase[], date: string) {
  const lines = [
    '# SpecCase 用例导出',
    '',
    `> 导出时间：${new Date().toLocaleString('zh-CN')}`,
    `> 用例总数：${cases.length}`,
    '',
    '---',
    ''
  ];

  cases.forEach((c, i) => {
    lines.push(`## ${i + 1}. ${c.title}`);
    lines.push('');
    lines.push(`- **优先级**：${c.priority || '-'}`);
    lines.push(`- **执行状态**：${statusLabels[c.executionStatus || ''] || '-'}`);
    if (c.tags.length) lines.push(`- **标签**：${c.tags.join(', ')}`);
    if (c.source) lines.push(`- **来源**：${c.source}`);
    lines.push('');
    if (c.precondition) {
      lines.push('**前置条件**：');
      lines.push(c.precondition);
      lines.push('');
    }
    if (c.steps.length) {
      lines.push('**执行步骤**：');
      c.steps.forEach((s, j) => lines.push(`${j + 1}. ${s}`));
      lines.push('');
    }
    if (c.expected) {
      lines.push('**预期结果**：');
      lines.push(c.expected);
      lines.push('');
    }
    lines.push('---');
    lines.push('');
  });

  download(lines.join('\n'), `speccase-cases-${date}.md`, 'text/markdown');
}

export function exportCases(cases: ExportCase[], format: ExportFormat) {
  const date = new Date().toISOString().slice(0, 10);
  switch (format) {
    case 'json':
      return exportJson(cases, date);
    case 'csv':
      return exportCsv(cases, date);
    case 'markdown':
      return exportMarkdown(cases, date);
  }
}
