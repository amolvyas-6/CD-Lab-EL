# Register Allocation Simulator — Project Plan
### Compiler Design Laboratory Project | 6th Semester B.Tech CSE | 4-Member Team

---

## 🚀 IMPLEMENTATION PROGRESS

> **Project location:** `/home/decipher/Projects/CD-LAB-EL/register-alloc-sim/`
> **Tech stack:** React 18 + Vite + TypeScript + Tailwind CSS + Zustand + Cytoscape.js + Framer Motion + Monaco Editor + Recharts

| Phase | Description | Status |
|-------|-------------|--------|
| **Phase 1** | Project Scaffolding + App Shell (Vite, React, TS, Tailwind, Zustand, Monaco Editor, sidebar nav, theme toggle) | ✅ **Complete** |
| **Phase 2** | Core Algorithms: TAC Lexer + Parser + Basic Block Partitioner + CFG Builder + Parse/Block/CFG views | ✅ **Complete** |
| **Phase 3** | Liveness Analysis (backward data-flow) + Interference Graph Builder + their UI views | ✅ **Complete** |
| **Phase 4** | Graph Coloring — Chaitin-Briggs (Build→Simplify→Spill→Select) + UI view with step recording | ✅ **Complete** |
| **Phase 5** | Linear Scan — Poletto-Sarkar (live intervals + active list + spill heuristic) + Gantt chart | ✅ **Complete** |
| **Phase 6** | Step Controls (play/pause/next/prev/speed), pipeline stage layout with controls panel | ✅ **Complete** |
| **Phase 7** | Comparison Dashboard (Recharts bar chart, side-by-side assignments), Output view (annotated TAC + export), all stages wired up | ✅ **Complete** |

### ✅ What's implemented (Phases 1–7 COMPLETE):
- `src/core/types.ts` — All TypeScript interfaces
- `src/core/lexer.ts` — TAC tokenizer with error recovery
- `src/core/parser.ts` — TAC parser (all statement types)
- `src/core/cfg.ts` — Basic block partitioning + CFG edge wiring + use/def sets
- `src/core/liveness.ts` — Backward data-flow fixpoint solver + per-instruction liveness
- `src/core/interference.ts` — Interference graph builder
- `src/core/graphColoring.ts` — Chaitin-Briggs with step recording
- `src/core/linearScan.ts` — Poletto-Sarkar with live interval computation
- `src/core/pipeline.ts` — Full pipeline runner (all stages)
- `src/store/simulatorStore.ts` — Zustand global state
- `src/presets/examples.ts` — 6 preset programs
- `src/components/Layout/` — Sidebar + Header
- `src/components/Editor/` — Monaco TAC Editor + Input Stage
- `src/components/CFGView/` — Parse view, Basic Block cards, CFG Cytoscape graph
- `src/components/LivenessMatrix/` — Liveness matrix table
- `src/components/InterferenceGraph/` — Cytoscape IG view + Graph Coloring view
- `src/components/GanttChart/` — Linear Scan Gantt chart
- `src/components/StepControls/` — Play/pause/step controls
- `src/components/ComparisonDash/` — Algorithm comparison dashboard + Output view

### 🔲 Not yet implemented (optional extensions from plan):
- Unit tests (Vitest) for algorithm correctness
- Mini-C frontend (Python + PLY backend)
- RISC-V register name mapping
- SSA form conversion

---

## 1. PROJECT OVERVIEW

### What is this project?

A **Register Allocation Simulator** is an interactive, web-based educational tool that visualizes and animates the end-to-end process of allocating CPU registers to program variables during compilation. Register allocation is one of the most critical and intellectually rich phases of a compiler's backend — it directly maps to **Unit V (Code Generation)** of the syllabus and also exercises concepts from **Unit IV (Intermediate Code Generation)** and **Unit V (Data-Flow Analysis)**.

