import { useState } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Wand2,
  ClipboardList,
  BarChart3,
  Bug,
  ClipboardCheck,
  Settings,
  FolderOpen,
  BookOpen,
  FileBarChart,
  Puzzle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useProjectNavStore } from '../features/navigation/projectNavStore';
import type { ProjectDto } from '../shared/types/treeify';

interface AppSidebarProps {
  projects: ProjectDto[];
  onSwitchProject: (projectId: number) => void;
}

const mainNavItems = [
  { to: 'dashboard', label: '仪表盘', icon: LayoutDashboard },
  { to: 'cases', label: '用例管理', icon: FileText },
  { to: 'generate', label: '用例生成', icon: Wand2 },
  { to: 'plans', label: '测试计划', icon: ClipboardList },
  { to: 'reports', label: '测试报告', icon: BarChart3 },
  { to: 'defects', label: '缺陷跟踪', icon: Bug },
  { to: 'reviews', label: '用例评审', icon: ClipboardCheck },
];

const settingsItems = [
  { to: '/projects', label: '项目管理', icon: FolderOpen, isExternal: true },
  { to: 'cases', label: '知识库', icon: BookOpen, panel: 'knowledge' },
  { to: 'cases', label: '摘要', icon: FileBarChart, panel: 'summary' },
  { to: 'cases', label: '集成', icon: Puzzle, panel: 'integration' },
];

export function AppSidebar({ projects, onSwitchProject }: AppSidebarProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const collapsed = useProjectNavStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useProjectNavStore((s) => s.toggleSidebar);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value);
    if (id) onSwitchProject(id);
  };

  return (
    <aside className={`app-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="sidebar-logo">
        <span className="sidebar-logo-text">测试平台</span>
      </div>

      <div className="sidebar-project-switcher">
        {collapsed ? (
          <div className="sidebar-project-icon" title={projects.find(p => p.id === Number(projectId))?.name || '选择项目'}>
            <FolderOpen size={16} />
          </div>
        ) : (
          <select
            className="sidebar-project-select"
            value={projectId || ''}
            onChange={handleProjectChange}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <nav className="sidebar-nav">
        {mainNavItems.map((item) => (
          <NavLink
            key={item.to}
            to={`/projects/${projectId}/${item.to}`}
            end={item.to === 'dashboard'}
            className={({ isActive }) =>
              `sidebar-nav-item${isActive ? ' active' : ''}`
            }
          >
            <item.icon size={18} />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-spacer" />

      <div className="sidebar-settings">
        <button
          className="sidebar-settings-toggle"
          onClick={() => setSettingsOpen((v) => !v)}
          title="系统设置"
        >
          <Settings size={18} />
          {!collapsed && (
            <>
              <span>系统设置</span>
              {settingsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </>
          )}
        </button>
        {settingsOpen && !collapsed && (
          <div className="sidebar-settings-group">
            {settingsItems.map((item) =>
              item.isExternal ? (
                <NavLink
                  key={item.label}
                  to={item.to}
                  className="sidebar-nav-item sub"
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              ) : (
                <NavLink
                  key={item.label}
                  to={`/projects/${projectId}/${item.to}`}
                  className="sidebar-nav-item sub"
                >
                  <item.icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              )
            )}
          </div>
        )}
      </div>

      <button
        className="sidebar-collapse-btn"
        onClick={toggleSidebar}
        title={collapsed ? '展开侧边栏' : '折叠侧边栏'}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
    </aside>
  );
}
