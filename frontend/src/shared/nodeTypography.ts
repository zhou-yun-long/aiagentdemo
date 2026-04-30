export const defaultNodeFontSize = 13;
export const minNodeFontSize = 10;
export const maxNodeFontSize = 28;

export const nodeFontOptions = [
  { label: '默认', value: undefined },
  { label: 'Inter', value: 'Inter, ui-sans-serif, system-ui, sans-serif' },
  { label: '系统默认', value: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { label: '微软雅黑', value: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { label: '宋体', value: '"SimSun", "Songti SC", serif' },
  { label: '等宽字体', value: '"JetBrains Mono", "Fira Code", "SF Mono", Menlo, monospace' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' }
];

export const nodeFontSizePresets = [12, 13, 14, 16, 18, 20, 24];

export const nodeFontWeightOptions = [
  { label: '常规', value: undefined },
  { label: '中等', value: 600 },
  { label: '加粗', value: 700 }
];

export function clampNodeFontSize(size: number) {
  if (!Number.isFinite(size)) {
    return defaultNodeFontSize;
  }

  return Math.min(maxNodeFontSize, Math.max(minNodeFontSize, Math.round(size)));
}

export function getNodeFontLabel(fontFamily?: string) {
  if (!fontFamily) {
    return '默认';
  }

  return nodeFontOptions.find((font) => font.value === fontFamily)?.label || '自定义';
}
