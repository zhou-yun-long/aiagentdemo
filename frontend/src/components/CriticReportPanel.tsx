import { CheckSquare, LocateFixed, PlusCircle } from 'lucide-react';
import type { CriticVisualReport } from '../types/generation';
import { useGenerationStore } from '../features/generation/generationStore';
import { useWorkspaceStore } from '../features/workspace/workspaceStore';

type CriticReportPanelProps = {
  report: CriticVisualReport;
};

const statusColor: Record<string, string> = {
  good: '#156c2c',
  warning: '#8a5a00',
  danger: '#b91c1c',
  covered: '#156c2c',
  partial: '#8a5a00',
  missing: '#b91c1c'
};

const statusBg: Record<string, string> = {
  good: '#dcfce7',
  warning: '#fff1b8',
  danger: '#fee2e2',
  covered: '#dcfce7',
  partial: '#fff1b8',
  missing: '#fee2e2'
};

const statusLabel: Record<string, string> = {
  good: '良好',
  warning: '注意',
  danger: '风险',
  covered: '已覆盖',
  partial: '部分覆盖',
  missing: '未覆盖'
};

const riskLevelLabel: Record<string, string> = {
  high: '高',
  medium: '中',
  low: '低'
};

const riskLevelColor: Record<string, string> = {
  high: '#b91c1c',
  medium: '#8a5a00',
  low: '#6b7280'
};

function ScoreRing({ score }: { score: number }) {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? '#156c2c' : score >= 60 ? '#8a5a00' : '#b91c1c';

  return (
    <div className="critic-score-ring">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
        <circle
          cx="44"
          cy="44"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 44 44)"
        />
      </svg>
      <span className="critic-score-ring-value" style={{ color }}>{score}</span>
    </div>
  );
}

export function CriticReportPanel({ report }: CriticReportPanelProps) {
  const totalCases = Object.values(report.priorityDistribution).reduce((s, v) => s + v, 0);
  const input = useGenerationStore((state) => state.input);
  const setInput = useGenerationStore((state) => state.setInput);
  const nodes = useWorkspaceStore((state) => state.nodes);
  const selectNode = useWorkspaceStore((state) => state.selectNode);

  const appendToNextInput = (text: string) => {
    const next = `请基于 Critic 评审建议补充测试用例：${text}`;
    setInput(input.trim() ? `${input.trim()}\n\n${next}` : next);
  };

  const focusRelatedCase = (titles: string[] = []) => {
    const target = nodes.find((node) =>
      node.kind === 'case' && titles.some((title) => node.title.includes(title) || title.includes(node.title))
    );
    if (target) {
      selectNode(target.id);
    }
  };

  return (
    <div className="critic-report">
      <div className="critic-report-header">
        <ScoreRing score={report.overallScore} />
        <div className="critic-report-header-text">
          <strong>质量评分</strong>
          <span>{report.overallScore >= 80 ? '整体质量良好' : report.overallScore >= 60 ? '有改进空间' : '需要重点关注'}</span>
        </div>
      </div>

      <div className="critic-section">
        <h4>维度评分</h4>
        <div className="critic-dimensions">
          {report.dimensions.map((dim) => (
            <div className="critic-dim-item" key={dim.key}>
              <div className="critic-dim-head">
                <span>{dim.label}</span>
                <span
                  className="critic-dim-badge"
                  style={{ color: statusColor[dim.status], background: statusBg[dim.status] }}
                >
                  {statusLabel[dim.status]} {dim.score}
                </span>
              </div>
              <div className="critic-dim-bar-track">
                <div
                  className="critic-dim-bar-fill"
                  style={{ width: `${dim.score}%`, background: statusColor[dim.status] }}
                />
              </div>
              <p className="critic-dim-summary">{dim.summary}</p>
            </div>
          ))}
        </div>
      </div>

      {report.coverageMatrix.length > 0 && (
        <div className="critic-section">
          <h4>覆盖矩阵</h4>
          <table className="critic-matrix">
            <thead>
              <tr>
                <th>拆解对象</th>
                <th>已覆盖</th>
                <th>缺失</th>
                <th>状态</th>
              </tr>
            </thead>
            <tbody>
              {report.coverageMatrix.map((item) => (
                <tr key={item.objectName}>
                  <td>{item.objectName}</td>
                  <td>{item.coveredCount}</td>
                  <td>{item.missingCount}</td>
                  <td>
                    <span
                      className="critic-matrix-badge"
                      style={{ color: statusColor[item.status], background: statusBg[item.status] }}
                    >
                      {statusLabel[item.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="critic-section">
        <h4>优先级分布</h4>
        <div className="critic-priority-bars">
          {(['P0', 'P1', 'P2', 'P3'] as const).map((p) => {
            const count = report.priorityDistribution[p];
            const maxBar = Math.max(...Object.values(report.priorityDistribution), 1);
            return (
              <div className="critic-priority-row" key={p}>
                <span className="critic-priority-label">{p}</span>
                <div className="critic-priority-bar-track">
                  <div
                    className="critic-priority-bar-fill"
                    style={{ width: `${(count / maxBar) * 100}%` }}
                  />
                </div>
                <span className="critic-priority-count">{count}</span>
              </div>
            );
          })}
        </div>
        <p className="critic-priority-total">共 {totalCases} 条用例</p>
      </div>

      {report.risks.length > 0 && (
        <div className="critic-section">
          <h4>风险列表</h4>
          <div className="critic-risks">
            {report.risks.map((risk, i) => (
              <div className="critic-risk-item" key={i}>
                <div className="critic-risk-head">
                  <span
                    className="critic-risk-level"
                    style={{ color: riskLevelColor[risk.level] }}
                  >
                    [{riskLevelLabel[risk.level]}风险]
                  </span>
                  <span>{risk.title}</span>
                </div>
                <p className="critic-risk-suggestion">{risk.suggestion}</p>
                {risk.relatedCaseTitles && risk.relatedCaseTitles.length > 0 && (
                  <p className="critic-risk-related">
                    关联用例：{risk.relatedCaseTitles.join('、')}
                  </p>
                )}
                <div className="critic-actions">
                  <button type="button" onClick={() => appendToNextInput(`${risk.title}。${risk.suggestion}`)}>
                    <PlusCircle size={13} />
                    加入下一轮补充
                  </button>
                  {risk.relatedCaseTitles && risk.relatedCaseTitles.length > 0 && (
                    <button type="button" onClick={() => focusRelatedCase(risk.relatedCaseTitles)}>
                      <LocateFixed size={13} />
                      定位关联用例
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {report.improvements.length > 0 && (
        <div className="critic-section">
          <h4>改进建议</h4>
          <ul className="critic-improvements">
            {report.improvements.map((item, i) => (
              <li key={i}>
                <span>{item}</span>
                <button type="button" onClick={() => appendToNextInput(item)}>
                  <CheckSquare size={13} />
                  加入补充
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
