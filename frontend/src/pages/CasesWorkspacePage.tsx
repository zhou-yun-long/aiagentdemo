import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, Trash2 } from 'lucide-react';
import {
  getProjectCases, getProjectCaseStats, deleteCase
} from '../shared/api/treeify';
import type { TestCaseDto, CaseStatsDto } from '../shared/types/treeify';
import type { Priority } from '../shared/types/workspace';
import { CaseTable } from '../components/CaseTable';
import { CaseFilterBar, type CaseTab } from '../components/CaseFilterBar';
import { CaseDetailModal } from '../components/CaseDetailModal';
import App from '../App';

type SortField = 'title' | 'priority' | 'executionStatus' | 'createdAt';

const priorityRank: Record<Priority, number> = { P0: 0, P1: 1, P2: 2, P3: 3 };

export default function CasesWorkspacePage() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = Number(projectIdParam);

  const [cases, setCases] = useState<TestCaseDto[]>([]);
  const [stats, setStats] = useState<CaseStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<CaseTab>('all');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [editingCase, setEditingCase] = useState<TestCaseDto | null>(null);
  const [creating, setCreating] = useState(false);
  const [sortField, setSortField] = useState<SortField>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const loadData = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [casesData, statsData] = await Promise.all([
        getProjectCases(projectId),
        getProjectCaseStats(projectId)
      ]);
      setCases(casesData);
      setStats(statsData);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : '加载用例失败');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { loadData(); }, [loadData]);

  const filteredCases = useMemo(() => {
    let result = cases;

    if (activeTab === 'uncovered') {
      result = result.filter((c) => c.executionStatus === 'not_run');
    } else if (activeTab === 'deprecated') {
      result = result.filter((c) => c.tags.includes('已废弃'));
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        c.precondition.toLowerCase().includes(q) ||
        c.steps.some((s) => s.toLowerCase().includes(q)) ||
        c.expected.toLowerCase().includes(q)
      );
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortField === 'title') {
        cmp = a.title.localeCompare(b.title, 'zh-CN');
      } else if (sortField === 'priority') {
        cmp = priorityRank[a.priority] - priorityRank[b.priority];
      } else if (sortField === 'executionStatus') {
        cmp = a.executionStatus.localeCompare(b.executionStatus);
      } else {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [cases, activeTab, search, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'createdAt' ? 'desc' : 'asc');
    }
  };

  const handleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (filteredCases.every((c) => selectedIds.has(c.id))) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCases.map((c) => c.id)));
    }
  };

  const handleBatchDelete = async () => {
    if (!window.confirm(`确认删除选中的 ${selectedIds.size} 条用例？`)) return;
    await Promise.all(Array.from(selectedIds).map((id) => deleteCase(id).catch(() => undefined)));
    setSelectedIds(new Set());
    loadData();
  };

  const handleDelete = async (id: number) => {
    const c = cases.find((item) => item.id === id);
    if (!window.confirm(`确认删除用例「${c?.title ?? id}」？`)) return;
    await deleteCase(id);
    loadData();
  };

  const handleExport = () => {
    const header = ['用例名称', '优先级', '状态', '前置条件', '执行步骤', '预期结果'];
    const rows = filteredCases.map((c) => [
      c.title, c.priority, c.executionStatus, c.precondition, c.steps.join('；'), c.expected
    ]);
    const csv = [header, ...rows].map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `用例导出-${projectId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="cases-workspace">
      {/* 思维导图区域 */}
      <div className="cases-workspace-mindmap">
        <App />
      </div>

      {/* 用例列表区域 */}
      <div className="cases-workspace-list">
        {error && <div className="cases-error" onClick={loadData}>{error}（点击重试）</div>}

        {loading ? (
          <div className="cases-loading">
            <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
            加载中...
          </div>
        ) : (
          <>
            <CaseFilterBar
              activeTab={activeTab}
              search={search}
              onTabChange={setActiveTab}
              onSearchChange={setSearch}
            />

            <div className="cases-actions-bar">
              <div className="cases-actions-left">
                {selectedIds.size > 0 && (
                  <>
                    <button className="ghost small" onClick={() => setSelectedIds(new Set())}>
                      取消选择 ({selectedIds.size})
                    </button>
                    <button className="ghost small" onClick={handleBatchDelete}>
                      <Trash2 size={13} />
                      批量删除
                    </button>
                  </>
                )}
              </div>
              <div className="cases-actions-right">
                <button className="ghost small" onClick={handleExport}>导出</button>
                <button className="primary small" onClick={() => setCreating(true)}>新建用例</button>
              </div>
            </div>

            <CaseTable
              cases={filteredCases}
              selectedIds={selectedIds}
              sortField={sortField}
              sortDir={sortDir}
              onSelect={handleSelect}
              onSelectAll={handleSelectAll}
              onSort={handleSort}
              onEdit={setEditingCase}
              onDelete={handleDelete}
            />

            {filteredCases.length > 0 && cases.length !== filteredCases.length && (
              <p style={{ marginTop: 8, fontSize: 12, color: 'var(--muted)' }}>
                显示 {filteredCases.length} / {cases.length} 条
              </p>
            )}
          </>
        )}

        {(editingCase || creating) && (
          <CaseDetailModal
            testCase={creating ? null : editingCase}
            projectId={projectId}
            onClose={() => { setEditingCase(null); setCreating(false); }}
            onSaved={() => { setEditingCase(null); setCreating(false); loadData(); }}
            onDeleted={() => { setEditingCase(null); setCreating(false); loadData(); }}
          />
        )}
      </div>
    </div>
  );
}
