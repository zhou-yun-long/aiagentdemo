import { Search, X } from 'lucide-react';
import { useState } from 'react';

export type CaseTab = 'all' | 'uncovered' | 'deprecated';

type CaseFilterBarProps = {
  activeTab: CaseTab;
  search: string;
  onTabChange: (tab: CaseTab) => void;
  onSearchChange: (search: string) => void;
};

const tabs: Array<{ key: CaseTab; label: string }> = [
  { key: 'all', label: '全部用例' },
  { key: 'uncovered', label: '未覆盖' },
  { key: 'deprecated', label: '已废弃' }
];

export function CaseFilterBar({ activeTab, search, onTabChange, onSearchChange }: CaseFilterBarProps) {
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="cases-tabs-bar">
      <div className="cases-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`cases-tab ${activeTab === tab.key ? 'active' : ''}`}
            onClick={() => onTabChange(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="cases-search-toggle">
        {searchOpen ? (
          <div className="cases-search-inline">
            <input
              type="text"
              placeholder="搜索用例..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              autoFocus
            />
            <button className="ghost small" onClick={() => { setSearchOpen(false); onSearchChange(''); }}>
              <X size={13} />
            </button>
          </div>
        ) : (
          <button className="ghost small" onClick={() => setSearchOpen(true)} title="搜索">
            <Search size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
