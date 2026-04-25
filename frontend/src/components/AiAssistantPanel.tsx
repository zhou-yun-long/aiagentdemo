import { X } from 'lucide-react';
import { aiRows } from '../data/mindMap';

type AiAssistantPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function AiAssistantPanel({ open, onClose }: AiAssistantPanelProps) {
  return (
    <aside className={`assistant-panel ${open ? 'open' : ''}`}>
      <div className="assistant-header">
        <strong>AI 助手</strong>
        <button className="icon" onClick={onClose} aria-label="关闭 AI 助手">
          <X size={16} />
        </button>
      </div>
      <textarea
        defaultValue={
          '策略红包仍有余额\n策略红包的功能交互\n策略红包展示对应 tag，新人红包、加油红包\n点击策略红包，进入提现详情页，被选中后流程提示“该红包已被抢光”\n提现完成后，回到活动主页'
        }
      />
      <div className="assistant-actions">
        <button className="primary">提交</button>
        <button>清空会话</button>
        <button>引用case</button>
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
      <button className="parse-button">解析数据</button>
    </aside>
  );
}
