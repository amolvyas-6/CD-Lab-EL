import { useSimulatorStore } from '../../store/simulatorStore';
import { Check, Circle } from 'lucide-react';
import type { StageId } from '../../core/types';

const STAGE_NUMBERS: Record<StageId, number> = {
  input: 1,
  parsing: 2,
  basicBlocks: 3,
  cfg: 4,
  liveness: 5,
  interferenceGraph: 6,
  graphColoring: 7,
  linearScan: 8,
  output: 9,
};

export default function Sidebar() {
  const { stages, currentStage, setCurrentStage } = useSimulatorStore();

  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">RA</div>
        <div>
          <div className="sidebar-brand-text">RegAlloc Sim</div>
          <div className="sidebar-brand-sub">Compiler Design Lab</div>
        </div>
      </div>

      {/* Pipeline Stages */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Pipeline Stages</div>
        {stages.map((stage, index) => (
          <div key={stage.id} className="stage-item-wrapper">
            {index < stages.length - 1 && <div className="stage-connector" />}
            <div
              className={`stage-item ${stage.id === currentStage ? 'active' : ''} ${
                stage.completed ? 'completed' : ''
              }`}
              onClick={() => setCurrentStage(stage.id)}
            >
              <div className="stage-indicator">
                {stage.completed ? (
                  <Check size={12} />
                ) : stage.id === currentStage ? (
                  <Circle size={8} fill="currentColor" />
                ) : (
                  STAGE_NUMBERS[stage.id]
                )}
              </div>
              <span className="stage-name">{stage.name}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom info */}
      <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid var(--border-primary)' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          Compiler Design Laboratory
        </div>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          6th Semester • B.Tech CSE
        </div>
      </div>
    </aside>
  );
}
