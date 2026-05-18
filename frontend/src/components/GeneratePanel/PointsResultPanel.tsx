import { useGenerationStore } from '../../features/generation/generationStore';

const priorityClass: Record<string, string> = {
  P0: 'p0',
  P1: 'p1',
  P2: 'p2',
  P3: 'p3'
};

export function PointsResultPanel() {
  const pointsResult = useGenerationStore((state) => state.pointsResult);

  if (!pointsResult || pointsResult.points.length === 0) {
    return null;
  }

  return (
    <div className="points-result-panel">
      <div className="points-result-head">
        <strong>测试点结果</strong>
        <span className="points-count">{pointsResult.points.length} 个测试点</span>
      </div>
      <div className="points-list">
        {pointsResult.points.map((point, index) => (
          <div className="point-card" key={point.objectId || index}>
            <div className="point-card-header">
              <span className={`priority ${priorityClass[point.priority] || ''}`}>
                {point.priority}
              </span>
              <span className="point-title">{point.title}</span>
            </div>
            {point.dimensions && point.dimensions.length > 0 && (
              <div className="point-dimensions">
                {point.dimensions.map((dim) => (
                  <span className="tag mini" key={dim}>{dim}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
