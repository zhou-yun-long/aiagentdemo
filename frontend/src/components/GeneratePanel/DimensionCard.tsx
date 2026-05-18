import { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckSquare, Loader2, Square, X } from 'lucide-react';
import { useGenerationStore } from '../../features/generation/generationStore';
import { getDimensions } from '../../shared/api/dimensions';
import type { DimensionCategory, DimensionDictionary } from '../../shared/api/dimensions';

type ScenarioTab = 'general' | 'doc' | 'video' | 'all';

const scenarioTabs: Array<{ key: ScenarioTab; label: string }> = [
  { key: 'general', label: '通用' },
  { key: 'doc', label: '文档' },
  { key: 'video', label: '视频' },
  { key: 'all', label: '全部' },
];

function CategoryColumn({
  category,
  selectedKeys,
  onToggle,
  onToggleAll,
}: {
  category: DimensionCategory;
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: (keys: string[], select: boolean) => void;
}) {
  const allKeys = category.items.map((item) => item.key);
  const allSelected = allKeys.length > 0 && allKeys.every((k) => selectedKeys.has(k));
  const noneSelected = allKeys.every((k) => !selectedKeys.has(k));

  return (
    <div className="dim-category-col">
      <div className="dim-category-head">
        <span className="dim-category-label">{category.label}</span>
        <div className="dim-category-actions">
          <button
            type="button"
            className="small"
            disabled={allSelected}
            onClick={() => onToggleAll(allKeys, true)}
            title="全选"
          >
            全选
          </button>
          <button
            type="button"
            className="small"
            disabled={noneSelected}
            onClick={() => onToggleAll(allKeys, false)}
            title="清空"
          >
            清空
          </button>
        </div>
      </div>
      <div className="dim-item-list">
        {category.items.map((item) => {
          const checked = selectedKeys.has(item.key);
          return (
            <label
              key={item.key}
              className={`dim-item${checked ? ' selected' : ''}${item.priority === 'P0' ? ' p0-highlight' : ''}`}
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggle(item.key)}
              />
              <span className="dim-item-label">{item.label}</span>
              <span className={`priority ${item.priority.toLowerCase()}`}>{item.priority}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

export function DimensionCard() {
  const [dictionary, setDictionary] = useState<DimensionDictionary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeScenario, setActiveScenario] = useState<ScenarioTab>('general');

  const config = useGenerationStore((s) => s.config);
  const setConfig = useGenerationStore((s) => s.setConfig);
  const status = useGenerationStore((s) => s.status);
  const isRunning = status === 'running' || status === 'waiting_confirm';

  // Load dimensions on mount
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getDimensions()
      .then((data) => {
        if (!cancelled) setDictionary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : '加载维度失败');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Filtered scenarios based on active tab
  const filteredScenarios = useMemo(() => {
    if (!dictionary) return [];
    if (activeScenario === 'all') return dictionary.businessScenarios;
    return dictionary.businessScenarios.filter((s) => s.key === activeScenario);
  }, [dictionary, activeScenario]);

  const selectedScenarioSet = useMemo(() => new Set(config.businessScenarios), [config.businessScenarios]);
  const selectedDimensionSet = useMemo(() => new Set(config.dimensions), [config.dimensions]);

  const handleScenarioToggle = useCallback(
    (key: string) => {
      if (isRunning) return;
      const next = selectedScenarioSet.has(key)
        ? config.businessScenarios.filter((k) => k !== key)
        : [...config.businessScenarios, key];
      setConfig({ businessScenarios: next });
    },
    [isRunning, config.businessScenarios, selectedScenarioSet, setConfig]
  );

  const handleScenarioToggleAll = useCallback(
    (keys: string[], select: boolean) => {
      if (isRunning) return;
      if (select) {
        const merged = new Set([...config.businessScenarios, ...keys]);
        setConfig({ businessScenarios: Array.from(merged) });
      } else {
        const removeSet = new Set(keys);
        setConfig({ businessScenarios: config.businessScenarios.filter((k) => !removeSet.has(k)) });
      }
    },
    [isRunning, config.businessScenarios, setConfig]
  );

  const handleDimensionToggle = useCallback(
    (key: string) => {
      if (isRunning) return;
      const next = selectedDimensionSet.has(key)
        ? config.dimensions.filter((k) => k !== key)
        : [...config.dimensions, key];
      setConfig({ dimensions: next });
    },
    [isRunning, config.dimensions, selectedDimensionSet, setConfig]
  );

  const handleDimensionToggleAll = useCallback(
    (keys: string[], select: boolean) => {
      if (isRunning) return;
      if (select) {
        const merged = new Set([...config.dimensions, ...keys]);
        setConfig({ dimensions: Array.from(merged) });
      } else {
        const removeSet = new Set(keys);
        setConfig({ dimensions: config.dimensions.filter((k) => !removeSet.has(k)) });
      }
    },
    [isRunning, config.dimensions, setConfig]
  );

  // Summary counts
  const scenarioCount = config.businessScenarios.length;
  const dimensionCount = config.dimensions.length;

  if (loading) {
    return (
      <div className="dim-card">
        <div className="dim-card-loading">
          <Loader2 size={16} className="spinner-icon" />
          <span>加载维度配置...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dim-card">
        <div className="dim-card-error">{error}</div>
      </div>
    );
  }

  if (!dictionary) return null;

  return (
    <div className="dim-card">
      {/* Header */}
      <div className="dim-card-head">
        <strong>测试维度配置</strong>
        <span className="dim-card-count">
          {scenarioCount} 场景 / {dimensionCount} 维度
        </span>
      </div>

      {/* Business scenario section */}
      <div className="dim-section">
        <div className="dim-section-title">业务场景</div>
        <div className="dim-scenario-tabs">
          {scenarioTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={`dim-scenario-tab${activeScenario === tab.key ? ' active' : ''}`}
              onClick={() => setActiveScenario(tab.key)}
              disabled={isRunning}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="dim-scenario-list">
          {filteredScenarios.map((scenario) => {
            const checked = selectedScenarioSet.has(scenario.key);
            return (
              <label
                key={scenario.key}
                className={`dim-scenario-item${checked ? ' selected' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => handleScenarioToggle(scenario.key)}
                  disabled={isRunning}
                />
                <span>{scenario.label}</span>
              </label>
            );
          })}
          {filteredScenarios.length === 0 && (
            <span className="dim-empty-hint">暂无场景数据</span>
          )}
        </div>
        {activeScenario !== 'all' && filteredScenarios.length > 0 && (
          <div className="dim-scenario-bulk">
            <button
              type="button"
              className="small"
              onClick={() =>
                handleScenarioToggleAll(
                  filteredScenarios.map((s) => s.key),
                  true
                )
              }
              disabled={isRunning}
            >
              <CheckSquare size={13} />
              全选
            </button>
            <button
              type="button"
              className="small"
              onClick={() =>
                handleScenarioToggleAll(
                  filteredScenarios.map((s) => s.key),
                  false
                )
              }
              disabled={isRunning}
            >
              <Square size={13} />
              清空
            </button>
          </div>
        )}
      </div>

      {/* Dimensions section - three column layout */}
      <div className="dim-section">
        <div className="dim-section-title">测试维度</div>
        <div className="dim-category-grid">
          {dictionary.categories.map((category) => (
            <CategoryColumn
              key={category.key}
              category={category}
              selectedKeys={selectedDimensionSet}
              onToggle={handleDimensionToggle}
              onToggleAll={handleDimensionToggleAll}
            />
          ))}
        </div>
      </div>

      {/* Selected summary tags */}
      {(scenarioCount > 0 || dimensionCount > 0) && (
        <div className="dim-selected-summary">
          {config.businessScenarios.map((key) => {
            const scenario = dictionary.businessScenarios.find((s) => s.key === key);
            return (
              <span key={key} className="dim-tag">
                {scenario?.label ?? key}
                <button
                  type="button"
                  aria-label={`移除 ${scenario?.label ?? key}`}
                  onClick={() => handleScenarioToggle(key)}
                  disabled={isRunning}
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}
          {config.dimensions.map((key) => {
            const item = dictionary.categories
              .flatMap((c) => c.items)
              .find((i) => i.key === key);
            return (
              <span key={key} className="dim-tag dim-tag-dim">
                {item?.label ?? key}
                <button
                  type="button"
                  aria-label={`移除 ${item?.label ?? key}`}
                  onClick={() => handleDimensionToggle(key)}
                  disabled={isRunning}
                >
                  <X size={11} />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
