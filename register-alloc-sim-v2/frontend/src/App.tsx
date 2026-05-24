import { useSimulatorStore } from './store/simulatorStore';
import type { PipelineStage } from './types';

import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import InputStage from './components/Editor/InputStage';
import IRViewer from './components/IRViewer/IRViewer';
import CFGView from './components/CFGView/CFGView';
import LivenessMatrix from './components/LivenessMatrix/LivenessMatrix';
import InterferenceGraph from './components/InterferenceGraph/InterferenceGraph';
import AssemblyViewer from './components/AssemblyViewer/AssemblyViewer';
import GanttChart from './components/GanttChart/GanttChart';
import ComparisonDash from './components/ComparisonDash/ComparisonDash';

const ALLOC_COLORS: Record<string, string> = {
  greedy:    '#6c8dfa',
  fast:      '#4ade80',
  basic:     '#fbbf24',
  custom_gc: '#a78bfa',
  custom_ls: '#22d3ee',
};

const ALLOC_LABELS: Record<string, string> = {
  greedy:    'LLVM Greedy',
  fast:      'LLVM Fast',
  basic:     'LLVM Basic',
  custom_gc: 'Custom Graph Coloring',
  custom_ls: 'Custom Linear Scan',
};

export default function App() {
  const {
    currentStage,
    compileResult,
    livenessResult,
    allocateResult,
    numRegisters,
    isLoading,
  } = useSimulatorStore();

  function renderStage(stage: PipelineStage) {
    switch (stage) {
      case 'input':
        return <InputStage />;

      case 'unopt_ir':
        return compileResult ? (
          <IRViewer
            title="Unoptimised LLVM IR"
            ir={compileResult.unoptimizedIR}
            tag={<span className="tag tag-llvm">clang -O0</span>}
          />
        ) : <Pending />;

      case 'opt_ir':
        return compileResult ? (
          <IRViewer
            title="Optimised LLVM IR"
            ir={compileResult.optimizedIR}
            tag={<span className="tag tag-ssa">mem2reg</span>}
          />
        ) : <Pending />;

      case 'liveness':
        return livenessResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <CFGView blocks={livenessResult.blocks} />
            <LivenessMatrix
              blocks={livenessResult.blocks}
              matrix={livenessResult.livenessMatrix}
            />
          </div>
        ) : <Pending />;

      case 'interference':
        return livenessResult ? (
          <InterferenceGraph graph={livenessResult.interferenceGraph} />
        ) : <Pending />;

      case 'allocation': {
        if (!allocateResult) return <Pending />;
        const lsResult = allocateResult.results['custom_ls'];
        // Parse intervals from rawStats or assembly — stored in allocateResult
        // We use the intervals embedded in the assembly text (encoded as comment lines)
        const intervals = (lsResult as any)?.intervals ?? [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="banner info">
              <span>ℹ</span>
              <span>
                Allocation complete. Results: {Object.keys(allocateResult.results).join(', ')}.
                Navigate to <strong>Assembly</strong> for annotated output or <strong>Comparison</strong> for the dashboard.
              </span>
            </div>
            {intervals.length > 0 && (
              <GanttChart intervals={intervals} numRegisters={numRegisters} />
            )}
          </div>
        );
      }

      case 'assembly':
        return allocateResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {Object.entries(allocateResult.results).map(([id, r]) => (
              <AssemblyViewer
                key={id}
                allocatorName={ALLOC_LABELS[id] ?? id}
                assembly={r.assembly}
                spillInstructions={r.spillInstructions}
                color={ALLOC_COLORS[id] ?? '#6c8dfa'}
              />
            ))}
          </div>
        ) : <Pending />;

      case 'comparison':
        return allocateResult ? (
          <ComparisonDash result={allocateResult} />
        ) : <Pending />;
    }
  }

  return (
    <div className="app-shell">
      <Header />
      <Sidebar />
      <main className="main-content">
        {isLoading && (
          <div className="banner info">
            <div className="spinner" />
            <span>Pipeline running — please wait…</span>
          </div>
        )}
        {renderStage(currentStage)}
      </main>
    </div>
  );
}

function Pending() {
  return (
    <div className="empty-state">
      <div className="empty-icon">⏳</div>
      <p>Run the pipeline first using the <strong>C Source</strong> stage.</p>
    </div>
  );
}
