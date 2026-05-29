# Demo Guide — Register Allocation Simulator

This document explains every page/stage of the project, provides plain-English
explanations of every concept used, breaks down every command, and gives you a
step-by-step script for presenting the demo to the teacher.

---

## Table of Contents

0. [Concepts & Glossary (Read This First)](#0-concepts--glossary)
1. [Project Overview (What to Say First)](#1-project-overview)
2. [Stage-by-Stage Walkthrough](#2-stage-by-stage-walkthrough)
3. [Demo Script (Exact Steps)](#3-demo-script)
4. [Anticipated Questions & Answers](#4-anticipated-questions--answers)

---

## 0. Concepts & Glossary

Read this section before anything else. These are all the technical terms you
need to understand and be able to explain.

---

### 0.1 What is a Compiler?

A **compiler** is a program that translates code you wrote (e.g., C) into
machine code the CPU can execute. It does this in multiple phases:

```
C source code
    ↓  [lexer + parser]   →  Abstract Syntax Tree (AST)
    ↓  [code generator]   →  Intermediate Representation (IR)
    ↓  [optimizer]        →  Optimized IR
    ↓  [code generator]   →  Assembly (.s file)
    ↓  [assembler]        →  Object file (.o)
    ↓  [linker]           →  Executable
```

Register allocation happens **during code generation**, after the IR is
optimized but before final assembly is produced.

---

### 0.2 What is LLVM?

**LLVM** (Low Level Virtual Machine) is an open-source compiler infrastructure
used by Clang (C/C++), Rust, Swift, and many others. It is NOT a virtual
machine in the Java/Python sense — the name is historical.

LLVM provides:
- A common **Intermediate Representation (IR)** — a language-independent
  format that sits between your source code and assembly
- A collection of **compiler passes** — optimization algorithms you can plug in
- **Backends** for different CPUs — x86-64, ARM, RISC-V, etc.

**Why we use LLVM**: Its IR is human-readable text (`.ll` files), its register
allocator can be swapped with a command-line flag, and it reports statistics
with `-stats`. Perfect for a simulator.

The three LLVM tools we use:

| Tool | Full Name | What it does |
|------|-----------|------|
| `clang` | C Language front-end | Turns C source into LLVM IR |
| `opt` | Optimizer | Applies optimization passes to the IR |
| `llc` | LLVM Static Compiler | Turns IR into machine assembly (.s) |

---

### 0.3 What is IR (Intermediate Representation)?

LLVM IR is a simplified, typed assembly language. Example:

```llvm
define i32 @add(i32 %a, i32 %b) {
entry:
  %result = add i32 %a, %b
  ret i32 %result
}
```

- `i32` = 32-bit integer type
- `%a`, `%b`, `%result` = **virtual registers** (like variables, unlimited in number)
- `@add` = function name
- `entry:` = basic block label

The key difference from real assembly: IR has **unlimited virtual registers**.
Real CPUs only have a fixed number of physical registers (x86-64 has 16).
**Register allocation is the job of mapping virtual registers → physical registers.**

---

### 0.4 What is SSA Form?

**SSA = Static Single Assignment**. In SSA form, every variable is assigned
(written to) **exactly once**. This is a property of the IR, not the source code.

**Before SSA** (with `alloca`, stack variables):
```llvm
%a.addr = alloca i32        ; allocate stack slot
store i32 5, i32* %a.addr  ; write to it
%a.val = load i32, i32* %a.addr  ; read it back
```

**After SSA** (after `mem2reg` pass):
```llvm
%a = 5
```

SSA makes **liveness analysis and register allocation** much simpler because
you can see exactly where each value is defined and where it's last used.

For **loops**, SSA uses **phi nodes** to merge values from different paths:
```llvm
while.cond:
  %i.0 = phi i32 [ 0, %entry ], [ %inc, %for.inc ]
  ;               ↑ if coming from entry: i=0
  ;                                ↑ if coming from loop back-edge: i=inc
```
A phi node says: "pick the value based on which block I came from."

---

### 0.5 What is a Register?

A **register** is a tiny, extremely fast storage location inside the CPU chip.
Accessing a register takes ~1 clock cycle. Accessing RAM (memory) takes
100-300 clock cycles.

A typical x86-64 CPU has 16 general-purpose registers:
`rax, rbx, rcx, rdx, rsi, rdi, rsp, rbp, r8, r9, r10, r11, r12, r13, r14, r15`

Your C program can have hundreds of variables. But the CPU only has 16 slots.
Something has to give.

---

### 0.6 What is Register Allocation?

**Register allocation** is the compiler phase that decides:
- Which variable lives in which physical register
- Which variables must be stored in memory ("spilled") because there aren't
  enough registers

This is one of the most important optimizations in a compiler — bad register
allocation = lots of memory accesses = slow code.

**Example:**
```
Virtual registers: %a, %b, %c, %d, %e, %f   (6 variables)
Physical registers available: rax, rbx, rcx  (3 registers, k=3)

Result:
  %a → rax
  %b → rbx
  %c → rcx
  %d → SPILLED (stored on stack)
  %e → SPILLED (stored on stack)
  %f → rax (reuse rax after %a is no longer needed)
```

---

### 0.7 What is Register Spilling?

**Spilling** happens when there are more simultaneously live variables than
available registers. The compiler must:
1. **Store** (spill) a register's value to the stack (memory) — this is a `mov` instruction
2. Later **reload** it when needed — another `mov` instruction

Each spill adds 2 instructions and causes memory latency (100-300x slower
than register access).

**Visual example with k=2:**
```
   Point in code:   Variables alive:   Registers (k=2):
   ─────────────    ────────────────   ────────────────
   instruction 1    [a, b]             rax=a, rbx=b        ✓ fits
   instruction 2    [a, b, c]          rax=a, rbx=b, c=?   ✗ SPILL c
   instruction 3    [a, b, c]          rax=a, rbx=b        (c is on stack)
   instruction 4    [b, c]             rax=reload c, rbx=b ← reload
```

**In the project:** The red entries in the register map and red bars in the
Gantt chart are spills. The "Spill Count" metric counts how many variables
were spilled.

---

### 0.8 What is Liveness Analysis?

**Liveness analysis** answers the question:
> "At each point in the program, which variables might still be used in the
> future?"

A variable is **live** at a point if its current value will be used before
it is redefined.

This matters for register allocation: two variables that are **never live
at the same time** can safely share the same register.

**Algorithm — Backward Data-Flow:**
We process basic blocks in reverse order (backward analysis):
```
live_out[B] = union of live_in of all successor blocks
live_in[B]  = use[B] ∪ (live_out[B] − def[B])

where:
  use[B]  = variables used in B before being defined
  def[B]  = variables defined (written to) in B
```
Repeat until no sets change (fixpoint). Usually converges in 2-5 iterations.

**In the project:** Stage 4 shows the **Liveness Matrix** — each row is a
basic block, columns show live-in and live-out variable sets.

---

### 0.9 What is a Basic Block?

A **basic block** is a maximal sequence of instructions where:
- Execution enters only at the top (no jumps into the middle)
- Execution leaves only at the bottom (one conditional/unconditional branch)

All instructions in a basic block always execute together. This property
makes analysis much simpler — you analyze whole blocks, not individual lines.

**Example:** A while loop becomes 3 basic blocks:
```
[entry block]          →  [condition check block]  →  [exit block]
                              ↑         ↓
                        [loop body block]
```

---

### 0.10 What is a Control Flow Graph (CFG)?

A **Control Flow Graph** is a directed graph where:
- Each **node** is a basic block
- Each **edge** represents a possible jump from one block to another

Edges come from:
- Unconditional branches: `br label %target`
- Conditional branches: `br i1 %cond, label %true, label %false`

**In the project:** Stage 4 shows the CFG using Cytoscape.js. For GCD:
```
entry → while.cond → while.body → (back to while.cond)
                   → while.end
```

---

### 0.11 What is an Interference Graph?

Two variables **interfere** if they are **live at the same time**. If they
interfere, they cannot be placed in the same register (they'd overwrite each other).

The **interference graph** is:
- **Nodes** = SSA variables (virtual registers)
- **Edges** = interference between two variables (they're simultaneously live)

**Example:** If `%a` and `%b` are both live at instruction 5, then there's an
edge `%a — %b`. They must go into different registers.

Register allocation = **graph coloring** of this interference graph:
- Colors = physical registers (k colors available)
- Constraint = no two adjacent nodes can share the same color

**In the project:** Stage 5 shows the interference graph as a force-directed
circle graph. Denser graphs (more edges) = harder allocation.

---

### 0.12 What is Graph Coloring?

A **graph coloring** assigns colors to nodes such that no two adjacent nodes
have the same color. For register allocation:
- Colors = registers (r0, r1, ..., r(k-1))
- k = number of available registers

If the graph can be colored with k colors → no spills needed.
If NOT → we must spill some variables (remove them from the graph) until
it can be colored.

**Chaitin-Briggs Algorithm** (our custom_gc):
1. **Build**: Create the interference graph
2. **Simplify**: Remove nodes with degree < k (these are easy — color them later)
   Push them onto a stack
3. **Spill**: If all nodes have degree ≥ k, pick one to potentially spill
4. **Select**: Pop nodes from stack, greedily assign first available color.
   If no color free → actual spill.

**Key insight of Simplify:** A node with fewer than k neighbors can ALWAYS
be colored — whatever colors its neighbors use, at least one color is left.

---

### 0.13 What is Linear Scan Register Allocation?

**Linear Scan** (Poletto-Sarkar) is a simpler, faster alternative to graph coloring.

**Idea:** Flatten the entire program into a linear sequence of instructions.
For each variable, compute its **live interval** = [first definition, last use].
Then scan intervals left-to-right, greedily assigning registers:

```
Interval timeline (k=2 registers available):

%a  |==========|
%b       |===============|
%c              |====|
%d                    |=========|

Time →  0  1  2  3  4  5  6  7  8

Scan:
  %a starts → assign rax
  %b starts → assign rbx
  %c starts → %a ended (expire it, free rax) → assign rax to %c
  %d starts → rax=freed → assign rax to %d
  Result: 0 spills!
```

**Spill heuristic:** If all k registers are taken when a new interval starts,
spill the interval with the **farthest end point** (keeps registers free longer).

**Advantage over graph coloring:** O(n log n) vs O(n²) — much faster.
**Disadvantage:** Makes local decisions, so may produce more spills.

**In the project:** The **Gantt chart** in Stage 6 visualizes the live
intervals as horizontal bars. Each color = a register. Red bars = spills.

---

### 0.14 What is LLVM Greedy vs LLVM Fast?

**LLVM Greedy** (`-regalloc=greedy`):
- Production-quality allocator used by default in Clang
- Based on Chaitin-style graph coloring with **eviction heuristics**
- If a register is needed, it may "evict" an existing variable if that
  variable has a cheaper spill cost
- Almost always produces zero spills for small functions
- Slower to compile (more analysis)

**LLVM Fast** (`-regalloc=fast`):
- Simplified per-basic-block linear scan
- Makes no global decisions — only looks at one block at a time
- May produce more spills (doesn't see the full picture)
- Very fast to compile — used in debug builds (`-O0`)

**Important:** Both LLVM allocators use the **full x86-64 register file
(16 registers)**. They are NOT limited by our `k` slider. This is why they
almost always show 0 spills — they have 16 registers for most small functions.

---

### 0.15 Explaining the Commands

#### `clang -S -emit-llvm -O0 -Xclang -disable-O0-optnone -fno-discard-value-names input.c -o output.ll`

| Flag | Meaning |
|------|---------|
| `-S` | Output text format (not binary bytecode) |
| `-emit-llvm` | Produce LLVM IR instead of assembly |
| `-O0` | No optimizations (raw, unoptimized IR) |
| `-Xclang -disable-O0-optnone` | **Critical!** Without this, clang marks functions with `optnone` which makes `opt` skip ALL passes. This flag disables that so our `opt` step actually works. |
| `-fno-discard-value-names` | Keep human-readable names like `%a`, `%b` instead of `%0`, `%1` |
| `-o output.ll` | Write result to this file |

**Why `-O0`?** We want the raw IR without clang's own optimizations, so we
can see what `opt` does ourselves in Stage 3.

---

#### `opt -passes=mem2reg,instcombine input.ll -S -o output.ll`

| Flag/Pass | Meaning |
|-----------|---------|
| `-passes=...` | New-style LLVM pass pipeline specification |
| `mem2reg` | **Memory to Register promotion** — the key pass. Converts `alloca`/`load`/`store` stack variables into SSA registers with phi nodes. This is what gives us clean SSA form. |
| `instcombine` | Instruction combining — simplifies patterns like `x = a + 0` → `x = a`. Makes IR cleaner but doesn't affect register pressure significantly. |
| `-S` | Output text format |

**Why `mem2reg`?** After `clang -O0`, every local variable is on the stack
(`alloca`). You can't do register allocation on stack operations. `mem2reg`
promotes them into virtual SSA registers, which is what we allocate.

---

#### `llc -regalloc=greedy -stats input.ll -o output.s`

| Flag | Meaning |
|------|---------|
| `-regalloc=greedy` | Use the greedy register allocator. Options: `greedy`, `fast`, `basic` |
| `-stats` | Print internal statistics to stderr — includes spill counts, number of registers used, etc. We parse this output to get the spill count metric. |
| `-o output.s` | Write the assembly output here |

**What this does:** Converts LLVM IR all the way to x86-64 assembly. This
includes instruction selection (choosing which CPU instructions to use),
register allocation, and instruction scheduling.

---

#### `uvicorn main:app --host 0.0.0.0 --port 8000`

This starts the **FastAPI backend** server.

| Part | Meaning |
|------|---------|
| `uvicorn` | ASGI web server for Python (like nginx/gunicorn but for async Python) |
| `main:app` | Load the `app` object from `main.py` (our FastAPI application) |
| `--host 0.0.0.0` | Listen on all network interfaces (not just localhost) |
| `--port 8000` | Listen on port 8000 |

**FastAPI** is a Python web framework. It automatically generates API
documentation at `http://localhost:8000/docs`.

---

#### `npm run dev` (frontend)

This starts the **Vite development server** for the React frontend.

| Part | Meaning |
|------|---------|
| `npm` | Node Package Manager — manages JavaScript dependencies |
| `run dev` | Runs the `dev` script from `package.json`, which executes `vite` |
| `vite` | Ultra-fast frontend build tool. In dev mode, it serves the React app at `http://localhost:5173` with hot module replacement (changes update instantly) |

**React** is the UI framework. **TypeScript** adds types to JavaScript.
**Zustand** manages the pipeline state (what stage you're on, the results).
**Axios** makes HTTP requests to the backend API.
**Cytoscape.js** renders the interactive CFG and interference graphs.
**Recharts** renders the bar charts in the comparison dashboard.

---

### 0.16 Quick Reference: What Each File Does

| File | Language | Purpose |
|------|----------|---------|
| `backend/main.py` | Python | API server — receives requests, calls LLVM tools, returns results |
| `backend/llvm_pipeline.py` | Python | Wrapper functions for `clang`, `opt`, `llc` subprocess calls |
| `backend/ir_parser.py` | Python | Parses `.ll` text into basic block objects with use/def sets |
| `backend/liveness.py` | Python | Backward data-flow fixpoint solver for live-in/live-out |
| `backend/interference.py` | Python | Builds interference graph from liveness data |
| `backend/graph_coloring.py` | Python | Chaitin-Briggs algorithm implementation |
| `backend/linear_scan.py` | Python | Poletto-Sarkar algorithm implementation |
| `backend/asm_parser.py` | Python | Extracts metrics (spills, register count) from `.s` text |
| `backend/schemas.py` | Python | Pydantic models — defines the shape of API request/response JSON |
| `frontend/src/App.tsx` | TypeScript | Main app — routes to the correct stage component |
| `frontend/src/store/simulatorStore.ts` | TypeScript | Zustand store — holds all pipeline results in memory |
| `frontend/src/components/` | TypeScript | 9 visual components for each pipeline stage |

---

## 1. Project Overview

### What to Say First (30 seconds)

> "This project is a **Register Allocation Simulator** built on top of the
> **LLVM compiler toolchain**. It takes real C code, compiles it using
> `clang` to produce LLVM IR, then runs **four different register allocation
> algorithms** — two from LLVM itself (Greedy and Fast) and two custom
> implementations (Chaitin-Briggs Graph Coloring and Poletto-Sarkar Linear
> Scan). The tool visualizes every stage of the pipeline — from source code
> to final assembly — and compares the allocators on metrics like spill
> count and register usage."

### Architecture (if asked)

> "The project has two parts:
> - A **Python FastAPI backend** that calls `clang`, `opt`, and `llc` via
>   subprocess, and also runs the custom allocation algorithms
> - A **React + TypeScript frontend** that visualizes each pipeline stage
>   with interactive graphs, tables, and charts
>
> The frontend talks to the backend through REST API calls. The backend
> does all the heavy lifting — compilation, liveness analysis, interference
> graph construction, and register allocation."

---

## 2. Stage-by-Stage Walkthrough

### Stage 1: C Source (Input)

**What this page does:**
- Shows a Monaco code editor (same engine as VS Code) where you write C code
- Has **6 preset programs** ranging from simple arithmetic to a "pressure
  bomb" that deliberately creates high register pressure
- Has an **allocator selector** where you toggle which allocators to run
- Has a **k slider** (2–16) that controls how many registers the custom
  allocators can use
- The "Run Pipeline" button sends the code through all 8 stages

**What to explain:**
> "Here we write or select a C program. The key control is the **k slider**
> — this sets how many registers our custom allocators are allowed to use.
> With fewer registers, more variables get spilled to memory. The LLVM
> allocators always use the full x86-64 register file (16 GPRs), so they
> serve as our production baseline for comparison."

---

### Stage 2: Unoptimized IR

**What this page does:**
- Shows the raw LLVM IR produced by `clang -S -emit-llvm -O0`
- The IR uses `alloca` instructions — variables live on the stack
- SSA names are preserved thanks to `-fno-discard-value-names`

**What to explain:**
> "This is the unoptimized LLVM IR. Notice the `alloca` instructions at the
> top — each variable is allocated on the stack. This is what `-O0` produces.
> We can't do register allocation on this directly because everything is
> memory-based. That's why we need the next stage."

---

### Stage 3: Optimized IR

**What this page does:**
- Shows the IR after running `opt -passes=mem2reg,instcombine`
- `mem2reg` promotes stack allocations to SSA registers (phi nodes appear)
- `instcombine` simplifies instructions

**What to explain:**
> "After running the `mem2reg` optimization pass, all `alloca` instructions
> are gone. Variables are now **SSA virtual registers** like `%a`, `%b`.
> If there's a loop, you'll see **phi nodes** — these are how SSA form
> handles variables that have different values depending on which branch
> was taken. This SSA form is what we analyze for register allocation."

**Key thing to point out:**
- Show how `alloca` + `load`/`store` in Stage 2 became direct `%x = add i32 %a, %b` in Stage 3
- If using GCD/Fibonacci, show the phi nodes in the loop header

---

### Stage 4: Liveness Analysis

**What this page does:**
- Shows the **Control Flow Graph** (CFG) rendered with Cytoscape.js
- Below the CFG is a **Liveness Matrix** table showing:
  - Each basic block's instructions
  - **Live-In**: variables that are alive when entering the block
  - **Live-Out**: variables that are alive when leaving the block

**What to explain:**
> "Liveness analysis answers the question: **which variables are alive at
> each point in the program?** A variable is 'live' if its current value
> might be used later. We compute this using the standard **backward
> data-flow fixpoint algorithm**:
>
> - `live_out[B] = union of live_in of all successors`
> - `live_in[B] = use[B] ∪ (live_out[B] − def[B])`
>
> We iterate until no set changes. The CFG above shows the control flow
> between basic blocks. The table below shows exactly which variables are
> live at each block boundary."

**Key thing to point out:**
- Pick a block and trace why a variable is in `live_in` (it's used before being defined)
- Show that `live_out` of a block equals `live_in` of its successors

---

### Stage 5: Interference Graph

**What this page does:**
- Shows a **force-directed graph** where:
  - Each **node** is an SSA variable
  - Each **edge** means the two variables are **simultaneously live** at
    some point — they **interfere** and cannot share the same register
- Node colors are based on variable name (consistent hashing)

**What to explain:**
> "Two variables **interfere** if they are alive at the same time. If they
> interfere, they can't be placed in the same register. This graph is
> constructed by walking each block's instructions backward: for every
> definition `d`, we add an edge from `d` to every variable in the
> current live set.
>
> Register allocation is essentially **graph coloring** — we need to color
> this graph with `k` colors (registers) such that no two adjacent nodes
> share a color. If the graph's chromatic number exceeds `k`, we must
> **spill** some variables to memory."

**Key thing to point out:**
- Count the edges — more edges = more constraints = harder allocation
- For pressure_bomb: the graph will be very dense (nearly complete graph)

---

### Stage 6: Allocation (NEW — Step-by-Step Analytics)

**What this page does:**
- Shows a **summary banner** for each allocator with spill count, register
  count, and k value
- Shows a **Register Map table** — which variable got which register, and
  which ones were spilled (red)
- For custom allocators, shows a **step-by-step algorithm timeline**:
  - **Build**: Interference graph loaded
  - **Simplify**: Low-degree nodes pushed onto stack
  - **Spill**: High-degree nodes marked as potential spills
  - **Select**: Nodes popped from stack and assigned colors
- For Linear Scan, shows a **Gantt chart** of live intervals with register
  assignments and spill markers

**What to explain:**
> "This is the core of the project — the actual register allocation. Let me
> walk you through the custom Graph Coloring result:
>
> 1. We start with the interference graph — N nodes, M edges, k registers
> 2. **Simplify phase**: We find nodes with fewer than k neighbors. These
>    are 'easy' — we can always color them later. We remove them and push
>    onto a stack.
> 3. **Spill phase**: If all remaining nodes have ≥ k neighbors, we pick
>    one as a spill candidate (heuristic: highest degree)
> 4. **Select phase**: We pop nodes from the stack and greedily assign the
>    first available color. If no color is free, the node is an actual spill.
>
> The register map table shows the final assignment. Green = assigned to a
> register. Red = spilled to memory.
>
> For Linear Scan, the Gantt chart shows each variable's live interval as a
> horizontal bar. The color indicates which register it was assigned to.
> Red bars are spills."

**Key thing to point out:**
- Show the step timeline — click "Show All Steps" to see every phase
- Point out a spill step (highlighted with red border and 💥 icon)
- In the Gantt chart, show how overlapping intervals compete for registers

---

### Stage 7: Assembly

**What this page does:**
- Shows the **generated assembly code** for each allocator
- For LLVM allocators: real x86-64 assembly from `llc`
- For custom allocators: a pseudo-assembly showing the register map
- **Spill instructions** are highlighted in red with a "← spill" marker
- Assembly is syntax-highlighted: blue = instructions, green = registers,
  yellow = labels, gray = directives

**What to explain:**
> "Here's the actual machine code. For the LLVM allocators, this is real
> x86-64 assembly that could be assembled and run. Notice the spill
> instructions — these are `mov` instructions that load/store to the stack
> frame via `%rsp` or `%rbp`. Each spill instruction adds memory latency.
>
> The LLVM Greedy allocator typically produces fewer spills than Fast
> because it uses sophisticated eviction heuristics — it might evict a
> less-used register to make room for a more critical variable."

**Key thing to point out:**
- Point out a specific spill line (highlighted red)
- Compare the assembly length between Greedy (shorter, fewer spills) and
  Fast (longer, more spills)

---

### Stage 8: Comparison Dashboard

**What this page does:**
- Shows **metric cards** for each allocator with spill count, register
  count, instruction count, and spill instruction count
- The "★ Best" badge marks the allocator with the fewest spills
- Three **bar charts** compare:
  1. Spill counts across allocators
  2. Register usage across allocators
  3. Instruction counts (LLVM only)
- An info banner explains what each allocator is

**What to explain:**
> "The comparison dashboard gives us the quantitative results. Key takeaways:
>
> - **LLVM Greedy almost always wins** — it has access to 16 registers and
>   uses advanced heuristics. This is the production-quality allocator used
>   in real compilers.
> - **LLVM Fast trades quality for speed** — more spills but faster compile
>   time. Used in debug builds.
> - **Custom Graph Coloring** with k=4 produces some spills because the
>   interference graph can't be 4-colored.
> - **Custom Linear Scan** may produce different spill decisions because it
>   works on linearized intervals, not the full graph.
>
> The key insight is: **fewer registers → more spills → more memory
> traffic → slower code**."

---

## 3. Demo Script (Exact Steps)

### Setup (before demo)
```bash
cd register-alloc-sim-v2
./build.sh    # if not already done
./run.sh      # starts backend + frontend
# Open http://localhost:5173
```

### Step-by-Step Demo

#### Part A: The Happy Path (2 minutes)

1. **Open the app** → Show the clean interface, explain the 8-stage pipeline
   in the sidebar
2. **Select "Simple Arithmetic" preset** → Say: *"Let's start with a trivial
   case — 3 variables, no loops"*
3. **Set k = 4** → Say: *"We give our custom allocators 4 registers"*
4. **Click "Run Pipeline"** → Watch the stages progress in the sidebar
5. **Click through stages 2-3** → Quickly show unopt IR vs opt IR, point
   out how `alloca` disappears after mem2reg
6. **Go to Stage 6 (Allocation)** → Say: *"With only 3 variables and 4
   registers, everything fits. Zero spills across all allocators."*
7. **Go to Stage 8 (Comparison)** → Say: *"All four allocators agree —
   no spills needed. This is the best case."*

#### Part B: The Failure Case (3 minutes) — **Most Important**

8. **Go back to Stage 1** → Select **"Register Pressure Bomb"** preset
9. **Set k = 4** → Say: *"Now I'll reduce the register count to force
   spills"*
10. **Click "Run Pipeline"** → Wait for completion
11. **Go to Stage 4 (Liveness)** → Say: *"Look at the live-out set — 8
    variables are alive simultaneously. With only 4 registers, some must
    be spilled."*
12. **Go to Stage 5 (Interference)** → Say: *"The interference graph is
    nearly complete — almost every variable interferes with every other.
    This is a worst case for graph coloring."*
13. **Go to Stage 6 (Allocation)** → **THIS IS THE KEY SLIDE**
    - Point out the LLVM Greedy result: 0 spills (it has 16 registers)
    - Point out Custom GC: 2+ spills (only 4 registers)
    - **Open the step timeline** → Walk through the Simplify/Spill/Select
      steps one by one
    - Say: *"The algorithm tried to simplify, but all nodes had degree ≥ 4.
      So it had to spill. After spilling, the remaining nodes could be
      colored."*
    - Show the **register map table** — green assigned, red spilled
    - Show the **Gantt chart** for Linear Scan — overlapping intervals
      competing for the same 4 registers
14. **Go to Stage 7 (Assembly)** → Point out the spill instructions in
    the LLVM Fast output
15. **Go to Stage 8 (Comparison)** → Say: *"Here's the final comparison.
    LLVM Greedy has 0 spills because it uses all 16 x86 registers. Our
    custom allocator with k=4 had to spill 2 variables. This proves that
    register count directly affects code quality."*

#### Part C: Interactive Demo (1 minute)

16. **Go back to Stage 1** → Change k from 4 to 8 and re-run
17. **Go to Stage 8** → Say: *"Now with k=8, the custom allocators also
    have 0 spills — enough registers for all variables."*
18. **Change k to 2** and re-run → Say: *"With k=2, even the simple GCD
    program starts spilling. Two registers are not enough for any
    non-trivial program."*

### Closing Statement (15 seconds)

> "In summary, this project demonstrates that register allocation is
> fundamentally a graph coloring problem. The LLVM toolchain handles it
> with sophisticated heuristics and many registers. Our custom
> implementations show the core algorithms — Chaitin-Briggs and Linear
> Scan — and how they behave under varying register pressure. The
> interactive comparison proves that fewer registers means more spills,
> more memory access, and slower code."

---

## 4. Anticipated Questions & Answers

### Q: "Why doesn't changing k affect the LLVM allocators?"

> "LLVM's `llc` always uses the target architecture's full register file —
> 16 general-purpose registers on x86-64. There's no flag to artificially
> limit it to k registers. That's why we include LLVM as a **production
> baseline** and use our custom allocators to demonstrate what happens with
> limited registers. The comparison is educational: LLVM shows the real-world
> result, custom allocators show the algorithmic behavior."

### Q: "What LLVM tools does this use?"

> "Three tools:
> 1. `clang -emit-llvm` — compiles C to LLVM IR
> 2. `opt -passes=mem2reg` — promotes stack variables to SSA registers
> 3. `llc -regalloc=greedy/fast` — generates assembly with a specific
>    register allocator and reports statistics"

### Q: "What's the difference between Graph Coloring and Linear Scan?"

> "Graph Coloring (Chaitin-Briggs) looks at the entire interference graph —
> it considers all variable conflicts globally. It's O(n²) but produces
> better allocations. Linear Scan (Poletto-Sarkar) is O(n log n) — it
> flattens the program to a linear sequence and scans intervals from left
> to right. It's faster but makes local decisions, so it may produce more
> spills. Linear Scan is used in JIT compilers like Java HotSpot where
> compile time matters."

### Q: "What is a phi node?"

> "In SSA form, every variable is defined exactly once. But in a loop, a
> variable like `sum` has two definitions — the initial value and the
> updated value. A phi node merges these: `%sum.0 = phi i32 [0, %entry],
> [%new_sum, %loop]`. It selects the right value based on which predecessor
> block we came from."

### Q: "What does 'spill' mean?"

> "When we run out of registers, we must store a variable's value to the
> stack (memory) and reload it later. This is called 'spilling'. Each
> spill adds two instructions (a store and a load) and causes memory
> latency, making the code slower. The goal of register allocation is to
> minimize spills."

### Q: "Can you show a failure case?"

> *(Run the Pressure Bomb with k=2 or k=4. Point to the red spilled
> entries in the register map and the spill steps in the timeline.)*

### Q: "What's the liveness analysis algorithm?"

> "Standard backward data-flow analysis. For each block:
> - `live_out = union of live_in of all successor blocks`
> - `live_in = variables used in this block ∪ (live_out − variables
>   defined in this block)`
>
> We iterate in reverse until a fixpoint — no set changes between
> iterations. This converges because the sets can only grow."

### Q: "How do you build the interference graph?"

> "For each basic block, we walk instructions backward. When we see a
> definition `d`, we add an edge from `d` to every currently-live
> variable. Then we remove `d` from the live set and add the used
> variables. This correctly captures which variables are alive at the
> same time."
