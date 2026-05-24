# AMENDMENT: LLVM Integration
### Addendum to Register Allocation Simulator Project Plan
### Supersedes: Sections 3, 4, 5, 6, 8, 11, 14 of base plan

---

## WHAT CHANGES WITH LLVM

The original plan simulated register allocation from scratch in TypeScript.
With the LLVM requirement, the architecture shifts to:

1. **Real C/C++ source code** as input (not hand-written TAC)
2. **Clang** compiles it to LLVM IR (`.ll` files) — authentic SSA-form IR
3. **llc** runs LLVM's built-in register allocators on the IR
4. The simulator **wraps, visualizes, and compares** LLVM's actual outputs
5. The custom algorithms (Graph Coloring, Linear Scan) now serve as
   **educational counterparts** to LLVM's production allocators

This is the correct approach per Part B items 1, 3, and 4:
- Item 1: "Writing simple compiler using Flex/lex, Bison, **LLVM**"
- Item 3: "translating [C/C++] into a representation using **CLANG** suitable for optimization"
- Item 4: "Code improvement and optimization using **LLVM compiler**"

---

## REVISED ARCHITECTURE

```
 ┌─────────────────────────────────────────────────────────┐
 │                     BROWSER (React)                      │
 │  ┌──────────────┐   ┌──────────────┐   ┌─────────────┐  │
 │  │ Monaco Editor│   │  Pipeline    │   │ Comparison  │  │
 │  │ (C/C++ input)│   │  Visualizer  │   │ Dashboard   │  │
 │  └──────┬───────┘   └──────▲───────┘   └──────▲──────┘  │
 └─────────┼─────────────────┼──────────────────┼──────────┘
           │  REST API        │  JSON            │
 ┌─────────▼─────────────────┼──────────────────┼──────────┐
 │              Python + FastAPI Backend                    │
 │  ┌────────────────────────────────────────────────────┐  │
 │  │                  Compilation Pipeline               │  │
 │  │  C source → [clang] → LLVM IR → [opt] → [llc] →  │  │
 │  │  Assembly + Register Map + Spill Report            │  │
 │  └────────────────────────────────────────────────────┘  │
 │  ┌──────────────┐  ┌──────────────┐  ┌───────────────┐  │
 │  │ IR Parser    │  │ Reg Alloc    │  │ Custom Alloc  │  │
 │  │ (llvmlite)   │  │ Comparator   │  │ (Python impl) │  │
 │  └──────────────┘  └──────────────┘  └───────────────┘  │
 └──────────────────────────────────────────────────────────┘
           │  subprocess calls
 ┌─────────▼────────────────────────────────────────────────┐
 │              LLVM Toolchain (system-installed)            │
 │   clang      opt       llc       llvm-dis    llvm-as      │
 └──────────────────────────────────────────────────────────┘
```

---

## REVISED TECH STACK

### Backend (Now Mandatory)

| Tool | Version | Purpose |
|---|---|---|
| **Python** | 3.11 | Backend runtime |
| **FastAPI** | 0.110+ | REST API server |
| **llvmlite** | 0.43+ | Python bindings for LLVM IR manipulation |
| **subprocess** | stdlib | Shell out to clang, opt, llc |
| **clang** | 17+ (system) | C/C++ → LLVM IR compilation |
| **llc** | 17+ (system) | LLVM IR → assembly, with pluggable register allocators |
| **opt** | 17+ (system) | LLVM optimization pass runner |
| **llvm-dis** | 17+ (system) | Bitcode → human-readable IR (.ll) |
| **Pydantic** | 2.x | Request/response schema validation |
| **uvicorn** | latest | ASGI server |

Install LLVM toolchain on Ubuntu/Debian:
```bash
sudo apt install clang llvm llvm-dev
# Verify
clang --version   # should show 14+ or 17+
llc --version
```

Install Python dependencies:
```bash
pip install fastapi uvicorn llvmlite pydantic
```

### Frontend (Unchanged)
React 18 + Vite + TypeScript + Cytoscape.js + Monaco Editor + Tailwind + Recharts

---

## REVISED PIPELINE (9 Stages)

