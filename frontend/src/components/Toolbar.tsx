import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Bot,
  Camera,
  CheckSquare,
  Download,
  FileText,
  FileSpreadsheet,
  FileType,
  Fullscreen,
  GitBranch,
  Image,
  Link,
  List,
  Loader2,
  Minimize,
  Moon,
  PanelRightOpen,
  Plus,
  RotateCcw,
  RotateCw,
  Save,
  Settings,
  Share2,
  Sun,
  Trash2,
  Type,
  Wrench,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MindNode, NodeKind, ThemeMode, WorkspaceStats } from '../shared/types/workspace';
import type { ProjectDto } from '../shared/types/treeify';
import type { ExportFormat } from '../utils/exportCases';
import {
  clampNodeFontSize,
  defaultNodeFontSize,
  getNodeFontLabel,
  maxNodeFontSize,
  minNodeFontSize,
  nodeFontOptions,
  nodeFontSizePresets,
  nodeFontWeightOptions
} from '../shared/nodeTypography';

type SaveResult = {
  type: 'success' | 'error';
  message: string;
};

type ToolbarProps = {
  stats: WorkspaceStats;
  theme: ThemeMode;
  onToggleTheme: () => void;
  readOnly?: boolean;
  projects: ProjectDto[];
  currentProjectId: number | null;
  onSwitchProject: (projectId: number) => void;
  assistantOpen: boolean;
  onToggleAssistant: () => void;
  summaryOpen: boolean;
  onToggleSummary: () => void;
  knowledgeOpen: boolean;
  onToggleKnowledge: () => void;
  snapshotOpen: boolean;
  onToggleSnapshot: () => void;
  onUndo: () => void;
  canUndo: boolean;
  onRedo: () => void;
  canRedo: boolean;
  onAddChild: () => void;
  onAddSibling: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onAutoBalanceMap: () => void;
  onExportCases: (format: ExportFormat) => void;
  onToggleShare: () => void;
  onToggleIntegration: () => void;
  outlineOpen: boolean;
  onToggleOutline: () => void;
  dirty: boolean;
  saving: boolean;
  saveResult: SaveResult | null;
  onSave: () => void;
  selectedId?: string;
  selectedIds?: string[];
  selectedFontFamily?: string;
  selectedFontSize?: number;
  selectedFontWeight?: number;
  nodeKindCounts: Record<NodeKind, number>;
  onSelectAll?: (kind?: NodeKind) => void;
  onUpdate: (id: string, patch: Partial<MindNode>) => void;
  onUpdateNodes?: (ids: string[], patch: Partial<MindNode>) => void;
  onClearCanvas: () => void;
  onFit: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
};

const priorities = ['P0', 'P1', 'P2', 'P3'];

const nodeSelectOptions: Array<{ label: string; kind?: NodeKind }> = [
  { label: '全部节点' },
  { label: '中心主题', kind: 'root' },
  { label: '模块', kind: 'group' },
  { label: '用例', kind: 'case' },
  { label: '前置条件', kind: 'condition' },
  { label: '执行步骤', kind: 'step' },
  { label: '预期结果', kind: 'expected' }
];

