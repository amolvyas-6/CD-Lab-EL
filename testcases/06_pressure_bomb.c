/* Testcase 06: Register Pressure Bomb (FAILURE CASE)
 * Expected: Eight simultaneously live variables — GUARANTEES spills
 *           with k <= 6. This is the designated failure/stress case.
 *
 *           With k=4: at least 4 spills expected
 *           With k=6: at least 2 spills expected
 *           With k=8: no spills expected
 */
int pressure(int a, int b, int c, int d) {
    int w = a + b, x = b + c, y = c + d, z = d + a;
    int p = w * x, q = y * z;
    return p + q + w + x + y + z;
}
