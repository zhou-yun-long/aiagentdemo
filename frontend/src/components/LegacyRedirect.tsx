import { Navigate, useLocation, useSearchParams } from 'react-router-dom';

/**
 * 处理旧路由到新路由的重定向：
 * - /?projectId=N  → /projects/N/cases
 * - /cases?projectId=N → /projects/N/cases
 * - / (无 query)  → /projects
 * - /cases (无 query) → /projects
 * - 其他未匹配路径 → /projects
 */
export default function LegacyRedirect() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const projectIdRaw = searchParams.get('projectId');

  // 验证 projectId 是正整数
  const projectId = projectIdRaw && /^\d+$/.test(projectIdRaw) ? Number(projectIdRaw) : null;

  if (projectId && projectId > 0) {
    return <Navigate to={`/projects/${projectId}/cases`} replace />;
  }

  // 无有效 projectId 时统一跳到项目列表
  return <Navigate to="/projects" replace />;
}
