"""Six built-in C preset programs for the simulator."""

PRESETS = [
    {
        "id": "simple",
        "name": "Simple Arithmetic",
        "description": "Three-variable addition — no spills expected. Best case for all allocators.",
        "language": "c",
        "source": """\
int simple(int a, int b, int c) {
    return a * b + c;
}
""",
    },
    {
        "id": "loop_sum",
        "name": "Loop Sum (Accumulator)",
        "description": "Loop with a running sum — exercises loop-carried liveness.",
        "language": "c",
        "source": """\
int sum(int n) {
    int s = 0;
    for (int i = 0; i < n; i++) s += i;
    return s;
}
""",
    },
    {
        "id": "gcd",
        "name": "GCD (Euclidean)",
        "description": "Classic GCD — moderate register pressure, loop with three live vars.",
        "language": "c",
        "source": """\
int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}
""",
    },
    {
        "id": "bubble_pass",
        "name": "Bubble Sort Inner Pass",
        "description": "Inner loop of bubble sort — high register pressure, forces spills with few registers.",
        "language": "c",
        "source": """\
void bubble_pass(int *arr, int n) {
    for (int i = 0; i < n - 1; i++) {
        if (arr[i] > arr[i + 1]) {
            int tmp = arr[i];
            arr[i] = arr[i + 1];
            arr[i + 1] = tmp;
        }
    }
}
""",
    },
    {
        "id": "fibonacci",
        "name": "Fibonacci (Iterative)",
        "description": "Iterative Fibonacci — four simultaneously live variables inside the loop.",
        "language": "c",
        "source": """\
int fib(int n) {
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        int c = a + b;
        a = b;
        b = c;
    }
    return a;
}
""",
    },
    {
        "id": "pressure_bomb",
        "name": "Register Pressure Bomb",
        "description": "Eight simultaneously live variables — guarantees spills with k ≤ 6.",
        "language": "c",
        "source": """\
int pressure(int a, int b, int c, int d) {
    int w = a + b, x = b + c, y = c + d, z = d + a;
    int p = w * x, q = y * z;
    return p + q + w + x + y + z;
}
""",
    },
]
