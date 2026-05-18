import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { GenerateStage, StageArtifact } from '../types/generation';
import { useGenerationStore } from '../features/generation/generationStore';
import { formatArtifactSections, formatArtifactSummary } from '../utils/stageArtifactFormat';
import { CriticReportPanel } from './CriticReportPanel';

const displayStages: GenerateStage[] = ['e1', 'e2', 'e3', 'critic'];

function summarizeArtifact(stage: GenerateStage, artifact: StageArtifact) {
  const summary = formatArtifactSummary(stage, artifact);
  return summary.length > 34 ? `${summary.slice(0, 34)}...` : summary;
}

export function StageArtifactsPanel() {
  const artifacts = useGenerationStore((state) => state.artifacts);
  const setArtifactSupplement = useGenerationStore((state) => state.setArtifactSupplement);
  const toggleArtifactCanvasVisible = useGenerationStore((state) => state.toggleArtifactCanvasVisible);
  const [expanded, setExpanded] = useState<Partial<Record<GenerateStage, boolean>>>({});

  const visibleArtifacts = displayStages.filter((stage) => artifacts[stage]);

  if (visibleArtifacts.length === 0) {
    return null;
  }

  const toggleExpand = (stage: GenerateStage) => {
    setExpanded((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };

  return (
    <div className="stage-artifacts">
      <div className="stage-artifacts-header">
        <strong>阶段生成物</strong>
      </div>
      {visibleArtifacts.map((stage) => {
        const artifact = artifacts[stage]!;
        const isOpen = expanded[stage] ?? (stage === 'critic');
        const isCritic = stage === 'critic';
        const canSupplement = stage === 'e1' || stage === 'e2';
        const canCanvas = stage !== 'critic';
        const readableSections = formatArtifactSections(stage, artifact.aiResult);

        return (
          <div className={`artifact-card ${isOpen ? 'open' : ''}`} key={stage}>
            <div className="artifact-card-head">
              <button className="artifact-expand-button" onClick={() => toggleExpand(stage)}>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span>{artifact.title}</span>
                <small>{summarizeArtifact(stage, artifact)}</small>
              </button>
              {canCanvas && (
                <button
                  className={`artifact-canvas-toggle ${artifact.visibleOnCanvas ? 'active' : ''}`}
                  onClick={() => toggleArtifactCanvasVisible(stage)}
                  title={artifact.visibleOnCanvas ? '从画布隐藏' : '显示到画布'}
                  aria-label={artifact.visibleOnCanvas ? `从画布隐藏${artifact.title}` : `显示${artifact.title}到画布`}
                >
                  {artifact.visibleOnCanvas ? <Eye size={14} /> : <EyeOff size={14} />}
                </button>
              )}
            </div>
            {isOpen && (
              <div className="artifact-card-body">
                {isCritic && artifact.criticReport ? (
                  <CriticReportPanel report={artifact.criticReport} />
                ) : (
                  <>
                    <div className="artifact-ai-result">
                      <label>AI 结果</label>
                      {readableSections.length > 0 ? (
                        <div className="artifact-readable-result">
                          {readableSections.map((section) => (
                            <section key={section.title}>
                              <h5>{section.title}</h5>
                              <ul>
                                {section.items.map((item, index) => (
                                  <li key={`${section.title}-${index}`}>{item}</li>
                                ))}
                              </ul>
                            </section>
                          ))}
                        </div>
                      ) : (
                        <pre>{artifact.aiResult || '（暂无）'}</pre>
                      )}
                    </div>
                    {canSupplement && (
                      <div className="artifact-supplement">
                        <label htmlFor={`supplement-${stage}`}>用户补充</label>
                        <textarea
                          id={`supplement-${stage}`}
                          value={artifact.userSupplement}
                          onChange={(e) => setArtifactSupplement(stage, e.target.value)}
                          placeholder="输入补充说明、修正或约束..."
                          rows={3}
                        />
                      </div>
                    )}
                    {stage === 'e2' && artifacts.e1?.userSupplement && (
                      <div className="artifact-carried-note">
                        <strong>E1 用户补充已带入本阶段</strong>
                        <pre>{artifacts.e1.userSupplement}</pre>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