```
[1] C/C++ Source Input  →  Monaco Editor (C mode)
         |
         v
[2] Clang Frontend      →  clang -S -emit-llvm -O0 input.c -o input.ll
         |                 Produces: human-readable LLVM IR (.ll file)
         v
[3] IR Viewer           →  Display .ll file with SSA variables highlighted
                           Show: basic blocks, phi nodes, alloca/load/store
         |
         v
[4] Optimization Pass   →  opt -mem2reg -O1 input.ll -o opt.ll
         |                 mem2reg: promotes stack vars to SSA registers
         v                 (key pass before register allocation)
[5] Liveness Analysis   →  Extracted from LLVM IR by llvmlite
         |                 (or computed manually from opt IR for visualization)
         v
[6A] LLVM Greedy Alloc  →  llc -regalloc=greedy opt.ll -o greedy.s
[6B] LLVM Fast Alloc    →  llc -regalloc=fast   opt.ll -o fast.s
[6C] Custom Alloc       →  Python implementation (Graph Coloring / Linear Scan)
         |
         v
[7] Assembly Viewer     →  Annotated .s output with register assignments
         |
         v
[8] Spill Analysis      →  Count load/store spill instructions in each output
         |
         v
[9] Comparison Dashboard→  Greedy vs Fast vs Custom: spills, registers used,
                           code size, instruction count
```

---

## LLVM REGISTER ALLOCATORS (what llc exposes)

```bash
# The 4 allocators available in llc:
llc -regalloc=greedy   # Default. Sophisticated graph-coloring + eviction heuristics.
                        # Used in production. Corresponds to GCC's allocator in quality.

llc -regalloc=fast     # Per-basic-block linear scan. Used at -O0.
                        # Fast compile time, more spills. Corresponds to Poletto-Sarkar.

llc -regalloc=basic    # Iterative graph coloring. Simple, educational.

llc -regalloc=pbqp     # Partitioned Boolean Quadratic Programming. Research-grade.
```

The simulator runs **greedy** and **fast** by default, plus your **custom Python implementation**.
This gives a 3-way comparison: LLVM production vs LLVM fast vs hand-rolled algorithm.

---

## KEY LLVM COMMANDS (backend uses all of these)

```bash
# Stage 2: Compile C to LLVM IR (unoptimized, -O0 so all vars are visible)
clang -S -emit-llvm -O0 -Xclang -disable-O0-optnone input.c -o unopt.ll

# Stage 4: Run mem2reg pass (convert allocas to SSA φ-nodes)
opt -passes="mem2reg,instcombine" unopt.ll -S -o opt.ll

# Stage 6A: Run greedy allocator, emit assembly with debug info
llc -regalloc=greedy -print-after=greedy opt.ll -o greedy.s 2>greedy_debug.txt

# Stage 6B: Run fast allocator
llc -regalloc=fast opt.ll -o fast.s

# Get register allocation statistics (spill counts etc.)
llc -regalloc=greedy -stats opt.ll -o /dev/null 2>stats.txt

# Get verbose register allocation output
llc -regalloc=greedy -debug-only=regalloc opt.ll -o greedy.s 2>verbose.txt

# View final IR after all passes
llc -regalloc=greedy -print-after-all opt.ll -o greedy.s 2>all_passes.txt
```

---

## REVISED API ENDPOINTS

```
POST /api/compile
  Body: { source: string, language: "c" | "cpp", optimization: "O0" | "O1" }
  Returns: { unoptimizedIR: string, optimizedIR: string, error?: string }

POST /api/allocate
  Body: { ir: string, allocators: ["greedy", "fast", "custom_gc", "custom_ls"] }
  Returns: {
    results: {
      [allocator]: {
        assembly: string,
        registerMap: { [vreg]: preg },   // virtual → physical register
        spillCount: number,
        spillInstructions: string[],
        registerCount: number,
        instructionCount: number
      }
    }
  }

POST /api/liveness
  Body: { ir: string }
  Returns: {
    blocks: BasicBlock[],
    livenessMatrix: { [block]: { liveIn: string[], liveOut: string[] } },
    interferenceGraph: { nodes: string[], edges: [string,string][] }
  }

GET /api/presets
  Returns: list of built-in C example programs
```

---

## LLVM IR — WHAT TO SHOW IN THE VISUALIZER

LLVM IR is in **SSA (Static Single Assignment) form**. Each variable is assigned exactly once. This is what LLVM uses internally before register allocation.

Example — what the IR Viewer (Stage 3) shows for this C code:
```c
int add(int a, int b) {
    int c = a + b;
    return c;
}
```

LLVM IR output (after mem2reg):
```llvm
define i32 @add(i32 %a, i32 %b) {
entry:
  %c = add i32 %a, %b    ; %a, %b, %c are virtual registers (SSA values)
  ret i32 %c
}
```

