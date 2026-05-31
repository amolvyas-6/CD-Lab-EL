/* Testcase 03: GCD (Euclidean Algorithm)
 * Expected: Moderate register pressure, loop with three live vars.
 * Classic GCD — tests phi nodes and loop-carried values.
 */
int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}
