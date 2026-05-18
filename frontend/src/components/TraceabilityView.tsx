import type { TraceGraphDto } from '../shared/types/treeify';
import { TraceMindMap } from './TraceMindMap';

type TraceabilityViewProps = {
  graph?: TraceGraphDto | null;
  onSelectCase: (caseId: number) => void;
};

export function TraceabilityView({ graph, onSelectCase }: TraceabilityViewProps) {
  if (!graph || graph.nodes.length === 0) {
    return (
      <main className="trace-view empty">
        <div>
          <strong>暂无追踪链路</strong>
          <p>生成结果包含 requirementId、objectId、draftCaseId 映射后，会在这里展示追踪图。</p>
        </div>
      </main>
    );
  }

  return <TraceMindMap graph={graph} onSelectCase={onSelectCase} />;
}