The simulator accepts a simple program (written in a subset of C or in Three-Address Code), walks through all intermediate stages step-by-step with animations, and produces a final register assignment — making the entire compiler back-end pipeline visible and interactive.

### Why is this project significant?

Register allocation is an **NP-complete problem** (graph coloring reduction). Industry compilers like GCC and LLVM implement sophisticated heuristics to solve it. This project implements two well-studied algorithms:
1. **Chaitin-Briggs Graph Coloring** (used in GCC)
2. **Poletto-Sarkar Linear Scan** (used in JIT compilers like HotSpot JVM, LLVM's fast allocator)

The side-by-side comparison of both algorithms is the key differentiator of this project.

---

## 2. SYLLABUS COVERAGE

| Syllabus Topic | How It Maps to This Project |
|---|---|
| Unit IV — Intermediate Code Generation (Three-Address Code) | Input to the simulator is TAC; students write/paste TAC |
| Unit IV — Basic Blocks | CFG is constructed by partitioning TAC into basic blocks |
| Unit V — Basic Blocks and Flow Graphs | Full CFG visualized as an interactive graph |
| Unit V — Data-Flow Analysis | Live variable analysis (liveness equations: live-in, live-out) computed and displayed |
| Unit V — Code Generation & Optimization | Final register assignment and spill code insertion shown |
| Lab Part A (4) — Translation to intermediate form | TAC is the input format |
| Lab Part B (1) — Writing simple compiler using Flex/Bison/LLVM | Optional extension: frontend parses a mini-C language |
| Lab Part B (4) — Code improvement and optimization using LLVM | Linear Scan algorithm mirrors LLVM's fast allocator design |

---

## 3. CORE PIPELINE (What the simulator does, step by step)

```
Input Program (TAC or Mini-C)
        |
        v
[Stage 1] Lexer + Parser → TAC Instructions
        |
        v
[Stage 2] Basic Block Partitioning → Control Flow Graph (CFG)
        |
        v
[Stage 3] Liveness Analysis → Live-in / Live-out sets per block
        |
        v
[Stage 4] Interference Graph Construction
        |
        v
[Stage 5A] Graph Coloring (Chaitin-Briggs)
        OR
[Stage 5B] Linear Scan Allocation
        |
        v
[Stage 6] Spill Handling → Spill code generation
        |
        v
[Stage 7] Final Register Assignment → Annotated TAC output
```

Every stage is visualized with animations and explanatory text.

---

## 4. TECH STACK

### Frontend (Primary — where 80% of work happens)
| Technology | Purpose |
|---|---|
| **React 18** (Vite) | Component architecture, state management |
| **Zustand** | Global state store (pipeline stages, algorithm state) |
| **Cytoscape.js** | CFG visualization and Interference Graph rendering |
| **Framer Motion** | Step-by-step animations for algorithm walkthroughs |
| **Monaco Editor** | In-browser code editor for TAC / Mini-C input (same as VS Code) |
| **Tailwind CSS** | Utility-first styling |
| **Recharts** | Performance comparison charts (spills, registers used) |

### Backend (Optional — for Mini-C parsing extension)
| Technology | Purpose |
|---|---|
| **Python 3.11 + FastAPI** | REST API for the Mini-C → TAC frontend parser |
| **PLY (Python Lex-Yacc)** | Lexer + parser for Mini-C subset |
| **Uvicorn** | ASGI server |

> **Note for AI Agent**: If you want a self-contained frontend-only app, implement the TAC parser, CFG builder, liveness analysis, and both allocation algorithms entirely in TypeScript/JavaScript. This is fully feasible and preferred for deployment simplicity. The Python backend is only needed if implementing the Mini-C → TAC compilation frontend.

### Development Tooling
- **Vite** — build tool
- **TypeScript** — type safety across all modules
- **Vitest** — unit tests for algorithm correctness
- **ESLint + Prettier** — code quality
- **GitHub** — version control, one branch per team member

### Deployment
- **Vercel** (frontend) — zero-config React deployment
- **Railway** (backend, if used) — FastAPI deployment

---

## 5. TEAM MEMBER RESPONSIBILITIES

### Member 1 — Frontend Infrastructure + UI/UX
- Project scaffolding (Vite + React + TS + Tailwind)
- App shell: sidebar navigation, stage progress tracker, theme (dark/light)
- Monaco Editor integration for TAC input
- Stage-by-stage animated layout (stepper component)
- Zustand store design

### Member 2 — Core Algorithms (Graph Coloring)
- TAC parser (TypeScript: tokenizer + parser → IR)
- Basic block partitioning algorithm
- CFG construction
- **Chaitin-Briggs Graph Coloring** algorithm:
  - Build interference graph
  - Simplification (node removal)
  - Coalescing
  - Freeze
  - Spill selection
  - Select (coloring)
- Cytoscape.js interference graph visualizer

### Member 3 — Core Algorithms (Linear Scan)
- **Liveness Analysis** (backward data-flow equations):
  - `use[B]` and `def[B]` computation
  - Iterative live-in/live-out fixpoint solver
- **Poletto-Sarkar Linear Scan** algorithm:
  - Live interval computation
  - Active list management
  - Spill heuristic
- Liveness table visualization (per-variable per-block matrix)
- Live interval timeline visualization (Gantt-chart style)

### Member 4 — Comparison Dashboard + Testing + Docs
- Side-by-side comparison view: Graph Coloring vs Linear Scan
  - Registers assigned, spills generated, time complexity display
- Preset example programs (5–6 TAC examples of varying complexity)
- Step-through debugger controls (Next / Prev / Play / Pause / Speed)
- Export feature: download annotated TAC + register assignment as `.txt`
- Unit tests for all algorithms (Vitest)
- Project report + README

---

## 6. INPUT FORMAT SPECIFICATION

### Option A: Three-Address Code (TAC) Input
The simulator accepts standard TAC with the following grammar:

```
program     → statement*
statement   → assignment | goto | if_goto | label | param | call | return
assignment  → var '=' expr
expr        → var op var | op var | var | const
op          → '+' | '-' | '*' | '/' | '<' | '>' | '==' | '!='
goto        → 'goto' label
if_goto     → 'if' var 'goto' label | 'ifFalse' var 'goto' label
label       → identifier ':'
param       → 'param' var
call        → var '=' 'call' funcname ',' n
```

**Example TAC Input (provided as default in the editor):**
```
# Compute GCD
entry:
  t1 = a % b
  if t1 == 0 goto end
  a = b
  b = t1
  goto entry
end:
  result = a
```

### Option B: Mini-C Subset (Optional Extension)
```c
int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}
```

---

## 7. ALGORITHM SPECIFICATIONS

### 7.1 Basic Block Partitioning
**Leaders** are:
1. First instruction of the program
2. Target of any branch/goto
3. Instruction immediately following a branch

**Output**: List of `BasicBlock { id, instructions[], predecessors[], successors[] }`

### 7.2 Liveness Analysis
Backward data-flow analysis. For each block B:
```
use[B]  = variables used before being defined in B
def[B]  = variables defined before being used in B

live_out[B] = ∪ live_in[S]  for all successors S of B
live_in[B]  = use[B] ∪ (live_out[B] - def[B])
```
Iterate until fixpoint (no changes in live_in/live_out sets).

**Visualization**: A table showing each variable's liveness across all blocks, and whether it's live-in, live-out, defined, or used in each block.

### 7.3 Interference Graph
Two variables `u` and `v` **interfere** if they are simultaneously live at any program point.

Construction rule: For each definition `d = ...` with live-out set `L`:
- Add edge `(d, v)` for every `v ∈ L` where `v ≠ d`

**Visualization**: Cytoscape.js force-directed graph, nodes = variables, edges = interference.

### 7.4 Graph Coloring (Chaitin-Briggs)
Given `k` = number of available registers:

```
Phase 1 — Build:        Build interference graph
Phase 2 — Coalesce:     Merge non-interfering copy-related variables
Phase 3 — Freeze:       Give up coalescing low-degree nodes
Phase 4 — Simplify:     Push nodes with degree < k onto stack
Phase 5 — Spill:        If no node has degree < k, mark potential spill
Phase 6 — Select:       Pop stack, assign colors; if clash → actual spill
```

**State machine**: Each phase is a discrete step with visual diff (which node was added/removed from the stack, which color was assigned).

### 7.5 Linear Scan Register Allocation
```
1. Compute live intervals [start, end] for each variable
   (start = first definition, end = last use)
2. Sort intervals by start point
3. Maintain "active" list (sorted by end point)
4. For each interval i:
   a. Expire old intervals (remove from active if end < i.start)
   b. If |active| == k registers:
      - Spill interval with farthest end point
   c. Else:
      - Assign a free register to i
      - Add i to active list
```

**Visualization**: Gantt-chart style timeline, showing all live intervals as horizontal bars, colored by register assignment, with spills marked in red.

---

## 8. UI LAYOUT & SCREENS

### Screen 1: Input Stage
- Monaco Editor (left, 60% width) with syntax highlighting for TAC
- 5–6 preset example buttons (GCD, Fibonacci, Bubble Sort inner loop, etc.)
- Register count selector: `k = 2, 3, 4, ...` (slider)
- Algorithm selector: Graph Coloring | Linear Scan | Both (comparison)
- "Compile & Simulate" button

### Screen 2: Pipeline Visualizer (main screen)
- Left sidebar: Stage progress tracker (7 stages, checkmarks)
- Center: Current stage visualization
- Right panel: Explanation text for current step ("Why is this step happening?")
- Bottom: Step controls — `⏮ Reset | ⏪ Prev | ▶ Play | ⏩ Next | ⏭ Skip to end`
- Speed slider for auto-play

### Screen 3: Stage-specific views
| Stage | Visualization |
|---|---|
| TAC Parse | Token stream table + parsed instruction list |
| Basic Blocks | Numbered blocks with colored instruction groups |
| CFG | Cytoscape.js directed graph, nodes = blocks |
| Liveness | Interactive matrix: rows = blocks, cols = variables |
| Interference Graph | Cytoscape.js force-directed colored graph |
| Graph Coloring | Animated node coloring with stack state sidebar |
| Linear Scan | Gantt-chart timeline with register lanes |
| Final Output | Annotated TAC with register assignments; spill instructions highlighted |

### Screen 4: Comparison Dashboard (when "Both" is selected)
- Split view: Graph Coloring (left) vs Linear Scan (right)
- Metrics table: # spills, # registers used, # coalesces, execution steps
- Bar chart comparison (Recharts)
- Explanation of when each algorithm is preferred

---

## 9. DATA STRUCTURES (for AI coding agent)

```typescript
// Core IR
interface TACInstruction {
  id: number;
  op: 'assign' | 'add' | 'sub' | 'mul' | 'div' | 'lt' | 'gt' | 'eq' |
      'goto' | 'if_goto' | 'label' | 'param' | 'call' | 'return';
  result?: string;
  arg1?: string;
  arg2?: string;
  target?: string; // for goto/if_goto
}

interface BasicBlock {
  id: string;
  instructions: TACInstruction[];
  predecessors: string[];
  successors: string[];
  use: Set<string>;
  def: Set<string>;
  liveIn: Set<string>;
  liveOut: Set<string>;
}

interface CFG {
  blocks: Map<string, BasicBlock>;
  entry: string;
  exit: string;
}

// Interference Graph
interface InterferenceGraph {
  nodes: Map<string, { color?: number; spillCost: number; degree: number }>;
  edges: Set<string>; // "u--v" format, u < v alphabetically
  adjList: Map<string, Set<string>>;
}

// Linear Scan
interface LiveInterval {
  variable: string;
  start: number; // instruction index
  end: number;
  register?: number; // assigned register, undefined = spilled
  spilled: boolean;
}

// Algorithm Step (for animation)
interface SimulationStep {
  stageId: number;
  description: string;       // human-readable explanation
  highlightedNodes?: string[];
  highlightedEdges?: string[];
  stackState?: string[];     // for graph coloring
  activeIntervals?: string[]; // for linear scan
  assignmentsSoFar: Map<string, number>;
}
```

---

## 10. PRESET EXAMPLE PROGRAMS

The simulator ships with these built-in examples:

| # | Name | Description | Complexity |
|---|---|---|---|
| 1 | Simple Expression | `t1 = a + b; t2 = t1 * c` | 2 vars, no control flow |
| 2 | If-Else | Simple conditional assignment | 4 vars, 3 blocks |
| 3 | GCD Loop | Euclidean algorithm (like above) | 5 vars, loop |
| 4 | Bubble Sort (inner loop) | Classic register-pressure benchmark | 7 vars, nested loop |
| 5 | Fibonacci (iterative) | 4-variable iteration | 4 vars, loop |
| 6 | Forced Spill Example | 8 simultaneously live variables, k=3 | Guarantees spills |

---

## 11. PROJECT MILESTONES

| Week | Milestone | Owner |
|---|---|---|
| Week 1 | Project setup, Vite + React + TS scaffold, repo structure, Zustand store | M1 |
| Week 1 | TAC grammar spec finalized, tokenizer written | M2 |
| Week 2 | TAC parser complete + basic block partitioner | M2 |
| Week 2 | CFG construction + Cytoscape.js CFG visualizer | M2 |
| Week 3 | Liveness analysis (iterative solver) | M3 |
| Week 3 | Liveness visualization (matrix + per-instruction) | M3 |
| Week 4 | Interference graph builder + Cytoscape.js viz | M2 |
| Week 4 | Chaitin-Briggs graph coloring algorithm + step recorder | M2 |
| Week 5 | Live interval computation + Linear Scan algorithm | M3 |
| Week 5 | Gantt-chart timeline component | M3 |
| Week 6 | Step-through animation system + play/pause controls | M1 |
| Week 6 | Stage explanations panel + preset examples | M4 |
| Week 7 | Comparison dashboard + Recharts metrics | M4 |
| Week 7 | Export feature + spill code annotation | M4 |
| Week 8 | End-to-end testing, bug fixes, polish | All |
| Week 8 | Report + demo preparation | M4 |

---

## 12. EVALUATION & GRADING CRITERIA (Self-Assessment)

| Criterion | Target |
|---|---|
| Correctness of liveness analysis | Verified against textbook examples from Aho et al. ("Dragon Book") |
| Correctness of graph coloring | Verified: k-colorable graph produces valid assignment, non-colorable produces spills |
| Correctness of linear scan | Verified: no two simultaneously live variables share a register |
| Visual clarity | Every stage self-explanatory with ≤ 10 seconds of reading |
| Interactivity | Step-by-step with ≥ 30 distinct animation steps for a medium program |
| Code quality | TypeScript, ESLint clean, Vitest coverage ≥ 70% for algorithm modules |
| Report | IEEE format, covers all algorithms, cites Chaitin 1981, Poletto 1999, Dragon Book |

---

## 13. REFERENCES (IEEE Format)

[1] A. V. Aho, M. S. Lam, R. Sethi, and J. D. Ullman, *Compilers: Principles, Techniques, and Tools*, 2nd ed. Boston, MA: Addison-Wesley, 2006.

[2] G. J. Chaitin, M. A. Auslander, A. K. Chandra, J. Cocke, M. E. Hopkins, and P. W. Markstein, "Register allocation via coloring," *Computer Languages*, vol. 6, no. 1, pp. 47–57, Jan. 1981.

[3] M. Poletto and V. Sarkar, "Linear scan register allocation," *ACM Transactions on Programming Languages and Systems (TOPLAS)*, vol. 21, no. 5, pp. 895–913, Sep. 1999.

[4] P. Briggs, K. D. Cooper, and L. Torczon, "Improvements to graph coloring register allocation," *ACM Transactions on Programming Languages and Systems (TOPLAS)*, vol. 16, no. 3, pp. 428–455, May 1994.

[5] C. Wimmer and H. Mössenböck, "Optimized interval splitting in a linear scan register allocator," in *Proc. 1st ACM/USENIX International Conference on Virtual Execution Environments (VEE)*, Chicago, IL, USA, Jun. 2005, pp. 132–141.

---

## 14. FOLDER STRUCTURE

```
register-alloc-sim/
├── src/
│   ├── core/                    # Pure algorithm modules (no UI)
│   │   ├── lexer.ts             # TAC tokenizer
│   │   ├── parser.ts            # TAC parser → TACInstruction[]
│   │   ├── cfg.ts               # Basic blocks + CFG construction
│   │   ├── liveness.ts          # Liveness analysis (iterative)
│   │   ├── interference.ts      # Interference graph builder
│   │   ├── graphColoring.ts     # Chaitin-Briggs algorithm
│   │   ├── linearScan.ts        # Poletto-Sarkar algorithm
│   │   └── spillCode.ts         # Spill instruction insertion
│   ├── store/
│   │   └── simulatorStore.ts    # Zustand global state
│   ├── components/
│   │   ├── Editor/              # Monaco editor wrapper
│   │   ├── CFGView/             # Cytoscape.js CFG
│   │   ├── LivenessMatrix/      # Liveness table
│   │   ├── InterferenceGraph/   # Cytoscape.js IG
│   │   ├── GanttChart/          # Linear scan timeline
│   │   ├── StepControls/        # Play/pause/step buttons
│   │   ├── StageExplainer/      # Right panel explanations
│   │   └── ComparisonDash/      # Side-by-side metrics
│   ├── presets/
│   │   └── examples.ts          # 6 preset TAC programs
│   └── App.tsx
├── tests/
│   ├── liveness.test.ts
│   ├── graphColoring.test.ts
│   └── linearScan.test.ts
├── public/
├── index.html
├── vite.config.ts
├── tsconfig.json
└── README.md
```

---

## 15. KNOWN EDGE CASES (for AI coding agent — handle these)

1. **Unreachable blocks** in CFG — skip in liveness analysis, mark visually as unreachable
2. **Phi functions** — not needed since input is TAC with explicit temporaries, not SSA
3. **Call instructions** — all caller-save registers treated as clobbered; all live variables at a call site added to interference graph with all registers
4. **Self-loops in CFG** — liveness solver must handle these without infinite loop (fixpoint always terminates because sets only grow)
5. **Already-assigned variables** — function parameters are pre-colored to specific registers (e.g., a0–a3 for first 4 args in RISC-V convention)
6. **Coalescing** in graph coloring can cause infinite loop if not bounded — implement Briggs conservative coalescing, not aggressive coalescing
7. **k=1** register — always produces maximum spills; ensure spill code doesn't itself create temporaries that need registers (use memory directly)

---

## 16. EXTENSION IDEAS (if time permits)

1. **SSA Form**: Convert TAC to Static Single Assignment form before allocation — this is state-of-the-art (LLVM uses SSA-based allocation)
2. **Mini-C Frontend**: Use Python + PLY to parse a C subset and emit TAC, connecting to the simulator via REST API
3. **RISC-V Register Convention**: Map colors to actual RISC-V register names (x0–x31) with ABI names (ra, sp, a0–a7, t0–t6, s0–s11)
4. **Benchmark Mode**: Upload a file with multiple TAC functions, get aggregate spill statistics across both algorithms

---

*This document serves as the primary specification for the AI coding agent. Implement all core modules in TypeScript, ensure every algorithm module has a step-recording interface (returns `SimulationStep[]`), and keep algorithm logic strictly separated from UI components.*
