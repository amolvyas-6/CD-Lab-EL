import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  SkipBack,
  ChevronLeft,
  Play,
  Pause,
  ChevronRight,
  SkipForward,
} from 'lucide-react';
import { useSimulatorStore } from '../../store/simulatorStore';
import type { StageId } from '../../core/types';

const STAGE_STEP_IDS: Partial<Record<StageId, StageId>> = {
  parsing: 'parsing',
  basicBlocks: 'basicBlocks',
  cfg: 'cfg',
  liveness: 'liveness',
  interferenceGraph: 'interferenceGraph',
  graphColoring: 'graphColoring',
  linearScan: 'linearScan',
};

interface StepControlsProps {
  stageId: StageId;
}

export default function StepControls({ stageId }: StepControlsProps) {
  const {
    simulationSteps,
    currentStepIndex,
    isPlaying,
    playbackSpeed,
    nextStep,
    prevStep,
    togglePlayback,
    setPlaybackSpeed,
    setCurrentStepIndex,
  } = useSimulatorStore();

  const playRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter steps to this stage
  const stageSteps = simulationSteps.filter((s) => s.stageId === stageId);
  const totalSteps = stageSteps.length;

  // Find the global index of the first step for this stage
  const firstGlobalIndex = simulationSteps.findIndex((s) => s.stageId === stageId);

  // Current step within this stage
  const stageStepIndex = currentStepIndex - Math.max(0, firstGlobalIndex);
  const clampedStageIdx = Math.max(0, Math.min(stageStepIndex, totalSteps - 1));
  const currentStep = stageSteps[clampedStageIdx];

  // Auto-advance playback
  useEffect(() => {
    if (!isPlaying) {
      if (playRef.current) clearTimeout(playRef.current);
      return;
    }
    playRef.current = setTimeout(() => {
      if (currentStepIndex < simulationSteps.length - 1) {
        nextStep();
      } else {
        togglePlayback();
      }
    }, playbackSpeed);
    return () => {
      if (playRef.current) clearTimeout(playRef.current);
    };
  }, [isPlaying, currentStepIndex, playbackSpeed]);

  if (totalSteps === 0) return null;

  const goToFirst = () => setCurrentStepIndex(Math.max(0, firstGlobalIndex));
  const goToLast = () => setCurrentStepIndex(firstGlobalIndex + totalSteps - 1);
  const goPrev = () => {
    if (currentStepIndex > firstGlobalIndex) prevStep();
  };
  const goNext = () => {
    if (currentStepIndex < firstGlobalIndex + totalSteps - 1) nextStep();
  };

  const progress = totalSteps > 1 ? (clampedStageIdx / (totalSteps - 1)) * 100 : 100;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Current step explanation */}
      {currentStep && (
        <motion.div
          key={currentStepIndex}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{
            padding: '12px 16px',
            background: 'rgba(109, 40, 217, 0.06)',
            borderColor: 'rgba(109, 40, 217, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--accent-purple)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Step {clampedStageIdx + 1} / {totalSteps}
            </span>
          </div>
          <p style={{ fontSize: '0.84rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: currentStep.detail ? 4 : 0 }}>
            {currentStep.description}
          </p>
          {currentStep.detail && (
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
              {currentStep.detail}
            </p>
          )}
        </motion.div>
      )}

      {/* Progress bar */}
      <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
        <motion.div
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.2 }}
          style={{ height: '100%', background: 'var(--accent-gradient)', borderRadius: 2 }}
        />
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <button className="btn btn-ghost btn-icon" onClick={goToFirst} title="First step">
          <SkipBack size={16} />
        </button>
        <button className="btn btn-ghost btn-icon" onClick={goPrev} title="Previous step">
          <ChevronLeft size={18} />
        </button>
        <button
          className="btn btn-primary"
          style={{ width: 44, height: 44, borderRadius: '50%', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={togglePlayback}
          title={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} />}
        </button>
        <button className="btn btn-ghost btn-icon" onClick={goNext} title="Next step">
          <ChevronRight size={18} />
        </button>
        <button className="btn btn-ghost btn-icon" onClick={goToLast} title="Last step">
          <SkipForward size={16} />
        </button>
      </div>

      {/* Speed control */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>Speed</span>
        <input
          type="range"
          min={200}
          max={2000}
          step={100}
          value={2200 - playbackSpeed}
          onChange={(e) => setPlaybackSpeed(2200 - Number(e.target.value))}
        />
        <span style={{ fontSize: '0.72rem', color: 'var(--accent-purple)', minWidth: 32 }}>
          {playbackSpeed < 500 ? 'Fast' : playbackSpeed < 1200 ? 'Med' : 'Slow'}
        </span>
      </div>
    </div>
  );
}