export function Toolbar({
  stats,
  theme,
  onToggleTheme,
  readOnly,
  projects,
  currentProjectId,
  onSwitchProject,
  assistantOpen,
  onToggleAssistant,
  summaryOpen,
  onToggleSummary,
  knowledgeOpen,
  onToggleKnowledge,
  snapshotOpen,
  onToggleSnapshot,
  onUndo,
  canUndo,
  onRedo,
  canRedo,
  onAddChild,
  onAddSibling,
  onDelete,
  onMoveUp,
  onMoveDown,
  onAutoBalanceMap,
  onExportCases,
  onToggleShare,
  onToggleIntegration,
  outlineOpen,
  onToggleOutline,
  dirty,
  saving,
  saveResult,
  onSave,
  selectedId,
  selectedIds,
  selectedFontFamily,
  selectedFontSize,
  selectedFontWeight,
  nodeKindCounts,
  onSelectAll,
  onUpdate,
  onUpdateNodes,
  onClearCanvas,
  onFit,
  zoom,
  onZoomIn,
  onZoomOut
}: ToolbarProps) {
  const navigate = useNavigate();
  const failedRate = stats.totalCases ? Math.round((stats.failedCases / stats.totalCases) * 10000) / 100 : 0;
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [toolOpen, setToolOpen] = useState(false);
  const toolRef = useRef<HTMLDivElement>(null);
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const appearanceRef = useRef<HTMLDivElement>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const viewRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nodeFontOpen, setNodeFontOpen] = useState(false);
  const nodeFontRef = useRef<HTMLDivElement>(null);
  const [editOpen, setEditOpen] = useState(false);
  const editRef = useRef<HTMLDivElement>(null);
  const [nodeSelectOpen, setNodeSelectOpen] = useState(false);
  const nodeSelectRef = useRef<HTMLDivElement>(null);
  const [currentFont, setCurrentFont] = useState('Inter');
  const [fontSize, setFontSize] = useState(14);
  const [tagList, setTagList] = useState(['前置条件', '执行步骤', '预期结果', 'iOS', 'Android', 'Web', 'AI', '缓存', '数据', '变更']);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

  const appFontOptions = nodeFontOptions.filter((font): font is { label: string; value: string } => Boolean(font.value));
  const selectedFontLabel = getNodeFontLabel(selectedFontFamily);
  const selectedNodeFontSize = selectedFontSize ?? defaultNodeFontSize;

  const applyFont = (patch: Partial<MindNode>) => {
    const ids = selectedIds && selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (ids.length === 0) return;
    if (ids.length === 1) {
      onUpdate(ids[0], patch);
    } else if (onUpdateNodes) {
      onUpdateNodes(ids, patch);
    }
  };

  const handleFontChange = (fontName: string, fontValue: string) => {
    document.documentElement.style.setProperty('font-family', fontValue);
    setCurrentFont(fontName);
  };

  const handleFontSize = (size: number) => {
    const clamped = Math.min(20, Math.max(10, size));
    document.documentElement.style.setProperty('font-size', `${clamped}px`);
    setFontSize(clamped);
  };

  const handleExport = (format: ExportFormat) => {
    setExportOpen(false);
    onExportCases(format);
  };

  const handleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleChange);
    return () => document.removeEventListener('fullscreenchange', handleChange);
  }, []);

  const handleLink = () => {
    if (!selectedId) return;
    const url = window.prompt('请输入链接 URL', '');
    if (url !== null) {
      onUpdate(selectedId, { linkUrl: url || undefined });
    }
  };

  const handleImage = () => {
    if (!selectedId) return;
    const url = window.prompt('请输入图片 URL', '');
    if (url !== null) {
      onUpdate(selectedId, { imageUrl: url || undefined });
    }
  };

  const handleAddTag = () => {
    const trimmed = newTagValue.trim();
    if (trimmed && !tagList.includes(trimmed)) {
      setTagList((prev) => [...prev, trimmed]);
    }
    setNewTagValue('');
    setAddingTag(false);
  };

  useEffect(() => {
    if (!exportOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [exportOpen]);

  useEffect(() => {
    if (!toolOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (toolRef.current && !toolRef.current.contains(e.target as Node)) {
        setToolOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [toolOpen]);

  useEffect(() => {
    if (!appearanceOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (appearanceRef.current && !appearanceRef.current.contains(e.target as Node)) {
        setAppearanceOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [appearanceOpen]);

  useEffect(() => {
    if (!viewOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (viewRef.current && !viewRef.current.contains(e.target as Node)) {
        setViewOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [viewOpen]);

  useEffect(() => {
    if (!nodeFontOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (nodeFontRef.current && !nodeFontRef.current.contains(e.target as Node)) {
        setNodeFontOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [nodeFontOpen]);

  useEffect(() => {
    if (!editOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (editRef.current && !editRef.current.contains(e.target as Node)) {
        setEditOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [editOpen]);

  useEffect(() => {
    if (!nodeSelectOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (nodeSelectRef.current && !nodeSelectRef.current.contains(e.target as Node)) {
        setNodeSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [nodeSelectOpen]);

  return (
    <header className="toolbar">
      <div className="topline">
        <div className="tabs">
          <button className="back-button" aria-label="返回" onClick={() => navigate('/projects')}>
            ‹
          </button>
          <button className="tab active">思路</button>
          <div className="tab-dropdown" ref={appearanceRef}>
            <button className={`tab${appearanceOpen ? ' active' : ''}`} onClick={() => setAppearanceOpen((v) => !v)}>外观</button>
            {appearanceOpen && (
              <div className="appearance-panel">
                <div className="appearance-section">
                  <label>主题</label>
                  <div className="appearance-row">
                    <button className={`appearance-btn${theme === 'light' ? ' active' : ''}`} onClick={() => { if (theme !== 'light') onToggleTheme(); }}>
                      <Sun size={14} /> 浅色
                    </button>
                    <button className={`appearance-btn${theme === 'dark' ? ' active' : ''}`} onClick={() => { if (theme !== 'dark') onToggleTheme(); }}>
                      <Moon size={14} /> 深色
                    </button>
                  </div>
                </div>
                <div className="appearance-section">
                  <label>字体</label>
                  <div className="appearance-font-list">
                    {appFontOptions.map((font) => (
                      <button
                        key={font.label}
                        className={`appearance-btn${currentFont === font.label ? ' active' : ''}`}
                        style={{ fontFamily: font.value }}
                        onClick={() => handleFontChange(font.label, font.value)}
                      >
                        {font.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="appearance-section">
                  <label>字号: {fontSize}px</label>
                  <div className="appearance-row">
                    <button className="appearance-btn" onClick={() => handleFontSize(fontSize - 1)} disabled={fontSize <= 10}>A-</button>
                    <input
                      type="range"
                      min={10}
                      max={20}
                      value={fontSize}
                      onChange={(e) => handleFontSize(Number(e.target.value))}
                    />
                    <button className="appearance-btn" onClick={() => handleFontSize(fontSize + 1)} disabled={fontSize >= 20}>A+</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="tab-dropdown" ref={viewRef}>
            <button className={`tab${viewOpen ? ' active' : ''}`} onClick={() => setViewOpen((v) => !v)}>视图</button>
            {viewOpen && (
              <div className="appearance-panel">
                <div className="appearance-section">
                  <label>缩放: {Math.round(zoom * 100)}%</label>
                  <div className="appearance-row">
                    <button className="appearance-btn" onClick={onZoomOut} disabled={zoom <= 0.6}>−</button>
                    <input
                      type="range"
                      min={60}
                      max={140}
                      value={Math.round(zoom * 100)}
                      onChange={(e) => {
                        const target = Number(e.target.value) / 100;
                        const steps = Math.round((target - zoom) * 10);
                        for (let i = 0; i < Math.abs(steps); i++) {
                          if (steps > 0) onZoomIn(); else onZoomOut();
                        }
                      }}
                    />
                    <button className="appearance-btn" onClick={onZoomIn} disabled={zoom >= 1.4}>+</button>
                  </div>
                </div>
                <div className="appearance-section">
                  <div className="appearance-row">
                    <button className="appearance-btn" onClick={onFit}>适应画布</button>
                    <button className="appearance-btn" onClick={() => {
                      const steps = Math.round((1 - zoom) * 10);
                      for (let i = 0; i < Math.abs(steps); i++) {
                        if (steps > 0) onZoomIn(); else onZoomOut();
                      }
                    }}>重置 100%</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="stats">
          <span>通过率: {stats.passRate.toFixed(2)}%</span>
          <span>
            已测: {stats.testedCases}/{stats.totalCases}
          </span>
          <div className="progress" aria-label="通过率">
            <span className="pass" style={{ width: `${stats.passRate}%` }} />
            <span className="fail" style={{ left: `${stats.passRate}%`, width: `${failedRate}%` }} />
          </div>
          {projects.length > 1 ? (
            <select
              className="project-selector"
              value={currentProjectId || ''}
              onChange={(e) => onSwitchProject(Number(e.target.value))}
            >
              {projects.filter((p) => p.status === 'active').map((p) => (
                <option value={p.id} key={p.id}>{p.name}</option>
              ))}
            </select>
          ) : (
            <span>标题：{projects[0]?.name || '未命名项目'}</span>
          )}
        </div>
        <div className="actions">
          <button className="ghost" onClick={onToggleOutline}>
            <List size={15} />
            {outlineOpen ? '关闭大纲' : '打开大纲'}
          </button>
          <button className="ghost" onClick={onToggleAssistant}>
            <Bot size={15} />
            {assistantOpen ? '关闭AI助手' : '打开AI助手'}
          </button>
          <button className="ghost" onClick={onToggleSummary}>
            <FileText size={15} />
            {summaryOpen ? '关闭摘要' : '项目摘要'}
          </button>
          <button className="ghost" onClick={onToggleKnowledge}>
            <BookOpen size={15} />
            {knowledgeOpen ? '关闭知识库' : '知识库'}
          </button>
          <button className="ghost" onClick={onToggleSnapshot}>
            <Camera size={15} />
            {snapshotOpen ? '关闭快照' : '快照'}
          </button>
          <div className="export-dropdown" ref={exportRef}>
            <button className="ghost" onClick={() => setExportOpen((v) => !v)}>
              <Download size={15} />
              导出用例
            </button>
            {exportOpen && (
              <div className="export-menu">
                <button onClick={() => handleExport('json')}>
                  <FileText size={14} />
                  JSON
                </button>
                <button onClick={() => handleExport('csv')}>
                  <FileSpreadsheet size={14} />
                  CSV
                </button>
                <button onClick={() => handleExport('markdown')}>
                  <FileType size={14} />
                  Markdown
                </button>
              </div>
            )}
          </div>
          <button className="ghost">1人在线</button>
          <button className="ghost" onClick={onToggleShare}>
            <Share2 size={15} />
            用例分享
          </button>
          <button className="icon" onClick={onToggleTheme} aria-label="切换主题">
            {theme === 'light' ? <Moon size={16} /> : <Sun size={16} />}
          </button>
          <button className="ghost" onClick={handleFullscreen}>
            {isFullscreen ? <Minimize size={15} /> : <Fullscreen size={15} />}
            {isFullscreen ? '退出全屏' : '全屏'}
          </button>
        </div>
      </div>
      {!readOnly && <div className="toolline">
        <button className={`tool${canUndo ? '' : ' disabled'}`} onClick={onUndo} disabled={!canUndo}>
          <RotateCcw size={15} />
          撤销
        </button>
        <button className={`tool${canRedo ? '' : ' disabled'}`} onClick={onRedo} disabled={!canRedo}>
          <RotateCw size={15} />
          重做
        </button>
        <button className="tool" onClick={onAddChild}>
          <Plus size={15} />
          插入下级
        </button>
        <button className="tool" onClick={onAddSibling}>
          <Plus size={15} />
          插入同级
        </button>
        <div className="tool-dropdown" ref={editRef}>
          <button className="tool" onClick={() => setEditOpen((v) => !v)}>
            <Settings size={15} />
            编辑
          </button>
          {editOpen && (
            <div className="tool-menu">
              <button onClick={() => { onMoveUp(); setEditOpen(false); }}>
                <ArrowUp size={14} />
                上移
              </button>
              <button onClick={() => { onMoveDown(); setEditOpen(false); }}>
                <ArrowDown size={14} />
                下移
              </button>
              <button onClick={() => { handleLink(); setEditOpen(false); }}>
                <Link size={14} />
                链接
              </button>
              <button onClick={() => { handleImage(); setEditOpen(false); }}>
                <Image size={14} />
                图片
              </button>
              <button onClick={() => { onAutoBalanceMap(); setEditOpen(false); }}>
                <GitBranch size={14} />
                自动平衡布局
              </button>
            </div>
          )}
        </div>
        <button className="tool danger" onClick={onDelete}>
          <Trash2 size={15} />
          删除
        </button>
        {selectedId && (
          <div className="node-font-controls">
            {selectedIds && selectedIds.length > 1 && (
              <span className="tool-label">{selectedIds.length} 个节点</span>
            )}
            <div className="tool-dropdown" ref={nodeSelectRef}>
              <button className="tool" onClick={() => setNodeSelectOpen((v) => !v)} title="按节点类别选择">
                <CheckSquare size={15} />
                选择
              </button>
              {nodeSelectOpen && (
                <div className="tool-menu node-select-menu">
                  {nodeSelectOptions.map((option) => {
                    const count = option.kind
                      ? nodeKindCounts[option.kind]
                      : Object.values(nodeKindCounts).reduce((sum, item) => sum + item, 0);
                    return (
                      <button
                        key={option.kind || 'all'}
                        onClick={() => {
                          onSelectAll?.(option.kind);
                          setNodeSelectOpen(false);
                        }}
                        disabled={count === 0}
                      >
                        <span>{option.label}</span>
                        <span className="node-select-count">{count}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="tool-dropdown" ref={nodeFontRef}>
              <button className="tool" onClick={() => setNodeFontOpen((v) => !v)} title="节点字体">
                <Type size={15} />
                字体
              </button>
              {nodeFontOpen && (
                <div className="tool-menu node-font-menu">
                  <div className="node-font-section">
                    <span className="node-font-section-title">字体</span>
                    <div className="node-font-family-grid">
                      {nodeFontOptions.map((font) => (
                        <button
                          key={font.label}
                          className={selectedFontFamily === font.value || (!selectedFontFamily && !font.value) ? 'active' : ''}
                          style={{ fontFamily: font.value }}
                          onClick={() => applyFont({ fontFamily: font.value })}
                        >
                          {font.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="node-font-section">
                    <span className="node-font-section-title">字号</span>
                    <div className="node-font-size-row">
                      <button
                        onClick={() => applyFont({ fontSize: clampNodeFontSize(selectedNodeFontSize - 1) })}
                        disabled={selectedNodeFontSize <= minNodeFontSize}
                      >
                        A-
                      </button>
                      <input
                        type="number"
                        min={minNodeFontSize}
                        max={maxNodeFontSize}
                        value={selectedNodeFontSize}
                        onChange={(e) => applyFont({ fontSize: clampNodeFontSize(Number(e.target.value)) })}
                      />
                      <button
                        onClick={() => applyFont({ fontSize: clampNodeFontSize(selectedNodeFontSize + 1) })}
                        disabled={selectedNodeFontSize >= maxNodeFontSize}
                      >
                        A+
                      </button>
                    </div>
                    <input
                      type="range"
                      min={minNodeFontSize}
                      max={maxNodeFontSize}
                      value={selectedNodeFontSize}
                      onChange={(e) => applyFont({ fontSize: clampNodeFontSize(Number(e.target.value)) })}
                    />
                    <div className="node-font-presets">
                      {nodeFontSizePresets.map((size) => (
                        <button
                          key={size}
                          className={selectedNodeFontSize === size ? 'active' : ''}
                          onClick={() => applyFont({ fontSize: size })}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="node-font-section">
                    <span className="node-font-section-title">字重</span>
                    <div className="node-font-weight-row">
                      {nodeFontWeightOptions.map((weight) => (
                        <button
                          key={weight.label}
                          className={selectedFontWeight === weight.value || (!selectedFontWeight && !weight.value) ? 'active' : ''}
                          style={{ fontWeight: weight.value || 400 }}
                          onClick={() => applyFont({ fontWeight: weight.value })}
                        >
                          {weight.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    className="node-font-reset"
                    onClick={() => applyFont({ fontFamily: undefined, fontSize: undefined, fontWeight: undefined })}
                  >
                    重置节点字体
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <button className="tool" disabled={!dirty || saving} onClick={onSave}>
          {saving ? <Loader2 size={15} className="spinner-icon" /> : <Save size={15} />}
          保存{dirty ? ' *' : ''}
        </button>
        {saveResult && (
          <span className={`save-result ${saveResult.type}`}>{saveResult.message}</span>
        )}
        <div className="tool-dropdown" ref={toolRef}>
          <button className="tool" onClick={() => setToolOpen((v) => !v)}>
            <Wrench size={15} />
            工具
          </button>
          {toolOpen && (
            <div className="tool-menu">
              <button onClick={() => { onClearCanvas(); setToolOpen(false); }}>
                <Trash2 size={14} />
                清空画布
              </button>
              <button onClick={() => { setToolOpen(false); }}>
                <PanelRightOpen size={14} />
                自动化
              </button>
              <button onClick={() => { onToggleIntegration(); setToolOpen(false); }}>
                <Settings size={14} />
                集成设置
              </button>
            </div>
          )}
        </div>
        <div className="pills">
          {priorities.map((item) => (
            <span className={`priority ${item.toLowerCase()}`} key={item}>
              {item}
            </span>
          ))}
        </div>
        <div className="tags">
          {tagList.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
          {addingTag ? (
            <input
              className="add-tag-input"
              value={newTagValue}
              onChange={(e) => setNewTagValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddTag();
                if (e.key === 'Escape') { setAddingTag(false); setNewTagValue(''); }
              }}
              onBlur={handleAddTag}
              placeholder="标签名"
              autoFocus
            />
          ) : (
            <button className="add-tag" onClick={() => setAddingTag(true)}>+ 新增</button>
          )}
        </div>
      </div>}
    </header>
  );
}
