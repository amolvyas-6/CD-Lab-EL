import type { PresetExample } from '../core/types';

export const PRESET_EXAMPLES: PresetExample[] = [
  {
    id: 'simple-expr',
    name: 'Simple Expression',
    description: '2 variables, no control flow',
    complexity: 'Trivial',
    code: `# Simple expression evaluation
start:
  t1 = a + b
  t2 = t1 * c
  result = t2`,
  },
  {
    id: 'if-else',
    name: 'If-Else',
    description: '4 variables, 3 blocks — conditional assignment',
    complexity: 'Easy',
    code: `# If-Else conditional
start:
  t1 = a < b
  ifFalse t1 goto else_branch
then_branch:
  result = a + b
  goto end
else_branch:
  result = a - b
end:
  x = result`,
  },
  {
    id: 'gcd-loop',
    name: 'GCD Loop',
    description: '5 variables, loop — Euclidean algorithm',
    complexity: 'Medium',
    code: `# Compute GCD
entry:
  t1 = a % b
  if t1 == 0 goto end
  a = b
  b = t1
  goto entry
end:
  result = a`,
  },
  {
    id: 'bubble-sort',
    name: 'Bubble Sort (inner loop)',
    description: '7 variables, nested loop — register pressure benchmark',
    complexity: 'Hard',
    code: `# Bubble Sort inner loop
outer:
  i = 0
inner:
  t1 = i + 1
  t2 = arr + i
  t3 = arr + t1
  a = *t2
  b = *t3
  t4 = a > b
  ifFalse t4 goto no_swap
swap:
  *t2 = b
  *t3 = a
no_swap:
  i = i + 1
  t5 = i < n
  if t5 goto inner
  goto outer`,
  },
  {
    id: 'fibonacci',
    name: 'Fibonacci (iterative)',
    description: '4 variables, loop — iterative Fibonacci',
    complexity: 'Medium',
    code: `# Iterative Fibonacci
start:
  a = 0
  b = 1
  i = 0
loop:
  t1 = i < n
  ifFalse t1 goto done
  temp = a + b
  a = b
  b = temp
  i = i + 1
  goto loop
done:
  result = a`,
  },
  {
    id: 'forced-spill',
    name: 'Forced Spill Example',
    description: '8 simultaneously live variables, k=3 — guarantees spills',
    complexity: 'Extreme',
    code: `# Forced Spill: 8 simultaneous variables with k=3
start:
  a = 1
  b = 2
  c = 3
  d = 4
  e = 5
  f = 6
  g = 7
  h = 8
  t1 = a + b
  t2 = c + d
  t3 = e + f
  t4 = g + h
  result = t1 + t2
  result = result + t3
  result = result + t4`,
  },
];
