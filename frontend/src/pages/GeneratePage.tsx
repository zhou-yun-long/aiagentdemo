import { useCallback, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Wand2 } from 'lucide-react';
import { GeneratePanel } from '../components/GeneratePanel';

export default function GeneratePage() {
  const { projectId: projectIdParam } = useParams<{ projectId: string }>();
  const projectId = Number(projectIdParam);
  const [importedCount, setImportedCount] = useState(0);

  const handleImportRows = useCallback((rows: string[][]) => {
    setImportedCount((prev) => prev + rows.length);
  }, []);

  return (
    <div className="generate-page">
      <div className="generate-page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Link
            to={`/projects/${projectId}/dashboard`}
            className="back-button"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
          >
            <ArrowLeft size={16} />
            <span>返回</span>
          </Link>
          <Wand2 size={18} />
          <h1 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>用例生成</h1>
        </div>
        {importedCount > 0 && (
          <div className="generate-page-toast">
            已成功生成并保存 {importedCount} 条用例
            <Link to={`/projects/${projectId}/cases`} style={{ marginLeft: 12, color: '#1f6cff' }}>
              查看用例
            </Link>
          </div>
        )}
      </div>
      <div className="generate-page-body">
        <GeneratePanel onImportRows={handleImportRows} />
      </div>
    </div>
  );
}
