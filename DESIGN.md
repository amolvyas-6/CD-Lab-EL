# DESIGN — Register Allocation Simulator v2

## 1. Problem Statement

Register allocation is a critical phase in optimizing compilers. It maps an
unbounded number of virtual registers (SSA values in LLVM IR) to a finite set
of physical hardware registers. When more variables are simultaneously live
than there are physical registers, some must be *spilled* to memory, which
degrades performance. Effective register allocation minimizes spills while
respecting interference constraints.

This project builds an **interactive educational simulator** that demonstrates
how register allocation works by combining:
- Real compilation through the **LLVM toolchain** (clang → opt → llc)
- Custom Python implementations of two classic allocation algorithms
- A web-based frontend that visualizes every stage of the pipeline

## 2. Design Goals

1. **Educational clarity** — Expose every stage from C source to allocated
   assembly, with step-by-step algorithmic detail.
2. **Real LLVM integration** — Use actual clang/opt/llc so students see how
   production compilers handle the same programs.
3. **Comparative analysis** — Run multiple allocators on the same IR and
   compare their results quantitatively (spill count, register count,
   instruction count).
4. **Interactivity** — Let users write their own C code, adjust register
   count (k), and see results update live.

## 3. Architectural Overview

```
┌────────────────┐    HTTP/JSON     ┌───────────────────────────┐
│                │ ◄──────────────► │   FastAPI Backend (Py)    │
│   React + Vite │    /api/*        │                           │
│   (TypeScript) │                  │  ┌─────────────────────┐  │
│                │                  │  │  LLVM Toolchain      │  │
│  ┌───────────┐ │                  │  │  clang → opt → llc   │  │
│  │ Monaco    │ │                  │  └─────────────────────┘  │
│  │ Editor    │ │                  │  ┌─────────────────────┐  │
│  ├───────────┤ │                  │  │ Custom Allocators    │  │
│  │ Pipeline  │ │                  │  │ (GC + Linear Scan)   │  │
│  │ Stages    │ │                  │  └─────────────────────┘  │
│  ├───────────┤ │                  │  ┌─────────────────────┐  │
│  │ Charts &  │ │                  │  │ IR Parser, Liveness, │  │
│  │ Graphs    │ │                  │  │ Interference Builder │  │
│  └───────────┘ │                  │  └─────────────────────┘  │
└────────────────┘                  └───────────────────────────┘
```

### 8-Stage Pipeline

| # | Stage           | Tool / Module          | Output                        |
|---|-----------------|------------------------|-------------------------------|
| 1 | C Source        | Monaco editor          | Raw C code                    |
| 2 | Unopt IR        | `clang -O0 -emit-llvm` | Unoptimized LLVM IR           |
| 3 | Optimized IR    | `opt -passes=mem2reg`  | SSA-form LLVM IR              |
| 4 | Liveness        | `liveness.py`          | Live-in/live-out sets per BB  |
| 5 | Interference    | `interference.py`      | Interference graph (nodes+edges) |
| 6 | Allocation      | 4 allocators           | Register maps + steps         |
| 7 | Assembly        | `llc -regalloc=X`      | Annotated machine assembly    |
| 8 | Comparison      | Frontend charts        | Bar charts + metric cards     |

## 4. Approach: Why LLVM IR?

### Alternative 1: Synthetic Three-Address Code (TAC)
Our v1 prototype used a custom lexer/parser to convert typed pseudo-code into
TAC. While simpler to implement, this approach:
- Does not represent how real compilers work
- Misses SSA form, phi nodes, and LLVM-specific optimizations
- Cannot produce real machine assembly for comparison

### Alternative 2: GCC + RTL
GCC's register transfer language (RTL) is an option, but:
- GCC's internal IR is harder to extract and parse programmatically
- LLVM's textual `.ll` format is human-readable and well-documented
- LLVM's `llc -regalloc=X` flag makes it trivial to switch allocators

### Chosen: LLVM IR (textual `.ll`)
LLVM IR in SSA form is the ideal intermediate representation because:
- Each value is defined exactly once → clean def-use chains
- Phi nodes make control flow explicit → accurate liveness analysis
- The `-disable-O0-optnone` flag + `mem2reg` pass produces clean SSA
- `llc -stats` outputs allocator statistics to stderr

## 5. Algorithm Design

### 5.1 Chaitin-Briggs Graph Coloring

The classic algorithm with 4 phases:

1. **Build** — Construct adjacency list from interference edges
2. **Simplify** — Iteratively remove nodes with degree < k, push onto stack
3. **Spill** — When no low-degree node exists, pick the highest-degree node
   as a potential spill candidate
4. **Select** — Pop stack, assign first available color; if no color is free,
   mark as actual spill

Heuristic for spill selection: we pick the node with the lowest degree among
high-degree candidates. An alternative would be to use spill cost estimation
(frequency × number of uses), but for this educational tool we keep it simple.

### 5.2 Poletto-Sarkar Linear Scan

A simpler O(n log n) algorithm:

1. **Flatten** — Linearize the CFG, assign monotonic instruction indices
2. **Compute intervals** — For each SSA value, record [first_def, last_use]
3. **Scan** — Walk intervals sorted by start point:
   - Expire intervals that ended before the current start
   - If free registers exist, assign one
   - Otherwise, spill the interval with the farthest endpoint

This produces the Gantt-chart visualization shown in stage 6.

## 6. Design Decisions Summary

| Decision                  | Choice             | Rationale                              |
|---------------------------|--------------------|----------------------------------------|
| Backend language          | Python + FastAPI   | Rapid prototyping, subprocess calls    |
| Frontend framework        | React + TypeScript | Strong typing, rich ecosystem          |
| Graph rendering           | Cytoscape.js       | Force-directed layouts for IG/CFG      |
| Charts                    | Recharts           | React-native bar/Gantt charts          |
| Code editor               | Monaco Editor      | Same engine as VS Code                 |
| LLVM integration          | subprocess calls   | Simplest, no native bindings needed    |
| Custom allocator language | Python             | Matches backend, easy to instrument    |
