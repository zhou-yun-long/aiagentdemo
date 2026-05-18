import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, FileSpreadsheet, FileText as FileTextIcon } from 'lucide-react';
import { getReport, exportReport } from '../../shared/api/reports';
import type { ReportSummaryDto } from '../../shared/types/report';

const PRIORITY_COLORS: Record<string, string> = {
  P0: '#f0282f',
  P1: '#2f7cf6',
  P2: '#8b5cf6',
  P3: '#ffcf5a',
};

const STATUS_SECTIONS = [
  { key: 'passed' as const, label: '通过', color: 'var(--green)' },
  { key: 'failed' as const, label: '失败', color: 'var(--red)' },
  { key: 'blocked' as const, label: '阻塞', color: '#8b5cf6' },
  { key: 'skipped' as const, label: '跳过', color: '#94a3b8' },
  { key: 'notRun' as const, label: '未执行', color: '#d1d5db' },
];

export default function ReportDetail() {
  const { projectId, reportId } = useParams<{ projectId: string; reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<ReportSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (!reportId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getReport(Number(reportId))
      .then((data) => {
        if (!cancelled) setReport(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || '加载报告详情失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  useEffect(() => {
    if (!showExportMenu) return;
    const handleClick = () => setShowExportMenu(false);
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showExportMenu]);

  const handleExport = async (format: 'excel' | 'pdf') => {
    if (!reportId || exporting) return;
    setExporting(true);
    setShowExportMenu(false);
    try {
      await exportReport(Number(reportId), format);
    } catch (err) {
      setError(err instanceof Error ? err.message : '导出失败');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-status loading">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return <div className="page-status error-banner">{error}</div>;
  }

  if (!report) {
    return <div className="page-status empty">报告不存在</div>;
  }

  const total = report.totalCases;
  const segments = STATUS_SECTIONS.map((s) => ({
    ...s,
    value: report[s.key],
    pct: total > 0 ? (report[s.key] / total) * 100 : 0,
  }));
  const maxPriorityCount = Math.max(1, ...report.priorityDistribution.map((p) => p.count));

  return (
    <div style={{ padding: '24px', maxWidth: 960 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button
          className="ghost"
          onClick={() => navigate(`/projects/${projectId}/reports`)}
        >
          <ArrowLeft size={16} /> 返回列表
        </button>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>报告详情</h2>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <button
            className="ghost"
            disabled={exporting}
            onClick={(e) => {
              e.stopPropagation();
              setShowExportMenu((v) => !v);
            }}
          >
            <Download size={16} /> {exporting ? '导出中...' : '导出'}
          </button>
          {showExportMenu && (
            <div className="export-menu" style={{ right: 0, left: 'auto' }}>
              <button onClick={() => handleExport('excel')}>
                <FileSpreadsheet size={16} /> 导出 Excel
              </button>
              <button onClick={() => handleExport('pdf')}>
                <FileTextIcon size={16} /> 导出 PDF
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Pass rate card */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <div style={{ flex: 1, padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `conic-gradient(${report.passRate >= 0.8 ? 'var(--green)' : report.passRate >= 0.5 ? '#f5a623' : 'var(--red)'} ${report.passRate * 360}deg, var(--surface-2) 0deg)`,
            flexShrink: 0,
          }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--surface)',
              fontSize: '18px',
              fontWeight: 700,
            }}>
              {(report.passRate * 100).toFixed(0)}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--muted)' }}>通过率</div>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>
              {report.passed} / {total} 用例通过
            </div>
          </div>
        </div>

        {/* Status breakdown bar */}
        <div style={{ flex: 2, padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)' }}>
          <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: 10 }}>执行状态分布</div>
          <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', background: 'var(--surface-2)', marginBottom: 14 }}>
            {segments.filter((s) => s.value > 0).map((s) => (
              <div
                key={s.key}
                style={{ width: `${s.pct}%`, background: s.color, minWidth: 2 }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
            {segments.map((s) => (
              <span key={s.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '12px', color: 'var(--muted)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: s.color }} />
                {s.label}: {s.value}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Priority distribution */}
      <div style={{ padding: '16px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', marginBottom: 20 }}>
        <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: 10 }}>优先级分布</div>
        <div style={{ display: 'grid', gap: 6 }}>
          {report.priorityDistribution.map((item) => (
            <div key={item.priority} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 24, fontSize: '12px', fontWeight: 600, color: 'var(--muted)' }}>
                {item.priority}
              </span>
              <div style={{ flex: 1, height: 14, borderRadius: 4, background: 'var(--surface-2)' }}>
                <div
                  style={{
                    width: `${(item.count / maxPriorityCount) * 100}%`,
                    height: '100%',
                    borderRadius: 4,
                    background: PRIORITY_COLORS[item.priority] || 'var(--blue)',
                  }}
                />
              </div>
              <span style={{ width: 20, fontSize: '12px', textAlign: 'right' }}>{item.count}</span>
            </div>
          ))}
          {report.priorityDistribution.length === 0 && (
            <span style={{ fontSize: '12px', color: 'var(--muted)' }}>暂无数据</span>
          )}
        </div>
      </div>

      {/* Failed cases */}
      {report.failedCases.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', marginBottom: 20, overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: 600 }}>
            <span style={{ color: 'var(--red)' }}>失败用例</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: '11px', color: '#a32020', background: '#fee2e2' }}>
              {report.failedCases.length}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="cases-table">
              <thead>
                <tr>
                  <th>用例标题</th>
                  <th>优先级</th>
                  <th>错误信息</th>
                </tr>
              </thead>
              <tbody>
                {report.failedCases.map((fc) => (
                  <tr key={fc.caseId}>
                    <td>{fc.title}</td>
                    <td>
                      <span className={`priority ${(fc.priority || '').toLowerCase()}`}>
                        {fc.priority}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: 300 }}>
                      {fc.errorMessage || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Blocked cases */}
      {report.blockedCases.length > 0 && (
        <div style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--surface)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 12px', borderBottom: '1px solid var(--border)', fontSize: '13px', fontWeight: 600 }}>
            <span style={{ color: '#8b5cf6' }}>阻塞用例</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', height: 20, padding: '0 6px', borderRadius: 4, fontSize: '11px', color: '#5b21b6', background: '#ede9fe' }}>
              {report.blockedCases.length}
            </span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="cases-table">
              <thead>
                <tr>
                  <th>用例标题</th>
                  <th>优先级</th>
                  <th>错误信息</th>
                </tr>
              </thead>
              <tbody>
                {report.blockedCases.map((bc) => (
                  <tr key={bc.caseId}>
                    <td>{bc.title}</td>
                    <td>
                      <span className={`priority ${(bc.priority || '').toLowerCase()}`}>
                        {bc.priority}
                      </span>
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--muted)', maxWidth: 300 }}>
                      {bc.errorMessage || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
