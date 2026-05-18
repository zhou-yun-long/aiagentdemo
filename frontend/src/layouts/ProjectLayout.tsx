import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AppSidebar } from '../components/AppSidebar';
import { ProjectTopBar } from '../components/ProjectTopBar';
import { useProjectListStore } from '../features/navigation/projectListStore';
import { useProjectLoader } from '../features/workspace/useProjectLoader';

export default function ProjectLayout() {
  const projects = useProjectListStore((s) => s.projects);
  const fetchProjects = useProjectListStore((s) => s.fetchProjects);
  const { switchProject } = useProjectLoader();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="project-layout">
      <AppSidebar projects={projects} onSwitchProject={switchProject} />
      <div className="project-layout-main">
        <ProjectTopBar projects={projects} />
        <div className="project-layout-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
