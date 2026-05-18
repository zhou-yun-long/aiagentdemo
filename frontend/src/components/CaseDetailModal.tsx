import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { ExecutionStatus, Priority } from '../shared/types/workspace';
import { executionStatusLabels, priorityOptions } from '../shared/types/workspace';
import type { TestCaseDto, TestCaseRequest } from '../shared/types/treeify';
import { createCase, updateCase, deleteCase } from '../shared/api/treeify';

type CaseDetailModalProps = {
  testCase: TestCaseDto | null;
  projectId: number;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
};

export function CaseDetailModal({ testCase, projectId, onClose, onSaved, onDeleted }: CaseDetailModalProps) {
  const isCreate = testCase === null;
  const [title, setTitle] = useState(testCase?.title ?? '');
  const [priority, setPriority] = useState<Priority>(testCase?.priority ?? 'P1');
  const [precondition, setPrecondition] = useState(testCase?.precondition ?? '');
  const [steps, setSteps] = useState(testCase?.steps.join('\n') ?? '');
  const [expected, setExpected] = useState(testCase?.expected ?? '');
  const [tags, setTags] = useState<string[]>(testCase?.tags ?? []);
  const [executionStatus, setExecutionStatus] = useState<ExecutionStatus>(testCase?.executionStatus ?? 'not_run');
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const handleSave = async () => {
    if (!title.trim()) {
      setError('标题不能为空');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const body: TestCaseRequest = {
        title: title.trim(),
        priority,
        precondition: precondition.trim(),
        steps: steps.split('\n').map((s) => s.trim()).filter(Boolean),
        expected: expected.trim(),
        tags,
        source: testCase?.source ?? 'manual',
        executionStatus,
        version: testCase?.version
      };
      if (isCreate) {
        await createCase(projectId, body);
      } else {
        await updateCase(testCase!.id, body);
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!testCase) return;
    if (!window.confirm(`确认删除用例「${testCase.title}」？`)) return;
    try {
      await deleteCase(testCase.id);
      onDeleted();
    } catch (e) {
      setError(e instanceof Error ? e.message : '删除失败');
    }
  };

  const addTag = () => {
    const tag = newTag.trim();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  return (
    <div className="cases-modal-overlay" onClick={onClose}>
      <div className="cases-modal" onClick={(e) => e.stopPropagation()}>
        <h2>{isCreate ? '新建用例' : '编辑用例'}</h2>
        {error && <p className="cases-error">{error}</p>}
        <div className="cases-modal-field">
          <label htmlFor="case-title">标题</label>
          <input id="case-title" value={title} onChange={(e) => setTitle(e.target.value)} autoFocus />
        </div>
        <div className="cases-modal-field">
          <label htmlFor="case-priority">优先级</label>
          <select id="case-priority" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {priorityOptions.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>
        <div className="cases-modal-field">
          <label htmlFor="case-status">执行状态</label>
          <select id="case-status" value={executionStatus} onChange={(e) => setExecutionStatus(e.target.value as ExecutionStatus)}>
            {(Object.entries(executionStatusLabels) as [ExecutionStatus, string][]).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
        <div className="cases-modal-field">
          <label htmlFor="case-precondition">前置条件</label>
          <textarea id="case-precondition" value={precondition} onChange={(e) => setPrecondition(e.target.value)} rows={2} />
        </div>
        <div className="cases-modal-field">
          <label htmlFor="case-steps">执行步骤（每行一步）</label>
          <textarea id="case-steps" value={steps} onChange={(e) => setSteps(e.target.value)} rows={4} />
        </div>
        <div className="cases-modal-field">
          <label htmlFor="case-expected">预期结果</label>
          <textarea id="case-expected" value={expected} onChange={(e) => setExpected(e.target.value)} rows={2} />
        </div>
        <div className="cases-modal-field">
          <label>标签</label>
          <div className="cases-modal-tags">
            {tags.map((tag) => (
              <span className="tag" key={tag} onClick={() => removeTag(tag)} title="点击移除">
                {tag} <X size={11} />
              </span>
            ))}
          </div>
          <div className="cases-modal-tag-input">
            <input
              placeholder="添加标签"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
            />
            <button className="ghost small" onClick={addTag}>添加</button>
          </div>
        </div>
        {!isCreate && testCase && (
          <div className="cases-modal-field">
            <label>元信息</label>
            <div className="read-only">
              ID: {testCase.id} · 来源: {testCase.source} · 版本: {testCase.version}<br />
              创建: {new Date(testCase.createdAt).toLocaleString('zh-CN')} · 更新: {new Date(testCase.updatedAt).toLocaleString('zh-CN')}
            </div>
          </div>
        )}
        <div className="cases-modal-actions">
          <div className="left-actions">
            {!isCreate && testCase && (
              <button className="ghost danger" onClick={handleDelete}>删除此用例</button>
            )}
          </div>
          <div className="right-actions">
            <button className="ghost" onClick={onClose}>取消</button>
            <button className="primary" onClick={handleSave} disabled={saving}>
              {saving ? '保存中...' : isCreate ? '创建' : '保存'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
