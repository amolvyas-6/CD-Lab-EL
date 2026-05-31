# EVALUATION — Register Allocation Simulator v2

## 1. Evaluation Methodology

We evaluate the simulator by running **6 C test programs** through all **4
register allocators** and comparing three key metrics:

| Metric             | Source                       | Meaning                          |
|--------------------|------------------------------|----------------------------------|
| **Spill Count**    | `llc -stats` / algorithm log | Number of variables spilled to memory |
| **Register Count** | Assembly analysis / k        | Distinct physical registers used |
| **Instruction Count** | Assembly line count       | Total non-directive assembly instructions |

### Allocators Under Test

| ID          | Type    | Description                              |
|-------------|---------|------------------------------------------|
| `greedy`    | LLVM    | Production Chaitin-style with eviction   |
| `fast`      | LLVM    | Per-block linear scan (fast compile)     |
| `custom_gc` | Custom  | Chaitin-Briggs graph coloring (k regs)   |
| `custom_ls` | Custom  | Poletto-Sarkar linear scan (k regs)      |

**Note**: LLVM allocators use the target architecture's full register file
(16 GPRs on x86-64). Custom allocators are limited to `k` registers, making
the comparison educational rather than direct.

## 2. Test Cases

### Test Case 1: Simple Arithmetic (`01_simple.c`)
```c
int simple(int a, int b, int c) {
    return a * b + c;
}
```
- **Register pressure**: Low (3 variables)
- **Expected behavior**: No spills with any allocator or k ≥ 3
- **Purpose**: Baseline — verifies the pipeline works end-to-end

### Test Case 2: Loop Sum (`02_loop_sum.c`)
```c
int sum(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += i;
    return s;
}
```
- **Register pressure**: Moderate (loop-carried `s`, `i`, `n`)
- **Expected behavior**: No spills with k ≥ 3
- **Purpose**: Tests loop-carried liveness and phi nodes

### Test Case 3: GCD (`03_gcd.c`)
```c
int gcd(int a, int b) {
    while (b != 0) { int t = a % b; a = b; b = t; }
    return a;
}
```
- **Register pressure**: Moderate (3 live vars in loop body)
- **Expected behavior**: No spills with k ≥ 3; possible spills with k = 2
- **Purpose**: Classic algorithm with multiple loop-carried values

### Test Case 4: Bubble Sort (`04_bubble_sort.c`)
```c
void bubble_pass(int *arr, int n) {
    for (int i = 0; i < n - 1; i++) {
        if (arr[i] > arr[i + 1]) {
            int tmp = arr[i]; arr[i] = arr[i + 1]; arr[i + 1] = tmp;
        }
    }
}
```
- **Register pressure**: High (pointer, index, temps, array elements)
- **Expected behavior**: Spills likely with k ≤ 4
- **Purpose**: Tests pointer arithmetic and conditional register pressure

### Test Case 5: Fibonacci (`05_fibonacci.c`)
```c
int fib(int n) {
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) { int c = a + b; a = b; b = c; }
    return a;
}
```
- **Register pressure**: Medium-high (4 simultaneously live: `a`, `b`, `i`, `n`)
- **Expected behavior**: No spills with k ≥ 4; spills with k = 2 or 3
- **Purpose**: Tests simultaneous liveness of multiple loop variables

### Test Case 6: Pressure Bomb (`06_pressure_bomb.c`) — **FAILURE CASE**
```c
int pressure(int a, int b, int c, int d) {
    int w = a+b, x = b+c, y = c+d, z = d+a;
    int p = w*x, q = y*z;
    return p + q + w + x + y + z;
}
```
- **Register pressure**: Very high (8+ simultaneously live variables)
- **Expected behavior**: **Guaranteed spills** with k ≤ 6
- **Purpose**: Demonstrates allocator behavior under extreme pressure;
  this is the designated failure case showing that spills are unavoidable
  when register count is insufficient

## 3. Expected Results Matrix

| Test Case        | LLVM Greedy | LLVM Fast | Custom GC (k=6) | Custom LS (k=6) |
|------------------|-------------|-----------|------------------|------------------|
| 01 Simple        | 0 spills    | 0 spills  | 0 spills         | 0 spills         |
| 02 Loop Sum      | 0 spills    | 0 spills  | 0 spills         | 0 spills         |
| 03 GCD           | 0 spills    | 0 spills  | 0 spills         | 0 spills         |
| 04 Bubble Sort   | 0 spills    | 0-1 spills| 0-2 spills       | 0-2 spills       |
| 05 Fibonacci     | 0 spills    | 0 spills  | 0 spills         | 0 spills         |
| 06 Pressure Bomb | 0 spills    | 0-2 spills| **2+ spills**    | **2+ spills**    |

### Key observations:

1. **LLVM Greedy consistently produces the fewest spills** — it has access to
   16+ GPRs on x86-64 and uses sophisticated eviction heuristics.
2. **LLVM Fast may produce more spills** than Greedy because it uses a
   simpler per-block allocation strategy.
3. **Custom allocators with small k show clear spill behavior** — reducing k
   from 6 to 2 makes the pressure bomb spill 4+ variables.
4. **The pressure bomb test case reliably demonstrates failure** — with k ≤ 6,
   the custom allocators cannot avoid spills, making it ideal for showing
   what happens when register pressure exceeds capacity.

## 4. Custom Allocator k-Sensitivity

The custom allocators (GC and LS) allow the user to vary `k` and observe
the effect on spill count. Expected behavior for the pressure bomb:

| k  | Custom GC Spills | Custom LS Spills |
|----|------------------|------------------|
| 2  | 4-6              | 4-6              |
| 4  | 2-4              | 2-4              |
| 6  | 1-2              | 1-2              |
| 8  | 0                | 0                |
| 10 | 0                | 0                |

This demonstrates the fundamental tradeoff: fewer registers → more spills
→ more memory traffic → slower execution.

## 5. Unit Test Coverage

The `tests/` directory contains 4 test files with 20+ individual tests:

| File                      | Tests | Coverage                                |
|---------------------------|-------|-----------------------------------------|
| `test_graph_coloring.py`  | 5     | No interference, triangle graphs, spills, valid coloring |
| `test_linear_scan.py`     | 5     | No overlap, overlapping, pressure, Gantt data |
| `test_liveness.py`        | 3     | Simple IR, set types, fixpoint termination |
| `test_llvm_pipeline.py`   | 4     | Compile, optimize, llc greedy, llc fast  |

Run all tests:
```bash
cd backend
uv run pytest ../tests/ -v
```

## 6. Comparison: Graph Coloring vs Linear Scan

| Criterion           | Graph Coloring (Chaitin-Briggs) | Linear Scan (Poletto-Sarkar) |
|---------------------|---------------------------------|------------------------------|
| Time complexity     | O(n²) worst case                | O(n log n)                   |
| Optimality          | Optimal for chordal graphs      | Heuristic                    |
| Spill quality       | Better (considers full graph)   | Worse (local decisions)      |
| Implementation      | More complex (graph operations) | Simpler (sorted intervals)   |
| JIT suitability     | Too slow for JIT                | Ideal for JIT compilers      |
| Visualization       | Interference graph coloring     | Gantt-chart timeline         |
