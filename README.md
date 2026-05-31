# Register Allocation Simulator v2 — LLVM-Backed

An interactive, web-based educational tool that compiles **real C/C++ code** with
**Clang**, visualises the resulting **LLVM IR**, and compares four register allocation
strategies side-by-side:

| Allocator | Source | Description |
|---|---|---|
| **LLVM Greedy** | `llc -regalloc=greedy` | Production-quality, Chaitin-style with eviction |
| **LLVM Fast** | `llc -regalloc=fast` | Per-block linear scan, fast compile |
| **Custom GC** | Python (Chaitin-Briggs) | Educational graph coloring on SSA interference graph |
| **Custom LinScan** | Python (Poletto-Sarkar) | Educational linear scan on flattened live intervals |

---

## Architecture

```
Browser (React + Vite + TypeScript)
  └── /api/*  →  FastAPI backend  →  clang / opt / llc (LLVM toolchain)
```

### 8-Stage Pipeline
1. **C Source** — Monaco editor with C/C++ syntax, 6 preset programs
2. **Unopt IR** — `clang -O0 -emit-llvm`
3. **Opt IR** — `opt -passes=mem2reg,instcombine`
4. **Liveness** — Backward data-flow + CFG visualisation (Cytoscape.js)
5. **Interference** — Force-directed interference graph (Cytoscape.js)
6. **Allocation** — All 4 allocators run; step-by-step analytics, register
   maps, Gantt chart for Linear Scan
7. **Assembly** — Annotated `.s` output, spill instructions highlighted
8. **Comparison** — Metric cards + Recharts bar charts

---

## Quick Start

### Requirements
- Python 3.11+
- Node.js 18+
- LLVM toolchain: `clang`, `opt`, `llc`

```bash
# Ubuntu/Debian
sudo apt install clang llvm

# macOS
brew install llvm
```

### Build & Run (via scripts)

```bash
# Install all dependencies
./build.sh

# Start both backend and frontend
./run.sh

# Open http://localhost:5173
```

### Manual Start

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## Docker (Zero-Setup Demo)

```bash
docker compose up
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/docs
```

---

## Project Structure

```
register-alloc-sim-v2/
├── build.sh                   # Install dependencies
├── run.sh                     # Start both servers
├── DESIGN.md                  # Architecture & approach
├── IMPLEMENTATION.md          # LLVM details & code walkthrough
├── EVALUATION.md              # Metrics, comparison, test cases
├── backend/
│   ├── main.py                # FastAPI endpoints
│   ├── llvm_pipeline.py       # clang/opt/llc subprocess wrappers
│   ├── ir_parser.py           # LLVM IR → basic blocks
│   ├── liveness.py            # Backward data-flow solver
│   ├── interference.py        # Interference graph construction
│   ├── graph_coloring.py      # Chaitin-Briggs allocator
│   ├── linear_scan.py         # Poletto-Sarkar allocator
│   ├── asm_parser.py          # Assembly metric extraction
│   ├── schemas.py             # Pydantic request/response models
│   └── presets.py             # 6 built-in C programs
├── frontend/
│   └── src/
│       ├── App.tsx             # Pipeline stage router
│       ├── components/         # 9 visualization components
│       ├── store/              # Zustand state management
│       └── types.ts            # TypeScript interfaces
├── testcases/
│   ├── 01_simple.c            # Baseline (no spills)
│   ├── 02_loop_sum.c          # Loop-carried liveness
│   ├── 03_gcd.c               # Moderate pressure
│   ├── 04_bubble_sort.c       # High pressure
│   ├── 05_fibonacci.c         # 4 live vars
│   └── 06_pressure_bomb.c     # Failure case (forced spills)
└── tests/
    ├── test_graph_coloring.py  # 5 unit tests
    ├── test_linear_scan.py     # 5 unit tests
    ├── test_liveness.py        # 3 unit tests
    └── test_llvm_pipeline.py   # 4 integration tests
```

---

## Tests

```bash
# Run all tests (from the backend directory)
cd backend
uv run pytest ../tests/ -v

# Or individually
uv run python ../tests/test_graph_coloring.py
uv run python ../tests/test_linear_scan.py
uv run python ../tests/test_liveness.py
uv run python ../tests/test_llvm_pipeline.py   # requires clang + llc
```
