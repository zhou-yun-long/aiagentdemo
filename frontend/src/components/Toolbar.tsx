import { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  BookOpen,
  Bot,
  Camera,
  ChevronDown,
  Download,
  Eraser,
  FileText,
  FileSpreadsheet,
  FileType,
  Fullscreen,
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
  Wrench,
  ZoomIn
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { MindNode, ThemeMode, WorkspaceStats } from '../shared/types/workspace';
import type { ProjectDto } from '../shared/types/treeify';
import type { ExportFormat } from '../utils/exportCases';

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
  onUpdate: (id: string, patch: Partial<MindNode>) => void;
  onClearExecution: () => void;
  onSnapshot: () => void;
  onFit: () => void;
};

const priorities = ['P0', 'P1', 'P2', 'P3'];

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
  onUpdate,
  onClearExecution,
  onSnapshot,
  onFit
}: ToolbarProps) {
  const navigate = useNavigate();
  const failedRate = stats.totalCases ? Math.round((stats.failedCases / stats.totalCases) * 10000) / 100 : 0;
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const [toolOpen, setToolOpen] = useState(false);
  const toolRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [tagList, setTagList] = useState(['前置条件', '执行步骤', '预期结果', 'iOS', 'Android', 'Web', 'AI', '缓存', '数据', '变更']);
  const [addingTag, setAddingTag] = useState(false);
  const [newTagValue, setNewTagValue] = useState('');

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

  return (
    <header className="toolbar">
      <div className="topline">
        <div className="tabs">
          <button className="back-button" aria-label="返回" onClick={() => navigate('/projects')}>
            ‹
          </button>
          <button className="tab active">思路</button>
          <button className="tab">外观</button>
          <button className="tab">视图</button>
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
          <button className="ghost">
            本地字体
            <ChevronDown size={14} />
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
        <button className="tool" onClick={onMoveUp}>
          <ArrowUp size={15} />
          上移
        </button>
        <button className="tool" onClick={onMoveDown}>
          <ArrowDown size={15} />
          下移
        </button>
        <button className="tool danger" onClick={onDelete}>
          <Trash2 size={15} />
          删除
        </button>
        <button className="tool" onClick={handleLink}>
          <Link size={15} />
          链接
        </button>
        <button className="tool" onClick={handleImage}>
          <Image size={15} />
          图片
        </button>
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
              <button onClick={() => { onClearExecution(); setToolOpen(false); }}>
                <Eraser size={14} />
                清除执行记录
              </button>
              <button onClick={() => { onSnapshot(); setToolOpen(false); }}>
                <Camera size={14} />
                快照当前结果
              </button>
              <button onClick={() => { onFit(); setToolOpen(false); }}>
                <ZoomIn size={14} />
                适应画布
              </button>
            </div>
          )}
        </div>
        <button className="tool">
          <PanelRightOpen size={15} />
          自动化
        </button>
        <button className="tool" onClick={onToggleIntegration}>
          <Settings size={15} />
          集成设置
        </button>
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
