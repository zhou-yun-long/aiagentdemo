import { useCallback, useEffect, useState } from 'react';
import { Copy, Key, Link, Loader2, Plug, Plus, Trash2, Unplug, X } from 'lucide-react';
import { connectMcpServer, disconnectMcpServer, getDefaultProjectId, getModelParams, listMcpServers, updateModelParams } from '../shared/api/treeify';
import { createToken, listTokens, revokeToken } from '../shared/api/ci';
import type { McpServerInfo, ModelParams } from '../shared/types/treeify';
import type { ApiTokenDto } from '../shared/types/ci';

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

  // CI/CD token state
  const [tokens, setTokens] = useState<ApiTokenDto[]>([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [newTokenName, setNewTokenName] = useState('');
  const [createdToken, setCreatedToken] = useState<string | null>(null);
  const [tokenCreating, setTokenCreating] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);

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

  const loadTokens = useCallback(async () => {
    setTokensLoading(true);
    try {
      const data = await listTokens(getDefaultProjectId());
      setTokens(data);
    } catch {
      setTokens([]);
    } finally {
      setTokensLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      loadServers();
      loadModelParams();
      loadTokens();
    }
  }, [open, loadServers, loadModelParams, loadTokens]);

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

  const handleCreateToken = async () => {
    const name = newTokenName.trim();
    if (!name) return;
    setTokenCreating(true);
    setError(null);
    try {
      const dto = await createToken(getDefaultProjectId(), { name });
      setCreatedToken(dto.token);
      setNewTokenName('');
      await loadTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成 Token 失败');
    } finally {
      setTokenCreating(false);
    }
  };

  const handleRevokeToken = async (tokenId: number) => {
    try {
      await revokeToken(tokenId);
      await loadTokens();
    } catch (err) {
      setError(err instanceof Error ? err.message : '撤销 Token 失败');
    }
  };

  const handleCopyToken = async () => {
    if (!createdToken) return;
    try {
      await navigator.clipboard.writeText(createdToken);
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    } catch {
      // fallback: select text
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

        {/* CI/CD Token Management */}
        <div className="panel-section">
          <h4>CI/CD Token Management</h4>

          {/* Created token display */}
          {createdToken && (
            <div className="ci-created-token">
              <div className="ci-token-label">Token 已生成 (仅显示一次):</div>
              <div className="ci-token-value">
                <code>{createdToken}</code>
                <button className="small" onClick={handleCopyToken} title="复制">
                  <Copy size={12} /> {copyFeedback ? '已复制' : '复制'}
                </button>
              </div>
              <button className="small" onClick={() => setCreatedToken(null)}>关闭</button>
            </div>
          )}

          {/* Generate token form */}
          <div className="mcp-add-row">
            <input
              type="text"
              placeholder="Token 名称 (如 Jenkins, GitLab CI)"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateToken()}
            />
            <button className="primary" onClick={handleCreateToken} disabled={tokenCreating}>
              {tokenCreating ? <Loader2 size={14} className="spinner-icon" /> : <Key size={14} />}
            </button>
          </div>

          {/* Token list */}
          {tokensLoading ? (
            <div className="panel-loading">
              <Loader2 size={16} className="spinner-icon" />
              <span>加载中...</span>
            </div>
          ) : tokens.length === 0 ? (
            <div className="panel-empty">
              <Key size={20} />
              <span>暂无 CI/CD Token</span>
            </div>
          ) : (
            <div className="mcp-server-list">
              {tokens.map((t) => (
                <div className="mcp-server-item" key={t.id}>
                  <div className="mcp-server-info">
                    <div className="mcp-server-name">
                      <span className={`mcp-status ${t.active ? 'online' : 'offline'}`} />
                      {t.name}
                    </div>
                    <div className="mcp-server-url">{t.token}</div>
                    <div className="mcp-server-url" style={{ fontSize: '11px', opacity: 0.7 }}>
                      创建: {new Date(t.createdAt).toLocaleString()}
                      {t.lastUsedAt && ` | 最后使用: ${new Date(t.lastUsedAt).toLocaleString()}`}
                    </div>
                  </div>
                  <div className="mcp-server-actions">
                    {t.active && (
                      <button className="small danger" onClick={() => handleRevokeToken(t.id)}>
                        <Trash2 size={12} /> 撤销
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Example curl */}
          <div className="ci-example">
            <div className="ci-token-label">示例调用:</div>
            <pre style={{ fontSize: '11px', overflow: 'auto', whiteSpace: 'pre-wrap', background: 'var(--color-bg-secondary, #f5f5f5)', padding: '8px', borderRadius: '4px' }}>
{`curl -X POST /api/v1/ci/execution-results \\
  -H "Authorization: Bearer <your-token>" \\
  -H "Content-Type: application/json" \\
  -d '{"results":[
    {"caseId":1,"status":"passed","duration":1200},
    {"caseId":2,"status":"failed","duration":3400}
  ]}'`}
            </pre>
          </div>
        </div>
      </div>
    </aside>
  );
}
