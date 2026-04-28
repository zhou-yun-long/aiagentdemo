import { useCallback, useEffect, useState } from 'react';
import { Link, Loader2, Plug, Plus, Trash2, Unplug, X } from 'lucide-react';
import { connectMcpServer, disconnectMcpServer, getModelParams, listMcpServers, updateModelParams } from '../shared/api/treeify';
import type { McpServerInfo, ModelParams } from '../shared/types/treeify';

type IntegrationPanelProps = {
  open: boolean;
  onClose: () => void;
};

export function IntegrationPanel({ open, onClose }: IntegrationPanelProps) {
  const [servers, setServers] = useState<McpServerInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newUrl, setNewUrl] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [modelParams, setModelParams] = useState<ModelParams | null>(null);
  const [paramsLoading, setParamsLoading] = useState(false);

  const loadServers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listMcpServers();
      setServers(data);
    } catch {
      setServers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadModelParams = useCallback(async () => {
    setParamsLoading(true);
    try {
      const data = await getModelParams();
      setModelParams(data);
    } catch {
      setModelParams(null);
    } finally {
      setParamsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadServers();
      loadModelParams();
    }
  }, [open, loadServers, loadModelParams]);

  const handleConnect = async () => {
    const url = newUrl.trim();
    if (!url) return;
    setConnecting(true);
    setError(null);
    try {
      await connectMcpServer(url);
      setNewUrl('');
      await loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '连接失败');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async (url: string) => {
    try {
      await disconnectMcpServer(url);
      await loadServers();
    } catch (err) {
      setError(err instanceof Error ? err.message : '断开失败');
    }
  };

  const handleParamChange = async (key: keyof ModelParams, value: number) => {
    if (!modelParams) return;
    const updated = { ...modelParams, [key]: value };
    setModelParams(updated);
    try {
      await updateModelParams({ [key]: value });
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新参数失败');
    }
  };

  return (
    <aside className={`integration-panel ${open ? 'open' : ''}`}>
      <div className="panel-header">
        <strong>集成设置</strong>
        <button className="icon" onClick={onClose} aria-label="关闭集成设置">
          <X size={16} />
        </button>
      </div>
      <div className="panel-body">
        {error && <div className="panel-error">{error}</div>}

        {/* MCP 服务器管理 */}
        <div className="panel-section">
          <h4>MCP 服务器</h4>
          <div className="mcp-add-row">
            <input
              type="text"
              placeholder="输入 MCP 服务 URL"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
            />
            <button className="primary" onClick={handleConnect} disabled={connecting}>
              {connecting ? <Loader2 size={14} className="spinner-icon" /> : <Plus size={14} />}
            </button>
          </div>

          {loading ? (
            <div className="panel-loading">
              <Loader2 size={16} className="spinner-icon" />
              <span>加载中...</span>
            </div>
          ) : servers.length === 0 ? (
            <div className="panel-empty">
              <Plug size={20} />
              <span>暂无 MCP 服务器</span>
            </div>
          ) : (
            <div className="mcp-server-list">
              {servers.map((server) => (
                <div className="mcp-server-item" key={server.url}>
                  <div className="mcp-server-info">
                    <div className="mcp-server-name">
                      <span className={`mcp-status ${server.connected ? 'online' : 'offline'}`} />
                      {server.name || '未知服务'}
                      <small>v{server.version || '?'}</small>
                    </div>
                    <div className="mcp-server-url" title={server.url}>
                      {server.url.length > 50 ? server.url.slice(0, 50) + '...' : server.url}
                    </div>
                    {server.toolNames.length > 0 && (
                      <div className="mcp-server-tools">
                        {server.toolNames.map((t) => (
                          <span className="mcp-tool-tag" key={t}>{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="mcp-server-actions">
                    {server.connected ? (
                      <button className="small" onClick={() => handleDisconnect(server.url)}>
                        <Unplug size={12} /> 断开
                      </button>
                    ) : (
                      <button className="small primary" onClick={() => { setNewUrl(server.url); handleConnect(); }}>
                        <Link size={12} /> 连接
                      </button>
                    )}
                    <button className="small danger" onClick={() => handleDisconnect(server.url)}>
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 模型参数 */}
        <div className="panel-section">
          <h4>模型参数</h4>
          {paramsLoading ? (
            <div className="panel-loading">
              <Loader2 size={16} className="spinner-icon" />
              <span>加载中...</span>
            </div>
          ) : modelParams ? (
            <div className="model-params-form">
              <label>
                <span>Temperature</span>
                <input
                  type="number"
                  min={0}
                  max={2}
                  step={0.1}
                  value={modelParams.temperature}
                  onChange={(e) => handleParamChange('temperature', parseFloat(e.target.value))}
                />
              </label>
              <label>
                <span>Max Tokens</span>
                <input
                  type="number"
                  min={1}
                  max={128000}
                  step={1}
                  value={modelParams.maxTokens}
                  onChange={(e) => handleParamChange('maxTokens', parseInt(e.target.value))}
                />
              </label>
              <label>
                <span>Top P</span>
                <input
                  type="number"
                  min={0}
                  max={1}
                  step={0.05}
                  value={modelParams.topP}
                  onChange={(e) => handleParamChange('topP', parseFloat(e.target.value))}
                />
              </label>
            </div>
          ) : (
            <div className="panel-empty">
              <span>无法加载模型参数</span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
