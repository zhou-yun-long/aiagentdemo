import {
  ArrowDown,
  ArrowUp,
  Bot,
  ChevronDown,
  Download,
  Fullscreen,
  Image,
  Link,
  Moon,
  PanelRightOpen,
  Plus,
  RotateCcw,
  Save,
  Share2,
  Sun,
  Trash2,
  Wrench
} from 'lucide-react';
import type { ThemeMode, WorkspaceStats } from '../shared/types/workspace';

type ToolbarProps = {
  stats: WorkspaceStats;
  theme: ThemeMode;
  onToggleTheme: () => void;
  assistantOpen: boolean;
  onToggleAssistant: () => void;
  onAddChild: () => void;
  onAddSibling: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onExportCases: () => void;
};

const priorities = ['P0', 'P1', 'P2', 'P3'];
const tags = ['前置条件', '执行步骤', '预期结果', 'iOS', 'Android', 'Web', 'AI', '缓存', '数据', '变更'];

export function Toolbar({
  stats,
  theme,
  onToggleTheme,
  assistantOpen,
  onToggleAssistant,
  onAddChild,
  onAddSibling,
  onDelete,
  onMoveUp,
  onMoveDown,
  onExportCases
}: ToolbarProps) {
  const failedRate = stats.totalCases ? Math.round((stats.failedCases / stats.totalCases) * 10000) / 100 : 0;

  return (
    <header className="toolbar">
      <div className="topline">
        <div className="tabs">
          <button className="back-button" aria-label="返回">
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
          <span>标题：speccase 登录用例</span>
        </div>
        <div className="actions">
          <button className="ghost" onClick={onToggleAssistant}>
            <Bot size={15} />
            {assistantOpen ? '关闭AI助手' : '打开AI助手'}
          </button>
          <button className="ghost" onClick={onExportCases}>
            <Download size={15} />
            导出用例
          </button>
          <button className="ghost">1人在线</button>
          <button className="ghost">
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
          <button className="ghost">
            <Fullscreen size={15} />
            全屏
          </button>
        </div>
      </div>
      <div className="toolline">
        <button className="tool disabled">
          <RotateCcw size={15} />
          撤销
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
        <button className="tool">
          <Link size={15} />
          链接
        </button>
        <button className="tool">
          <Image size={15} />
          图片
        </button>
        <button className="tool">
          <Save size={15} />
          备注
        </button>
        <button className="tool">
          <Wrench size={15} />
          工具
        </button>
        <button className="tool">
          <PanelRightOpen size={15} />
          自动化
        </button>
        <div className="pills">
          {priorities.map((item) => (
            <span className={`priority ${item.toLowerCase()}`} key={item}>
              {item}
            </span>
          ))}
        </div>
        <div className="tags">
          {tags.map((tag) => (
            <span className="tag" key={tag}>
              {tag}
            </span>
          ))}
          <button className="add-tag">+ 新增</button>
        </div>
      </div>
    </header>
  );
}
