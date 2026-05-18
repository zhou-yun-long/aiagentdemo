import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileBarChart } from 'lucide-react';
import { listReports } from '../../shared/api/reports';
import type { TestReportDto } from '../../shared/types/report';

export default function ReportList() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [reports, setReports] = useState<TestReportDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listReports(Number(projectId))
      .then((data) => {
        if (!cancelled) setReports(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '加载报告列表失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return (
      <div className="page-status loading">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-status error-banner">{error}</div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="page-status empty">
        <FileBarChart size={32} />
        <p>暂无测试报告</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 600 }}>测试报告</h2>
      <div className="cases-table-wrap">
        <table className="cases-table">
          <thead>
            <tr>
              <th>报告名称</th>
              <th>通过率</th>
              <th>关联计划</th>
              <th>总用例</th>
              <th>通过</th>
              <th>失败</th>
              <th>创建时间</th>
            </tr>
          </thead>
          <tbody>
            {reports.map((report) => (
              <tr
                key={report.id}
                style={{ cursor: 'pointer' }}
                onClick={() => navigate(`/projects/${projectId}/reports/${report.id}`)}
              >
                <td className="title-cell">{report.name}</td>
                <td>
                  <span
                    style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: report.passRate >= 0.8 ? '#156c2c' : report.passRate >= 0.5 ? '#8a5a00' : '#a32020',
                      background: report.passRate >= 0.8 ? '#dcfce7' : report.passRate >= 0.5 ? '#fff8d6' : '#fee2e2',
                    }}
                  >
                    {(report.passRate * 100).toFixed(1)}%
                  </span>
                </td>
                <td>{report.planName || '-'}</td>
                <td>{report.totalCases}</td>
                <td style={{ color: 'var(--green)' }}>{report.passed}</td>
                <td style={{ color: 'var(--red)' }}>{report.failed}</td>
                <td style={{ color: 'var(--muted)', fontSize: '12px' }}>
                  {report.createdAt ? new Date(report.createdAt).toLocaleString() : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
