import { motion } from 'framer-motion';
import { useState } from 'react';
import { useSimulatorStore } from '../../store/simulatorStore';
import { PRESET_EXAMPLES } from '../../presets/examples';
import TACEditor from '../Editor/TACEditor';
import { runPipeline } from '../../core/pipeline';
import {
  Play,
  Cpu,
  BookOpen,
  Zap,
  AlertCircle,
  CheckCircle,
  Loader,
} from 'lucide-react';
import type { AlgorithmChoice } from '../../core/types';

export default function InputStage() {
  const {
    sourceCode,
    registerCount,
    setRegisterCount,
    algorithmChoice,
    setAlgorithmChoice,
    setSourceCode,
    setCurrentStage,
    markStageCompleted,
    setInstructions,
    setCFG,
    setSimulationSteps,
    setInterferenceGraph,
    setGraphColoringResult,
    setLinearScanResult,
    setLivenessComputed,
  } = useSimulatorStore();

  const [isCompiling, setIsCompiling] = useState(false);
  const [compileErrors, setCompileErrors] = useState<string[]>([]);
  const [compileSuccess, setCompileSuccess] = useState(false);

  const handlePresetClick = (code: string) => {
    setSourceCode(code);
    setCompileErrors([]);
    setCompileSuccess(false);
  };

  const handleCompile = () => {
    setIsCompiling(true);
    setCompileErrors([]);
    setCompileSuccess(false);

    // Run synchronously (fast enough for any TAC size)
    setTimeout(() => {
      try {
        const result = runPipeline(sourceCode, registerCount);

        if (result.instructions.length === 0) {
          setCompileErrors(['No instructions found. Please write or select a TAC program.']);
          setIsCompiling(false);
          return;
        }

        setInstructions(result.instructions);
        setCFG(result.cfg);
        setInterferenceGraph(result.interferenceGraph);
        setGraphColoringResult(result.graphColoringResult);
        setLinearScanResult(result.linearScanResult);
        setLivenessComputed(true);
        setSimulationSteps(result.steps);

        if (result.errors.length > 0) {
          setCompileErrors(result.errors);
        } else {
          setCompileSuccess(true);
        }

        markStageCompleted('input');
        markStageCompleted('parsing');
        markStageCompleted('basicBlocks');
        markStageCompleted('cfg');
        markStageCompleted('liveness');
        markStageCompleted('interferenceGraph');
        markStageCompleted('graphColoring');
        markStageCompleted('linearScan');
        setCurrentStage('parsing');
      } catch (err) {
        setCompileErrors([String(err)]);
      } finally {
        setIsCompiling(false);
      }
    }, 50);
  };

  const algoOptions: { value: AlgorithmChoice; label: string; icon: React.ReactNode }[] = [
    { value: 'graphColoring', label: 'Graph Coloring', icon: <Cpu size={12} /> },
    { value: 'linearScan', label: 'Linear Scan', icon: <Zap size={12} /> },
    { value: 'both', label: 'Compare Both', icon: <BookOpen size={12} /> },
  ];

  return (
    <div className="input-stage">
      {/* Left: Editor */}
      <motion.div
        className="input-stage-editor"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="card-header" style={{ marginBottom: 0 }}>
          <div>
            <h2 className="card-title">Three-Address Code Editor</h2>
            <p className="card-subtitle">
              Write or paste your TAC program, or select a preset example
            </p>
          </div>
        </div>
        <TACEditor />

        {/* Error / Success feedback */}
        {compileErrors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.75rem',
              color: 'var(--accent-rose)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6, fontWeight: 600 }}>
              <AlertCircle size={14} /> Parse Warnings
            </div>
            {compileErrors.map((e, i) => (
              <div key={i} style={{ marginTop: 3, opacity: 0.85 }}>{e}</div>
            ))}
          </motion.div>
        )}

        {compileSuccess && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: 'rgba(16, 185, 129, 0.08)',
              border: '1px solid rgba(16, 185, 129, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              fontSize: '0.75rem',
              color: 'var(--accent-emerald)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <CheckCircle size={14} /> Compiled successfully — navigate the pipeline stages on the left!
          </motion.div>
        )}
      </motion.div>

      {/* Right: Controls */}
      <motion.div
        className="input-stage-sidebar"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: 'easeOut' }}
      >
        {/* Algorithm Selection */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Algorithm</h3>
          </div>
          <div className="algo-toggle">
            {algoOptions.map((opt) => (
              <button
                key={opt.value}
                className={`algo-option ${algorithmChoice === opt.value ? 'active' : ''}`}
                onClick={() => setAlgorithmChoice(opt.value)}
              >
                {opt.icon}
                <span style={{ marginLeft: 4 }}>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Register Count */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Register Count</h3>
            <span className="badge badge-purple">k = {registerCount}</span>
          </div>
          <div className="slider-group">
            <span className="slider-label">2</span>
            <input
              type="range"
              min={2}
              max={8}
              value={registerCount}
              onChange={(e) => setRegisterCount(Number(e.target.value))}
            />
            <span className="slider-label">8</span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 8 }}>
            Number of physical registers available. Lower values increase spill pressure.
          </p>
        </div>

        {/* Preset Examples */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Preset Examples</h3>
          </div>
          <div className="preset-chips">
            {PRESET_EXAMPLES.map((example) => (
              <button
                key={example.id}
                className="preset-chip"
                onClick={() => handlePresetClick(example.code)}
                title={example.description}
              >
                {example.name}
                <span style={{ marginLeft: 6, fontSize: '0.6rem', opacity: 0.6 }}>
                  {example.complexity}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Compile Button */}
        <motion.button
          className="btn btn-primary"
          style={{ width: '100%', padding: '14px 24px', fontSize: '0.9rem', fontWeight: 600 }}
          onClick={handleCompile}
          disabled={isCompiling}
          whileHover={{ scale: isCompiling ? 1 : 1.02 }}
          whileTap={{ scale: isCompiling ? 1 : 0.98 }}
        >
          {isCompiling ? <Loader size={18} className="animate-spin" /> : <Play size={18} />}
          {isCompiling ? 'Compiling...' : 'Compile & Simulate'}
        </motion.button>

        {/* Info Card */}
        <div
          className="card"
          style={{ background: 'rgba(109, 40, 217, 0.06)', borderColor: 'rgba(109, 40, 217, 0.15)' }}
        >
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--accent-purple)' }}>How it works:</strong>{' '}
            Your TAC program is parsed into basic blocks, analyzed for liveness,
            and register-allocated. Each stage is visualized step-by-step.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
