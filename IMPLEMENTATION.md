# IMPLEMENTATION — Register Allocation Simulator v2

## 1. LLVM Toolchain Integration

The backend invokes three LLVM tools via Python's `subprocess` module.
All invocations use temporary directories and 30-second timeouts.

### 1.1 clang — C to LLVM IR

```bash
clang -S -emit-llvm -O0 -Xclang -disable-O0-optnone \
      -fno-discard-value-names input.c -o unopt.ll
```

Key flags:
- `-S -emit-llvm`: Emit textual LLVM IR (`.ll`), not bitcode
- `-O0`: No optimization (so we see the raw IR)
- `-Xclang -disable-O0-optnone`: **Critical** — prevents clang from marking
  functions with `optnone`, which would cause `opt` to skip all passes
- `-fno-discard-value-names`: Keep human-readable SSA names like `%a`, `%b`
  instead of `%0`, `%1`

### 1.2 opt — IR Optimization

```bash
opt -passes=mem2reg,instcombine unopt.ll -S -o opt.ll
```

Passes applied:
- `mem2reg`: Promotes `alloca`-based variables to SSA registers. This is the
  key transformation — it converts stack-allocated locals into SSA phi nodes,
  giving us clean interference data.
- `instcombine`: Simplifies instruction patterns (dead code, constant folding).
  Makes the IR more readable without changing register pressure significantly.

The code also has a fallback for older LLVM versions that use the legacy pass
syntax (`-mem2reg -instcombine`).

### 1.3 llc — Register Allocation and Code Generation

```bash
llc -regalloc=greedy -stats input.ll -o output.s
```

- `-regalloc=greedy|fast|basic`: Selects the register allocation strategy.
  LLVM's greedy allocator is the production default; fast is a simplified
  per-block allocator.
- `-stats`: Dumps allocator statistics to stderr, including spill counts.

**Important limitation**: `llc` always uses the target architecture's full
register file (e.g., 16 general-purpose registers on x86-64). The user's `k`
slider only affects the custom Python allocators. This is by design — LLVM
serves as the production baseline for comparison.

## 2. IR Parser (`ir_parser.py`)

The IR parser converts textual LLVM IR into a list of `IRBasicBlock` objects.

### Parsing Strategy

1. Detect `define` lines to enter a function scope
2. Match labels (`^(\w[\w.]*):$`) to start new basic blocks
3. Handle implicit entry blocks (first instruction without a label)
4. Accumulate instructions per block

### Use/Def Analysis

For each block, we compute:
- **`defn`** (defined): SSA values on the LHS of `%x = ...` instructions
- **`use`** (used): SSA value references (`%x`) that appear before being
  defined in the same block

The regex `%[\w.]+` matches all SSA value references. We walk instructions
forward, tracking what has been defined so far.

### CFG Construction

Branch instructions are parsed to build predecessor/successor links:
- `br label %target` → unconditional edge
- `br i1 %cond, label %true, label %false` → two conditional edges
- `ret` → no successors

## 3. Liveness Analysis (`liveness.py`)

Standard backward data-flow analysis with fixpoint iteration:

```
live_out[B] = ⋃ live_in[S]      for each successor S of B
live_in[B]  = use[B] ∪ (live_out[B] − def[B])
```

The solver iterates in reverse block order until no set changes. A safety
limit of 500 iterations prevents infinite loops on degenerate CFGs.

## 4. Interference Graph (`interference.py`)

Two SSA values interfere if they are simultaneously live at any program point.

Construction rule (per-block):
1. Initialize `live` = `live_out[B]`
2. Walk instructions in **reverse** order
3. For each definition `d`: add edges `(d, v)` for all `v ∈ live`, then
   remove `d` from `live`
4. Add all uses to `live`

This correctly handles the case where a definition kills a variable
(it should not interfere with itself).

## 5. Custom Allocators

### 5.1 Graph Coloring (`graph_coloring.py`)

Implements Chaitin-Briggs with these phases:

1. **Build**: Construct adjacency lists from the interference edge list
2. **Simplify loop**: Repeatedly find nodes with `degree < k`, remove them
   and push onto a coloring stack
3. **Spill selection**: When no low-degree node exists, pick the node with
   minimum degree as a potential spill (conservative heuristic)
4. **Select**: Pop stack, greedily assign the first free color among
   `{r0, r1, ..., r(k-1)}`; if all colors are taken by neighbors, the
   node is an actual spill

Every phase transition and assignment is recorded as a step for the frontend
animation timeline.

### 5.2 Linear Scan (`linear_scan.py`)

Implements Poletto-Sarkar:

1. **Interval computation**: Flatten all blocks into a linear instruction
   sequence. For each SSA value, record `[first_def, last_use]`.
2. **Scanning**: Walk intervals sorted by start point:
   - **Expire**: Remove active intervals whose endpoint is before the
     current interval's start; free their register
   - **Assign**: If a free register exists, assign it
   - **Spill**: If all k registers are active, spill the interval with
     the farthest endpoint (heuristic: keeps short-lived values in registers)

The interval data is returned for the Gantt chart visualization.

## 6. Assembly Parser (`asm_parser.py`)

Extracts metrics from `llc` output:

- **Spill instructions**: Lines matching `mov[lqwb]? offset(%rsp/%rbp), %reg`
  (x86) or `ldr/str [sp/x29]` (AArch64)
- **Physical register count**: Distinct `%XX` patterns excluding segment regs
- **Instruction count**: Non-directive, non-label, non-comment lines
- **Stats parsing**: Regex `(\d+) regalloc.*spill` from `llc -stats` stderr

## 7. API Endpoints

| Method | Path            | Description                                |
|--------|-----------------|--------------------------------------------|
| POST   | `/api/compile`  | C source → unopt IR + opt IR               |
| POST   | `/api/allocate` | Opt IR → 4 allocator results with metrics  |
| POST   | `/api/liveness` | Opt IR → blocks, liveness, interference    |
| GET    | `/api/presets`  | List of 6 built-in C programs              |
| GET    | `/health`       | Health check                               |

## 8. Frontend Components

| Component          | Purpose                                          |
|--------------------|--------------------------------------------------|
| `InputStage`       | Monaco editor, preset selector, allocator config |
| `IRViewer`         | Syntax-highlighted LLVM IR display               |
| `CFGView`          | Cytoscape.js control flow graph                  |
| `LivenessMatrix`   | Table of live-in/live-out sets per block          |
| `InterferenceGraph`| Force-directed interference graph (Cytoscape.js) |
| `AllocationDetail` | Step-by-step algorithm timeline + register map   |
| `GanttChart`       | Live interval timeline for linear scan           |
| `AssemblyViewer`   | Syntax-highlighted assembly with spill markers   |
| `ComparisonDash`   | Metric cards + bar charts for all allocators     |

## 9. Known Limitations

1. The IR parser uses regex, not a proper LLVM parser. It may fail on
   complex IR constructs (vector types, invoke/landingpad, metadata).
2. Phi node uses are attributed to the block containing the phi, not the
   predecessor block. This is a simplification that can slightly affect
   liveness accuracy.
3. `llc` register allocation cannot be constrained to k registers — it
   always uses the target's full register file.
4. Custom allocators work on SSA virtual registers, while LLVM allocators
   work on machine-level virtual registers after instruction selection.
   The comparison is educational, not directly numerical.
