import { useMemo, useState } from 'react';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { MindMapCanvas } from './components/MindMapCanvas';
import { OutlinePanel } from './components/OutlinePanel';
import { Toolbar } from './components/Toolbar';
import { mindNodes, type ThemeMode } from './data/mindMap';

export default function App() {
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [selectedId, setSelectedId] = useState('success-steps');

  const selectedNode = useMemo(() => mindNodes.find((node) => node.id === selectedId), [selectedId]);

  return (
    <div className={`app ${theme}`}>
      <Toolbar
        theme={theme}
        assistantOpen={assistantOpen}
        onToggleAssistant={() => setAssistantOpen((value) => !value)}
        onToggleTheme={() => setTheme((value) => (value === 'light' ? 'dark' : 'light'))}
      />
      <div className="workspace">
        <OutlinePanel nodes={mindNodes} selectedId={selectedId} onSelect={setSelectedId} />
        <section className="work-area">
          <MindMapCanvas nodes={mindNodes} selectedId={selectedId} onSelect={setSelectedId} />
          <div className="selection-bar">
            <span>当前节点</span>
            <strong>{selectedNode?.title}</strong>
            <button>编辑</button>
            <button>重新生成本阶段</button>
          </div>
        </section>
        <AiAssistantPanel open={assistantOpen} onClose={() => setAssistantOpen(false)} />
      </div>
    </div>
  );
}
