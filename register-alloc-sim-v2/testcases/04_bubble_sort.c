/* Testcase 04: Bubble Sort Inner Pass
 * Expected: High register pressure — pointer arithmetic,
 *           array indexing, temp variables, conditional swap.
 *           Forces spills with few registers.
 */
void bubble_pass(int *arr, int n) {
    for (int i = 0; i < n - 1; i++) {
        if (arr[i] > arr[i + 1]) {
            int tmp = arr[i];
            arr[i] = arr[i + 1];
            arr[i + 1] = tmp;
        }
    }
}
