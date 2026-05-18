import { useState } from 'react';
import { FileText, Globe } from 'lucide-react';
import { FunctionalTabPanel } from './FunctionalTabPanel';
import { ApiTabPanel } from './ApiTabPanel';

type GeneratePanelTab = 'functional' | 'api';

type GeneratePanelProps = {
  onImportRows: (rows: string[][]) => void;
};

export function GeneratePanel({ onImportRows }: GeneratePanelProps) {
  const [activeTab, setActiveTab] = useState<GeneratePanelTab>('functional');

  return (
    <section className="generate-panel">
      <div className="generate-panel-tabs">
        <button
          className={`generate-panel-tab${activeTab === 'functional' ? ' active' : ''}`}
          onClick={() => setActiveTab('functional')}
        >
          <FileText size={15} />
          功能测试
        </button>
        <button
          className={`generate-panel-tab${activeTab === 'api' ? ' active' : ''}`}
          onClick={() => setActiveTab('api')}
        >
          <Globe size={15} />
          接口测试
          <span className="generate-panel-beta-badge">Beta</span>
        </button>
      </div>

      {/* Both panels stay mounted; CSS visibility preserves input and config state */}
      <div className={activeTab === 'functional' ? '' : 'generate-panel-hidden'}>
        <FunctionalTabPanel onImportRows={onImportRows} />
      </div>
      <div className={activeTab === 'api' ? '' : 'generate-panel-hidden'}>
        <ApiTabPanel onImportRows={onImportRows} />
      </div>
    </section>
  );
}
