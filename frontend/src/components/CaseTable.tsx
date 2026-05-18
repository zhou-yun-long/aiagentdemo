import type { ExecutionStatus, Priority } from '../shared/types/workspace';
import { executionStatusLabels } from '../shared/types/workspace';
import type { TestCaseDto } from '../shared/types/treeify';

type SortField = 'title' | 'priority' | 'executionStatus' | 'createdAt';

type CaseTableProps = {
  cases: TestCaseDto[];
  selectedIds: Set<number>;
  sortField: SortField;
  sortDir: 'asc' | 'desc';
  onSelect: (id: number) => void;
  onSelectAll: () => void;
  onSort: (field: SortField) => void;
  onEdit: (c: TestCaseDto) => void;
  onDelete: (id: number) => void;
};

const priorityClass: Record<Priority, string> = { P0: 'p0', P1: 'p1', P2: 'p2', P3: 'p3' };

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function sortIndicator(field: SortField, currentField: SortField, dir: 'asc' | 'desc') {
  if (field !== currentField) return null;
  return <span className="sort-arrow">{dir === 'asc' ? '▲' : '▼'}</span>;
}

export function CaseTable({ cases, selectedIds, sortField, sortDir, onSelect, onSelectAll, onSort, onEdit, onDelete }: CaseTableProps) {
  if (cases.length === 0) {
    return <div className="cases-empty">暂无用例数据</div>;
  }

  const allSelected = cases.length > 0 && cases.every((c) => selectedIds.has(c.id));

  return (
    <div className="cases-table-wrap">
      <table className="cases-table">
        <thead>
          <tr>
            <th className="checkbox-cell">
              <input type="checkbox" checked={allSelected} onChange={onSelectAll} />
            </th>
            <th className="sortable" onClick={() => onSort('title')}>
              用例名称{sortIndicator('title', sortField, sortDir)}
            </th>
            <th className="sortable" onClick={() => onSort('priority')}>
              优先级{sortIndicator('priority', sortField, sortDir)}
            </th>
            <th className="sortable" onClick={() => onSort('executionStatus')}>
              状态{sortIndicator('executionStatus', sortField, sortDir)}
            </th>
            <th className="sortable" onClick={() => onSort('createdAt')}>
              创建时间{sortIndicator('createdAt', sortField, sortDir)}
            </th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className={selectedIds.has(c.id) ? 'selected' : ''}>
              <td className="checkbox-cell">
                <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => onSelect(c.id)} />
              </td>
              <td className="title-cell" onClick={() => onEdit(c)}>{c.title}</td>
              <td>
                <span className={`priority ${priorityClass[c.priority] || 'p1'}`}>{c.priority}</span>
              </td>
              <td>{executionStatusLabels[c.executionStatus] || c.executionStatus}</td>
              <td style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(c.createdAt)}</td>
              <td>
                <div className="actions-cell">
                  <button className="ghost small" onClick={() => onEdit(c)}>查看/编辑</button>
                  <button className="ghost small danger" onClick={() => onDelete(c.id)}>删除</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