After `llc -regalloc=greedy`, the virtual registers `%a`, `%b`, `%c` get mapped to
physical registers like `%edi`, `%esi`, `%eax` (x86) or `w0`, `w1` (ARM).

The simulator highlights this mapping: `%a → %edi`, `%b → %esi`, `%c → %eax`

---

## REVISED TEAM RESPONSIBILITIES

### Member 1 — Frontend + API Integration
- React app shell, routing, Zustand store
- Monaco Editor with **C/C++ syntax highlighting** (changed from TAC)
- API client layer (axios/fetch calls to FastAPI)
- Stage progress tracker, step controls

### Member 2 — LLVM Pipeline (Backend)
- FastAPI server setup + all `/api/*` endpoints
- **clang integration**: subprocess wrapper, error capture, temp file management
- **opt integration**: mem2reg + optimization passes
- **llc integration**: run all 4 allocators, capture outputs
- Assembly parser: extract register assignments from `.s` output
- LLVM stats parser: extract spill counts from `-stats` output

### Member 3 — IR Analysis + Visualization (Backend + Frontend)
- **llvmlite** integration: parse `.ll` IR into Python objects
- Liveness analysis on LLVM IR (using llvmlite's CFG traversal)
- Interference graph construction from liveness data
- Custom Python implementations:
  - Graph Coloring (Chaitin-Briggs)
  - Linear Scan (Poletto-Sarkar)
- Cytoscape.js IR basic block graph + interference graph frontend components

### Member 4 — Comparison Dashboard + Assembly Viewer + Tests
- **Assembly Viewer** component: syntax-highlighted `.s` output,
  with registers color-coded by variable they represent
- **Comparison Dashboard**: 3-way table + bar charts (Recharts)
- Virtual → Physical register mapping visualization
- Spill instruction highlighting in assembly
- Preset C example programs (6 programs)
- Integration tests (end-to-end: C source → final comparison)
- Project report

---

## PRESET C PROGRAMS (replace TAC presets)

```c
// Preset 1: Simple arithmetic (no spills expected)
int simple(int a, int b, int c) {
    return a * b + c;
}

// Preset 2: Loop with accumulator
int sum(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += i;
    return s;
}

// Preset 3: GCD (loop, register pressure)
int gcd(int a, int b) {
    while (b != 0) { int t = a % b; a = b; b = t; }
    return a;
}

// Preset 4: Bubble sort inner loop (high register pressure → forces spills with k=3)
void bubble_pass(int *arr, int n) {
    for (int i = 0; i < n - 1; i++) {
        if (arr[i] > arr[i+1]) {
            int tmp = arr[i]; arr[i] = arr[i+1]; arr[i+1] = tmp;
        }
    }
}

// Preset 5: Fibonacci (multiple live variables)
int fib(int n) {
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) { int c = a + b; a = b; b = c; }
    return a;
}

// Preset 6: Register pressure bomb (8 simultaneously live vars)
int pressure(int a, int b, int c, int d) {
    int w = a + b, x = b + c, y = c + d, z = d + a;
    int p = w * x, q = y * z;
    return p + q + w + x + y + z;
}
```

---

## REVISED FOLDER STRUCTURE

```
register-alloc-sim/
├── backend/
│   ├── main.py                  # FastAPI app, all route definitions
│   ├── llvm_pipeline.py         # clang + opt + llc subprocess wrappers
│   ├── ir_parser.py             # llvmlite: parse .ll → BasicBlock objects
│   ├── liveness.py              # Liveness analysis on parsed IR
│   ├── interference.py          # Interference graph from liveness
│   ├── graph_coloring.py        # Custom Chaitin-Briggs (Python)
│   ├── linear_scan.py           # Custom Poletto-Sarkar (Python)
│   ├── asm_parser.py            # Parse .s output for register map + spills
│   ├── presets.py               # 6 preset C programs as strings
│   ├── schemas.py               # Pydantic request/response models
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts        # axios wrappers for all /api/* endpoints
│   │   ├── store/
│   │   │   └── simulatorStore.ts
│   │   ├── components/
│   │   │   ├── Editor/          # Monaco (C/C++ mode)
│   │   │   ├── IRViewer/        # LLVM IR syntax highlight display
│   │   │   ├── CFGView/         # Cytoscape.js basic block graph
│   │   │   ├── LivenessMatrix/
│   │   │   ├── InterferenceGraph/
│   │   │   ├── AssemblyViewer/  # Annotated .s with register colors
│   │   │   ├── GanttChart/      # Linear scan timeline
│   │   │   ├── StepControls/
│   │   │   └── ComparisonDash/ # 3-way comparison
│   │   ├── presets/
│   │   └── App.tsx
│   ├── vite.config.ts
│   └── tsconfig.json
├── tests/
│   ├── test_liveness.py
│   ├── test_graph_coloring.py
│   ├── test_linear_scan.py
│   └── test_llvm_pipeline.py
├── docker-compose.yml           # One-command setup
└── README.md
```

---

## DOCKER SETUP (critical — LLVM must be available on the server)

```yaml
# docker-compose.yml
version: '3.9'
services:
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    volumes:
      - ./backend:/app

  frontend:
    build:
      context: ./frontend
    ports:
      - "5173:5173"
```

```dockerfile
# backend/Dockerfile
FROM ubuntu:22.04
RUN apt-get update && apt-get install -y \
    python3.11 python3-pip \
    clang-17 llvm-17 llvm-17-dev \
    && ln -s /usr/bin/clang-17 /usr/bin/clang \
    && ln -s /usr/bin/llc-17 /usr/bin/llc \
    && ln -s /usr/bin/opt-17 /usr/bin/opt
RUN pip install fastapi uvicorn llvmlite pydantic
WORKDIR /app
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Docker ensures LLVM is available regardless of host machine.
Use `docker compose up` for demo — zero setup required on the evaluator's machine.

---

## REVISED MILESTONES

| Week | Milestone | Owner |
|---|---|---|
| Week 1 | Repo setup, Docker, FastAPI skeleton, React scaffold | M1 + M2 |
| Week 1 | clang + opt + llc subprocess wrappers working end-to-end | M2 |
| Week 2 | `/api/compile` endpoint: C source → unopt IR + opt IR | M2 |
| Week 2 | Monaco Editor (C mode) + IR Viewer component | M1 |
| Week 3 | llvmlite IR parser: basic blocks + CFG | M3 |
| Week 3 | Liveness analysis on parsed IR; `/api/liveness` endpoint | M3 |
| Week 4 | Interference graph; Cytoscape.js visualizations | M3 |
| Week 4 | Custom graph coloring (Python) + custom linear scan (Python) | M3 |
| Week 5 | `/api/allocate`: run all 3 allocators, return maps + spill counts | M2 |
| Week 5 | Assembly parser: extract virtual→physical register map | M4 |
| Week 6 | Assembly Viewer component (color-coded registers) | M4 |
| Week 6 | Gantt chart for linear scan; step controls | M1 |
| Week 7 | 3-way Comparison Dashboard + Recharts charts | M4 |
| Week 7 | 6 preset programs + end-to-end integration tests | M4 |
| Week 8 | Polish, Docker verification, demo dry-run | All |
| Week 8 | IEEE report, README | M4 |

---

## REVISED REFERENCES (IEEE Format)

[1] A. V. Aho, M. S. Lam, R. Sethi, and J. D. Ullman, *Compilers: Principles, Techniques, and Tools*, 2nd ed. Boston, MA: Addison-Wesley, 2006.

[2] C. Lattner and V. Adve, "LLVM: A compilation framework for lifelong program analysis and transformation," in *Proc. International Symposium on Code Generation and Optimization (CGO)*, Palo Alto, CA, USA, Mar. 2004, pp. 75–86.

[3] G. J. Chaitin, M. A. Auslander, A. K. Chandra, J. Cocke, M. E. Hopkins, and P. W. Markstein, "Register allocation via coloring," *Computer Languages*, vol. 6, no. 1, pp. 47–57, Jan. 1981.

[4] M. Poletto and V. Sarkar, "Linear scan register allocation," *ACM Transactions on Programming Languages and Systems (TOPLAS)*, vol. 21, no. 5, pp. 895–913, Sep. 1999.

[5] P. Briggs, K. D. Cooper, and L. Torczon, "Improvements to graph coloring register allocation," *ACM Transactions on Programming Languages and Systems (TOPLAS)*, vol. 16, no. 3, pp. 428–455, May 1994.

[6] C. Wimmer and M. Franz, "Linear scan register allocation on SSA form," in *Proc. 8th Annual IEEE/ACM International Symposium on Code Generation and Optimization (CGO)*, Toronto, Canada, Apr. 2010, pp. 170–179.