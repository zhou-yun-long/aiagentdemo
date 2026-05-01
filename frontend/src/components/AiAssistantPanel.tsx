import { useCallback, useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { aiRows } from '../data/mindMap';
import type { MindNode } from '../shared/types/workspace';
import { GeneratePanel } from './GeneratePanel';

type AiAssistantPanelProps = {
  open: boolean;
  selectedNode?: MindNode;
  onClose: () => void;
  onImportRows: (rows: string[][]) => void;
};

const defaultPrompt =
  '策略红包仍有余额\n策略红包的功能交互\n策略红包展示对应 tag，新人红包、加油红包\n点击策略红包，进入提现详情页，被选中后流程提示”该红包已被抢光”\n提现完成后，回到活动主页';

export function AiAssistantPanel({ open, selectedNode, onClose, onImportRows }: AiAssistantPanelProps) {
  const [prompt, setPrompt] = useState(defaultPrompt);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const panel = (e.currentTarget as HTMLElement).parentElement!;
    dragRef.current = { startX: e.clientX, startWidth: panel.offsetWidth };
  }, []);

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const delta = dragRef.current.startX - e.clientX;
      const newWidth = Math.min(800, Math.max(280, dragRef.current.startWidth + delta));
      document.documentElement.style.setProperty('--assistant-width', `${newWidth}px`);
    };
    const onMouseUp = () => { dragRef.current = null; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  const quoteSelectedNode = () => {
    if (!selectedNode) {
      return;
    }
    setPrompt((value) => `${value}\n\n引用节点：${selectedNode.title}`);
  };

  return (
    <aside className={`assistant-panel ${open ? 'open' : ''}`}>
      <div className="assistant-resize-handle" onMouseDown={handleResizeMouseDown} />
      <div className="assistant-header">
        <strong>AI 助手</strong>
        <button className="icon" onClick={onClose} aria-label="关闭 AI 助手">
          <X size={16} />
        </button>
      </div>
      <div className="assistant-body">
        <GeneratePanel onImportRows={onImportRows} />
        <section className="assistant-quick-card">
          <div className="assistant-card-title">
            <strong>快速解析</strong>
            <button onClick={quoteSelectedNode}>引用case</button>
          </div>
          <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} />
          <div className="assistant-actions">
            <button className="primary">提交</button>
            <button onClick={() => setPrompt('')}>清空会话</button>
            <button className="green">AI续写</button>
          </div>
          <div className="case-table">
            {aiRows.map((row) => (
              <div className="case-row" key={row[0]}>
                {row.map((cell) => (
                  <span key={cell}>{cell}</span>
                ))}
              </div>
            ))}
          </div>
          <button className="parse-button" onClick={() => onImportRows(aiRows)}>
            解析数据
          </button>
        </section>
      </div>
    </aside>
  );
}
