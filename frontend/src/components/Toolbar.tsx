import {
  Bot,
  ChevronDown,
  Download,
  Fullscreen,
  Image,
  Link,
  Moon,
  PanelRightOpen,
  RotateCcw,
  Save,
  Share2,
  Sun,
  Upload,
  Wrench
} from 'lucide-react';
import type { ThemeMode } from '../data/mindMap';

type ToolbarProps = {
  theme: ThemeMode;
  onToggleTheme: () => void;
  assistantOpen: boolean;
  onToggleAssistant: () => void;
};

const priorities = ['P0', 'P1', 'P2', 'P3'];
const tags = ['前置条件', '执行步骤', '预期结果', 'iOS', 'Android', 'Web', 'AI', '缓存', '数据', '变更'];

export function Toolbar({ theme, onToggleTheme, assistantOpen, onToggleAssistant }: ToolbarProps) {
  return (
    <header className="toolbar">
      <div className="topline">
        <div className="tabs">
          <button className="back-button">《</button>
          <button className="tab active">思路</button>
          <button className="tab">外观</button>
          <button className="tab">视图</button>
        </div>
        <div className="stats">
          <span>通过率: 37.50%</span>
          <span>已测: 5/8</span>
          <div className="progress" aria-label="通过率">
            <span className="pass" />
            <span className="fail" />
          </div>
          <span>标题：测试</span>
        </div>
        <div className="actions">
          <button className="ghost" onClick={onToggleAssistant}>
            <Bot size={15} />
            {assistantOpen ? '关闭AI助手' : '打开AI助手'}
          </button>
          <button className="ghost">
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
        <button className="tool">
          <Upload size={15} />
          插入下级
        </button>
        <button className="tool">
          <Upload size={15} />
          插入上级
        </button>
        <button className="tool">上移</button>
        <button className="tool">下移</button>
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
