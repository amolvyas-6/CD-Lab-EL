// ==========================================
// Poletto-Sarkar Linear Scan Register Allocation
// ==========================================

import type { TACInstruction, LiveInterval, AllocationResult, SimulationStep } from './types';

// ---- Step 1: Compute live intervals ----
// interval[v] = [first definition index, last use index]
export function computeLiveIntervals(instructions: TACInstruction[]): LiveInterval[] {
  const intervalMap = new Map<string, { start: number; end: number }>();

  function isVar(s: string): boolean {
    return /^[a-zA-Z_]\w*$/.test(s);
  }

  function touch(v: string, idx: number): void {
    if (!isVar(v)) return;
    const existing = intervalMap.get(v);
    if (!existing) {
      intervalMap.set(v, { start: idx, end: idx });
    } else {
      existing.start = Math.min(existing.start, idx);
      existing.end = Math.max(existing.end, idx);
    }
  }

  for (let i = 0; i < instructions.length; i++) {
    const instr = instructions[i];
    if (instr.result) touch(instr.result, i);
    if (instr.arg1) touch(instr.arg1, i);
    if (instr.arg2) touch(instr.arg2, i);
  }

  // Convert to LiveInterval array
  const intervals: LiveInterval[] = [];
  for (const [variable, { start, end }] of intervalMap) {
    intervals.push({ variable, start, end, spilled: false });
  }

  return intervals;
}

// ---- Step 2: Linear Scan ----
export function linearScanAllocation(
  instructions: TACInstruction[],
  k: number
): AllocationResult {
  const steps: SimulationStep[] = [];
  let stepIdx = 0;

  const intervals = computeLiveIntervals(instructions);

  if (intervals.length === 0) {
    return { assignments: {}, spills: [], spillCode: [], steps, registersUsed: 0, totalSpills: 0 };
  }

  // Sort by start point
  intervals.sort((a, b) => a.start - b.start);

  steps.push({
    stageId: 'linearScan',
    stepIndex: stepIdx++,
    description: `Computed ${intervals.length} live intervals, k=${k} registers`,
    detail: 'Sorted intervals by start point. Beginning linear scan.',
    activeIntervals: [],
    assignmentsSoFar: {},
  });

  // Active list: intervals currently holding a register (sorted by end point)
  let active: LiveInterval[] = [];
  const freeRegisters: Set<number> = new Set(Array.from({ length: k }, (_, i) => i));
  const assignments: Record<string, number> = {};
  const spills: string[] = [];

  const getActiveNames = () => active.map((a) => a.variable);

  for (const interval of intervals) {
    // --- Expire old intervals ---
    const expired: LiveInterval[] = [];
    const stillActive: LiveInterval[] = [];
    for (const a of active) {
      if (a.end < interval.start) {
        expired.push(a);
      } else {
        stillActive.push(a);
      }
    }

    for (const exp of expired) {
      freeRegisters.add(exp.register!);
    }
    active = stillActive;

    if (expired.length > 0) {
      steps.push({
        stageId: 'linearScan',
        stepIndex: stepIdx++,
        description: `Expired: [${expired.map((e) => e.variable).join(', ')}] — registers freed`,
        detail: `Intervals ending before position ${interval.start} are freed. Free registers: {${[...freeRegisters].map((r) => `R${r}`).join(', ')}}`,
        activeIntervals: getActiveNames(),
        assignmentsSoFar: { ...assignments },
      });
    }

    // --- Allocate or spill ---
    if (freeRegisters.size === 0) {
      // Spill: choose the interval with the farthest end point
      active.sort((a, b) => b.end - a.end);
      const spillCandidate = active[0];

      if (spillCandidate && spillCandidate.end > interval.end) {
        // Spill the farthest-ending interval, give its register to current
        const reg = spillCandidate.register!;
        spillCandidate.spilled = true;
        delete assignments[spillCandidate.variable];
        spills.push(spillCandidate.variable);
        active.splice(0, 1); // remove it

        interval.register = reg;
        interval.spilled = false;
        assignments[interval.variable] = reg;
        active.push(interval);
        active.sort((a, b) => a.end - b.end);

        steps.push({
          stageId: 'linearScan',
          stepIndex: stepIdx++,
          description: `Spill: "${spillCandidate.variable}" (ends at ${spillCandidate.end}) — give R${reg} to "${interval.variable}"`,
          detail: `"${spillCandidate.variable}" has a farther endpoint, so it's spilled to memory.`,
          activeIntervals: getActiveNames(),
          spilledVariables: [...spills],
          assignmentsSoFar: { ...assignments },
        });
      } else {
        // Spill current interval
        interval.spilled = true;
        spills.push(interval.variable);

        steps.push({
          stageId: 'linearScan',
          stepIndex: stepIdx++,
          description: `Spill: "${interval.variable}" — no free registers and all active end later`,
          detail: `"${interval.variable}" is spilled to memory.`,
          activeIntervals: getActiveNames(),
          spilledVariables: [...spills],
          assignmentsSoFar: { ...assignments },
        });
      }
    } else {
      // Assign the lowest-numbered free register
      const reg = Math.min(...freeRegisters);
      freeRegisters.delete(reg);
      interval.register = reg;
      interval.spilled = false;
      assignments[interval.variable] = reg;
      active.push(interval);
      active.sort((a, b) => a.end - b.end);

      steps.push({
        stageId: 'linearScan',
        stepIndex: stepIdx++,
        description: `Assigned R${reg} to "${interval.variable}" [${interval.start}–${interval.end}]`,
        detail: `Active set: [${getActiveNames().join(', ')}]. Free registers after: {${[...freeRegisters].map((r) => `R${r}`).join(', ')}}`,
        activeIntervals: getActiveNames(),
        assignmentsSoFar: { ...assignments },
      });
    }
  }

  const registersUsed = new Set(Object.values(assignments)).size;

  steps.push({
    stageId: 'linearScan',
    stepIndex: stepIdx++,
    description: `Linear scan complete! ${registersUsed} registers used, ${spills.length} spills`,
    detail: spills.length === 0
      ? 'All variables successfully allocated.'
      : `Spilled: ${spills.join(', ')}`,
    assignmentsSoFar: { ...assignments },
    spilledVariables: [...spills],
  });

  return {
    assignments,
    spills,
    spillCode: [],
    steps,
    registersUsed,
    totalSpills: spills.length,
    // also expose intervals for the Gantt chart
  } as AllocationResult & { intervals: LiveInterval[] };
}

// Re-export for convenience
export { computeLiveIntervals as getLiveIntervals };
