import { useParams, useLocation, Link } from 'react-router-dom';
import type { ProjectDto } from '../shared/types/treeify';

interface ProjectTopBarProps {
  projects: ProjectDto[];
}

const routeLabels: Record<string, string> = {
  dashboard: '仪表盘',
  cases: '用例管理',
  generate: '用例生成',
  plans: '测试计划',
  reports: '测试报告',
};

export function ProjectTopBar({ projects }: ProjectTopBarProps) {
  const { projectId } = useParams<{ projectId: string }>();
  const location = useLocation();

  const project = projects.find((p) => p.id === Number(projectId));
  const segment = location.pathname.split('/').filter(Boolean)[2] || 'dashboard';
  const label = routeLabels[segment] || segment;

  return (
    <header className="project-top-bar">
      <div className="top-bar-breadcrumb">
        <Link to="/projects" className="top-bar-link">项目</Link>
        <span className="top-bar-sep">/</span>
        <span className="top-bar-project">{project?.name || `项目 ${projectId}`}</span>
        <span className="top-bar-sep">/</span>
        <span className="top-bar-module">{label}</span>
      </div>
    </header>
  );
}
