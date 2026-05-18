import '@ant-design/v5-patch-for-react-19';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import ProjectsPage from './pages/ProjectsPage';
import ShareView from './pages/ShareView';
import DashboardPage from './pages/DashboardPage';
import CasesWorkspacePage from './pages/CasesWorkspacePage';
import PlansPage from './pages/PlansPage';
import PlanDetailPage from './pages/PlanDetailPage';
import ReportsPage from './pages/ReportsPage';
import ReportDetailPage from './pages/ReportDetailPage';
import LegacyRedirect from './components/LegacyRedirect';
import ProjectLayout from './layouts/ProjectLayout';
import './styles/app.css';

/**
 * 临时 GeneratePage：等 Phase 2 完成后替换为完整生成页。
 * 当前渲染空状态。
 */
function GeneratePagePlaceholder() {
  return (
    <div className="page-placeholder">
      <h2>用例生成</h2>
      <p>模块开发中，即将上线</p>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1f6cff',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          {/* 根路径重定向到项目列表 */}
          <Route path="/" element={<Navigate to="/projects" replace />} />

          {/* 项目列表（独立页面，无 Sidebar） */}
          <Route path="/projects" element={<ProjectsPage />} />

          {/* 项目内路由（带 ProjectLayout 壳） */}
          <Route path="/projects/:projectId" element={<ProjectLayout />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="cases" element={<CasesWorkspacePage />} />
            <Route path="generate" element={<GeneratePagePlaceholder />} />
            <Route path="plans" element={<PlansPage />} />
            <Route path="plans/:planId" element={<PlanDetailPage />} />
            <Route path="reports" element={<ReportsPage />} />
            <Route path="reports/:reportId" element={<ReportDetailPage />} />
          </Route>

          {/* 分享视图（独立，无 Sidebar） */}
          <Route path="/share/:shareToken" element={<ShareView />} />

          {/* 旧路由兼容重定向 */}
          <Route path="/cases" element={<LegacyRedirect />} />
          <Route path="*" element={<LegacyRedirect />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </React.StrictMode>
);
