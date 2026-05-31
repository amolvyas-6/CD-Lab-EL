/* Testcase 01: Simple Arithmetic
 * Expected: No spills with k >= 3
 * Three-variable addition — minimal register pressure.
 */
int simple(int a, int b, int c) {
    return a * b + c;
}
