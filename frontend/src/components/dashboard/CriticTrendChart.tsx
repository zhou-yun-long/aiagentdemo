interface DataPoint {
  date: string;
  score: number;
}

interface CriticTrendChartProps {
  data: DataPoint[];
  width?: number;
  height?: number;
}

export function CriticTrendChart({ data, width = 560, height = 200 }: CriticTrendChartProps) {
  if (data.length < 2) {
    return (
      <div className="dashboard-chart-empty">
        <p>数据不足，至少需要 2 个数据点</p>
      </div>
    );
  }

  const padding = { top: 20, right: 20, bottom: 40, left: 44 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const scores = data.map((d) => d.score);
  const minScore = Math.max(0, Math.floor(Math.min(...scores) / 10) * 10 - 10);
  const maxScore = Math.min(100, Math.ceil(Math.max(...scores) / 10) * 10 + 10);
  const scoreRange = maxScore - minScore || 1;

  const xStep = chartW / (data.length - 1);

  const points = data.map((d, i) => ({
    x: padding.left + i * xStep,
    y: padding.top + chartH - ((d.score - minScore) / scoreRange) * chartH,
    ...d,
  }));

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaD = `${pathD} L ${points[points.length - 1].x} ${padding.top + chartH} L ${points[0].x} ${padding.top + chartH} Z`;

  const yTicks = 5;
  const yTickValues = Array.from({ length: yTicks + 1 }, (_, i) =>
    minScore + (scoreRange / yTicks) * i
  );

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  };

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      className="dashboard-chart-svg"
    >
      {/* Grid lines */}
      {yTickValues.map((val) => {
        const y = padding.top + chartH - ((val - minScore) / scoreRange) * chartH;
        return (
          <g key={val}>
            <line
              x1={padding.left}
              y1={y}
              x2={padding.left + chartW}
              y2={y}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              fill="var(--muted)"
              fontSize={11}
            >
              {Math.round(val)}
            </text>
          </g>
        );
      })}

      {/* Area fill */}
      <path d={areaD} fill="var(--blue)" fillOpacity={0.08} />

      {/* Line */}
      <path d={pathD} fill="none" stroke="var(--blue)" strokeWidth={2} />

      {/* Data points */}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3} fill="var(--surface)" stroke="var(--blue)" strokeWidth={2} />
          {i === points.length - 1 && (
            <circle cx={p.x} cy={p.y} r={5} fill="var(--blue)" />
          )}
        </g>
      ))}

      {/* X-axis labels */}
      {points.map((p, i) => {
        const showEvery = Math.max(1, Math.ceil(data.length / 8));
        if (i % showEvery !== 0 && i !== data.length - 1) return null;
        return (
          <text
            key={i}
            x={p.x}
            y={padding.top + chartH + 24}
            textAnchor="middle"
            fill="var(--muted)"
            fontSize={11}
          >
            {formatDate(p.date)}
          </text>
        );
      })}
    </svg>
  );
}
