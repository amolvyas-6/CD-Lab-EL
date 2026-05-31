/* Testcase 02: Loop Sum (Accumulator)
 * Expected: Moderate register pressure from loop-carried dependency.
 * Loop with running sum exercises loop-carried liveness.
 */
int sum(int n) {
    int s = 0;
    for (int i = 0; i < n; i++)
        s += i;
    return s;
}
