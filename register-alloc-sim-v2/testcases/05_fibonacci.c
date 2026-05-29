/* Testcase 05: Fibonacci (Iterative)
 * Expected: Four simultaneously live variables inside the loop.
 *           May cause spills with k <= 3.
 */
int fib(int n) {
    int a = 0, b = 1;
    for (int i = 0; i < n; i++) {
        int c = a + b;
        a = b;
        b = c;
    }
    return a;
}
