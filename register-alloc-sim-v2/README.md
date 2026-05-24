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
6. **Allocation** — All 4 allocators run; Gantt chart for Linear Scan
7. **Assembly** — Annotated `.s` output, spill instructions highlighted
8. **Comparison** — Metric cards + Recharts bar charts

---

## Quick Start (Local — No Docker)

### Requirements
- Python 3.11+
- Node.js 20+
- LLVM toolchain: `clang`, `opt`, `llc`

```bash
# Ubuntu/Debian
sudo apt install clang llvm

# macOS
brew install llvm
```

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Frontend
```bash
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

## Tests

```bash
# Backend unit tests (no LLVM required)
cd backend
python tests/test_graph_coloring.py
python tests/test_linear_scan.py
python tests/test_liveness.py

# With pytest
pip install pytest
pytest ../tests/
```

---

## References

[1] A. V. Aho et al., *Compilers: Principles, Techniques, and Tools*, 2nd ed. Addison-Wesley, 2006.
[2] C. Lattner and V. Adve, "LLVM: A compilation framework…", CGO 2004.
[3] G. J. Chaitin et al., "Register allocation via coloring," *Computer Languages*, 1981.
[4] M. Poletto and V. Sarkar, "Linear scan register allocation," *TOPLAS*, 1999.
[5] P. Briggs et al., "Improvements to graph coloring register allocation," *TOPLAS*, 1994.
[6] C. Wimmer and M. Franz, "Linear scan register allocation on SSA form," CGO 2010.
