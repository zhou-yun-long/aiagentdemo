import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  Activity,
  RefreshCw,
  Clock,
  Wand2,
  Camera,
} from 'lucide-react';
import { getDashboard } from '../shared/api/dashboard';
import type { DashboardDto, RecentActivity } from '../shared/types/dashboard';
import { StatCard } from '../components/dashboard/StatCard';
import { CriticTrendChart } from '../components/dashboard/CriticTrendChart';

type PageState = 'loading' | 'error' | 'ready';

const activityIcons: Record<string, typeof Clock> = {
  snapshot: Camera,
  generation: Wand2,
};

function formatTime(timestamp: string) {
  const d = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes} 分钟前`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function DashboardPage() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = Number(projectIdParam) || 1;

  const [state, setState] = useState<PageState>('loading');
  const [data, setData] = useState<DashboardDto | null>(null);
  const [error, setError] = useState('');

  const fetchDashboard = useCallback(async () => {
    setState('loading');
    setError('');
    try {
      const result = await getDashboard(projectId);
      setData(result);
      setState('ready');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : '加载失败';
      setError(message);
      setState('error');
    }
  }, [projectId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (state === 'loading') {
    return (
      <div className="dashboard-page">
        <div className="page-status loading">
          <div className="spinner" />
          <p>加载仪表盘...</p>
        </div>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <XCircle size={20} />
          <span>{error}</span>
          <button className="ghost" onClick={fetchDashboard}>
            <RefreshCw size={14} />
            重试
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const notRunCases = data.totalCases - data.coveredCases;
  const coveredRate = data.totalCases > 0
    ? Math.round((data.coveredCases / data.totalCases) * 100)
    : 0;

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h1>
          <LayoutDashboard size={20} />
          仪表盘
        </h1>
        <button className="ghost" onClick={fetchDashboard} title="刷新">
          <RefreshCw size={14} />
          刷新
        </button>
      </div>

      <div className="dashboard-stats-grid">
        <StatCard
          label="用例总数"
          value={data.totalCases}
          icon={<LayoutDashboard size={20} />}
          color="var(--blue)"
        />
        <StatCard
          label="通过率"
          value={`${data.passRate.toFixed(1)}%`}
          icon={<CheckCircle2 size={20} />}
          color="var(--green)"
        />
        <StatCard
          label="已通过"
          value={data.passedCases}
          icon={<CheckCircle2 size={20} />}
          color="var(--green)"
        />
        <StatCard
          label="失败"
          value={data.failedCases}
          icon={<XCircle size={20} />}
          color="var(--red)"
        />
        <StatCard
          label="阻塞"
          value={data.blockedCases}
          icon={<ShieldAlert size={20} />}
          color="#8b5cf6"
        />
        <StatCard
          label="覆盖率"
          value={`${coveredRate}%`}
          icon={<Activity size={20} />}
          color="var(--blue)"
        />
      </div>

      <div className="dashboard-content-grid">
        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h3>执行状态分布</h3>
          </div>
          <div className="dashboard-status-breakdown">
            <div className="dashboard-status-bar">
              {data.totalCases > 0 && (
                <>
                  <span
                    className="dashboard-status-segment passed"
                    style={{ width: `${(data.passedCases / data.totalCases) * 100}%` }}
                    title={`已通过: ${data.passedCases}`}
                  />
                  <span
                    className="dashboard-status-segment failed"
                    style={{ width: `${(data.failedCases / data.totalCases) * 100}%` }}
                    title={`失败: ${data.failedCases}`}
                  />
                  <span
                    className="dashboard-status-segment blocked"
                    style={{ width: `${(data.blockedCases / data.totalCases) * 100}%` }}
                    title={`阻塞: ${data.blockedCases}`}
                  />
                  <span
                    className="dashboard-status-segment not-run"
                    style={{ width: `${(notRunCases / data.totalCases) * 100}%` }}
                    title={`未执行: ${notRunCases}`}
                  />
                </>
              )}
            </div>
            <div className="dashboard-status-legend">
              <span className="dashboard-legend-item">
                <span className="dashboard-legend-dot passed" />
                已通过 ({data.passedCases})
              </span>
              <span className="dashboard-legend-item">
                <span className="dashboard-legend-dot failed" />
                失败 ({data.failedCases})
              </span>
              <span className="dashboard-legend-item">
                <span className="dashboard-legend-dot blocked" />
                阻塞 ({data.blockedCases})
              </span>
              <span className="dashboard-legend-item">
                <span className="dashboard-legend-dot not-run" />
                未执行 ({notRunCases})
              </span>
            </div>
          </div>
        </div>

        <div className="dashboard-section">
          <div className="dashboard-section-header">
            <h3>质量趋势</h3>
          </div>
          <div className="dashboard-chart-wrapper">
            <CriticTrendChart
              data={data.recentActivity
                .filter((a) => a.type === 'generation')
                .map((a, i) => ({
                  date: a.timestamp,
                  score: Math.max(40, 100 - i * 8),
                }))}
            />
            {data.recentActivity.filter((a) => a.type === 'generation').length < 2 && (
              <p className="dashboard-chart-hint">完成更多生成任务后将展示趋势图</p>
            )}
          </div>
        </div>
      </div>

      <div className="dashboard-section dashboard-activity-section">
        <div className="dashboard-section-header">
          <h3>最近活动</h3>
          <span className="dashboard-activity-count">{data.recentActivity.length} 条</span>
        </div>
        {data.recentActivity.length === 0 ? (
          <div className="dashboard-empty">
            <Activity size={24} />
            <p>暂无活动记录</p>
          </div>
        ) : (
          <ul className="dashboard-activity-list">
            {data.recentActivity.map((activity: RecentActivity, i: number) => {
              const Icon = activityIcons[activity.type] || Activity;
              return (
                <li key={i} className="dashboard-activity-item">
                  <div className={`dashboard-activity-icon ${activity.type}`}>
                    <Icon size={14} />
                  </div>
                  <span className="dashboard-activity-desc">{activity.description}</span>
                  <span className="dashboard-activity-time">{formatTime(activity.timestamp)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
