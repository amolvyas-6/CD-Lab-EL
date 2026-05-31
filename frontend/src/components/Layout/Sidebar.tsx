import { useSimulatorStore } from '../../store/simulatorStore';
import { STAGE_ORDER, STAGE_LABELS, type PipelineStage } from '../../types';

const STAGE_ICONS: Record<PipelineStage, string> = {
  input:        '✎',
  unopt_ir:     '⬡',
  opt_ir:       '⬢',
  liveness:     '◈',
  interference: '⬡',
  allocation:   '⬤',
  assembly:     '⌨',
  comparison:   '⊞',
};

export default function Sidebar() {
  const { currentStage, setStage, compileResult, livenessResult, allocateResult } = useSimulatorStore();

  const stageIndex = STAGE_ORDER.indexOf(currentStage);

  function isAccessible(stage: PipelineStage) {
    if (stage === 'input') return true;
    if (stage === 'unopt_ir' || stage === 'opt_ir') return !!compileResult;
    if (stage === 'liveness' || stage === 'interference') return !!livenessResult;
    if (stage === 'allocation' || stage === 'assembly' || stage === 'comparison')
      return !!allocateResult;
    return false;
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-section-title">Pipeline Stages</div>
      {STAGE_ORDER.map((stage, i) => {
        const accessible = isAccessible(stage);
        const isDone = i < stageIndex && accessible;
        const isActive = stage === currentStage;
        return (
          <button
            key={stage}
            className={`stage-btn ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}
            onClick={() => accessible && setStage(stage)}
            disabled={!accessible}
            title={accessible ? undefined : 'Run the pipeline first'}
          >
            <span className="stage-num">
              {isDone ? '✓' : i + 1}
            </span>
            <span>{STAGE_LABELS[stage]}</span>
          </button>
        );
      })}
    </aside>
  );
}
