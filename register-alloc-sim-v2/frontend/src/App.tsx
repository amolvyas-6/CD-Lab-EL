import { useSimulatorStore } from './store/simulatorStore';
import type { PipelineStage } from './types';

import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import InputStage from './components/Editor/InputStage';
import IRViewer from './components/IRViewer/IRViewer';
import CFGView from './components/CFGView/CFGView';
import LivenessMatrix from './components/LivenessMatrix/LivenessMatrix';
import InterferenceGraph from './components/InterferenceGraph/InterferenceGraph';
import AllocationDetail from './components/AllocationDetail/AllocationDetail';
import AssemblyViewer from './components/AssemblyViewer/AssemblyViewer';
import GanttChart from './components/GanttChart/GanttChart';
import ComparisonDash from './components/ComparisonDash/ComparisonDash';
import InfoBox from './components/InfoBox/InfoBox';

const ALLOC_COLORS: Record<string, string> = {
  greedy:    '#4f6ef7',
  fast:      '#16a34a',
  basic:     '#d97706',
  custom_gc: '#7c3aed',
  custom_ls: '#0891b2',
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

      // ── Stage 1: C Source ─────────────────────────────────────────────
      case 'input':
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <InfoBox
              icon="📝"
              title="Stage 1 — C Source Input"
              text="Write or select a C program. Choose which allocators to compare. The k slider controls how many registers the custom allocators (Graph Coloring and Linear Scan) can use — fewer registers means more spills."
              items={[
                { key: 'k slider', val: 'Number of physical registers for custom allocators only (2–16). LLVM always uses all 16 x86-64 registers.' },
                { key: 'Preset programs', val: 'Ready-made examples from trivial to "pressure bomb" (worst case that forces spills).' },
                { key: 'Allocator toggle', val: 'Choose which of the 4 allocators to run.' },
              ]}
            />
            <InputStage />
          </div>
        );

      // ── Stage 2: Unoptimised IR ───────────────────────────────────────
      case 'unopt_ir':
        return compileResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <InfoBox
              icon="🔤"
              title="Stage 2 — Unoptimised LLVM IR (clang -O0)"
              text="Raw LLVM IR produced by Clang with no optimizations. Every local variable is stored on the stack via alloca instructions — the code accesses them through load and store. This is NOT suitable for register allocation yet."
              items={[
                { key: 'alloca i32', val: 'Allocates a stack slot (memory, not a register). Variables live in RAM here.' },
                { key: 'store i32 %val, ptr %slot', val: 'Writes a value to the stack slot.' },
                { key: 'load i32, ptr %slot', val: 'Reads a value back from the stack slot.' },
                { key: 'Why -O0?', val: "We want to see what mem2reg does in Stage 3, so we intentionally skip Clang's own optimizations here." },
              ]}
            />
            <IRViewer
              title="Unoptimised LLVM IR"
              ir={compileResult.unoptimizedIR}
              tag={<span className="tag tag-llvm">clang -O0</span>}
            />
          </div>
        ) : <Pending />;

      // ── Stage 3: Optimised IR ─────────────────────────────────────────
      case 'opt_ir':
        return compileResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <InfoBox
              icon="✨"
              title="Stage 3 — Optimised IR (opt -passes=mem2reg)"
              text="After running the mem2reg pass, all alloca/load/store patterns are replaced by SSA virtual registers. Every %name value is assigned exactly once (Static Single Assignment). This is the IR we perform register allocation on."
              items={[
                { key: '%x = add i32 %a, %b', val: 'A direct SSA computation — no memory involved. This is what enables fast register allocation.' },
                { key: 'phi i32 [v1, %block1], [v2, %block2]', val: 'A phi node — merges two values from different control flow paths. Appears at loop headers.' },
                { key: 'mem2reg', val: 'The pass that converts stack variables to SSA registers. It inserts phi nodes where needed.' },
                { key: 'instcombine', val: 'Folds trivial patterns like (a + 0) → a. Makes IR cleaner.' },
              ]}
            />
            <IRViewer
              title="Optimised LLVM IR"
              ir={compileResult.optimizedIR}
              tag={<span className="tag tag-ssa">mem2reg</span>}
            />
          </div>
        ) : <Pending />;

      // ── Stage 4: Liveness ─────────────────────────────────────────────
      case 'liveness':
        return livenessResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <InfoBox
              icon="🔍"
              title="Stage 4 — Liveness Analysis"
              text="Determines which variables are 'alive' at each point in the program — meaning their current value may be needed later. Two variables alive at the same time CANNOT share a register. The algorithm is a backward data-flow fixpoint."
              items={[
                { key: 'CFG node', val: 'A basic block — a straight-line sequence of instructions with no branches in the middle.' },
                { key: 'CFG edge', val: 'A possible jump between blocks (from a branch instruction).' },
                { key: 'live-in', val: 'Variables alive when entering a block. Formula: live_in = use[B] ∪ (live_out[B] − def[B]).' },
                { key: 'live-out', val: 'Variables alive when leaving a block. Formula: live_out = union of live_in of all successors.' },
              ]}
            />
            <CFGView blocks={livenessResult.blocks} />
            <LivenessMatrix
              blocks={livenessResult.blocks}
              matrix={livenessResult.livenessMatrix}
            />
          </div>
        ) : <Pending />;

      // ── Stage 5: Interference Graph ───────────────────────────────────
      case 'interference':
        return livenessResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <InfoBox
              icon="⬡"
              title="Stage 5 — Interference Graph"
              text="Two variables interfere if they are simultaneously alive at any program point. They cannot share the same register. Register allocation is equivalent to graph coloring — assign colors (registers) to nodes so no two adjacent nodes share a color."
              items={[
                { key: 'Node', val: 'One SSA variable (virtual register). Each %name from the IR is one node.' },
                { key: 'Edge', val: 'Two variables are simultaneously live — they INTERFERE and must go in different registers.' },
                { key: 'Denser graph', val: 'More edges = more constraints = harder to color with k colors = more likely spills.' },
                { key: 'Chromatic number', val: 'The minimum number of colors needed to color the graph. If chromatic number > k, spilling is required.' },
              ]}
            />
            <InterferenceGraph graph={livenessResult.interferenceGraph} />
          </div>
        ) : <Pending />;

      // ── Stage 6: Allocation ───────────────────────────────────────────
      case 'allocation': {
        if (!allocateResult) return <Pending />;
        const lsResult = allocateResult.results['custom_ls'];
        const intervals = lsResult?.intervals ?? [];
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <InfoBox
              icon="🎯"
              title="Stage 6 — Register Allocation Results"
              text={`All allocators have run. Custom allocators (GC, LinScan) are limited to k = ${numRegisters} registers. LLVM allocators use the target architecture's full register file (16 x86-64 GPRs). The step timeline shows every internal decision the algorithm made.`}
              items={[
                { key: 'Green row', val: 'Variable assigned to a physical register — stays in fast CPU memory.' },
                { key: 'Red row', val: 'Variable SPILLED to the stack — will be loaded/stored from RAM, much slower.' },
                { key: 'Build → Simplify → Spill → Select', val: 'Four phases of Chaitin-Briggs graph coloring algorithm.' },
                { key: 'Gantt chart', val: 'Linear Scan live intervals — overlapping bars compete for the same register slot.' },
              ]}
            />
            {Object.entries(allocateResult.results).map(([id, r]) => (
              <AllocationDetail
                key={id}
                allocatorId={id}
                result={r}
                numRegisters={numRegisters}
              />
            ))}
            {intervals.length > 0 && (
              <GanttChart intervals={intervals} numRegisters={numRegisters} />
            )}
          </div>
        );
      }

      // ── Stage 7: Assembly ─────────────────────────────────────────────
      case 'assembly':
        return allocateResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <InfoBox
              icon="⌨"
              title="Stage 7 — Generated Assembly"
              text="Machine code output. LLVM allocators produce real x86-64 assembly (assembleable and runnable). Custom allocators show a register assignment map. Spill instructions (red) are mov operations that save/restore values from the stack."
              items={[
                { key: 'mov [rsp+offset], reg', val: 'A SPILL — storing a register value to the stack frame. Costs memory latency.' },
                { key: 'mov reg, [rsp+offset]', val: 'A RELOAD — loading a spilled value back from the stack.' },
                { key: '.text / .globl', val: 'Assembly directives — metadata for the assembler, not CPU instructions.' },
                { key: 'Fewer lines', val: 'Fewer instructions = faster code. LLVM Greedy usually produces the shortest output.' },
              ]}
            />
            {Object.entries(allocateResult.results).map(([id, r]) => (
              <AssemblyViewer
                key={id}
                allocatorName={ALLOC_LABELS[id] ?? id}
                assembly={r.assembly}
                spillInstructions={r.spillInstructions}
                color={ALLOC_COLORS[id] ?? '#4f6ef7'}
              />
            ))}
          </div>
        ) : <Pending />;

      // ── Stage 8: Comparison ───────────────────────────────────────────
      case 'comparison':
        return allocateResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <InfoBox
              icon="📊"
              title="Stage 8 — Comparison Dashboard"
              text="Side-by-side quantitative comparison of all allocators. LLVM allocators serve as the production baseline. Custom allocators demonstrate the algorithmic behavior under register pressure (k constraint)."
              items={[
                { key: 'Spill Count', val: 'Number of variables that could not fit in registers and were moved to memory. Lower = better.' },
                { key: 'Register Count', val: 'Distinct physical registers used. LLVM uses up to 16; custom allocators are capped at k.' },
                { key: '★ Best badge', val: 'The allocator with the fewest spills wins. LLVM Greedy almost always wins for small functions.' },
                { key: 'Why LLVM wins', val: 'It uses 16 registers + sophisticated eviction heuristics. Our custom allocators are educational demonstrations with k ≤ 16.' },
              ]}
            />
            <ComparisonDash result={allocateResult} numRegisters={numRegisters} />
          </div>
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
