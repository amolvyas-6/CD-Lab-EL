// ==========================================
// Liveness Analysis — Backward Data-Flow
// Computes live-in and live-out sets per basic block
// ==========================================

import type { CFG, BasicBlock, SimulationStep } from './types';

export interface LivenessResult {
  steps: SimulationStep[];
  /** Map blockId → final liveIn / liveOut sets (same refs as in CFG blocks) */
  blockLiveness: Map<string, { liveIn: Set<string>; liveOut: Set<string> }>;
  iterationsNeeded: number;
}

// ---- Fixpoint solver ----
// Backward data-flow equations:
//   live_out[B] = ∪ live_in[S]  for all S ∈ successors(B)
//   live_in[B]  = use[B] ∪ (live_out[B] − def[B])
//
export function computeLiveness(cfg: CFG): LivenessResult {
  const steps: SimulationStep[] = [];
  let stepIdx = 0;
  let iteration = 0;
  let changed = true;

  // Initialise all sets to empty
  for (const block of cfg.blocks.values()) {
    block.liveIn = new Set();
    block.liveOut = new Set();
  }

  while (changed) {
    changed = false;
    iteration++;

    // Process blocks in reverse order (backward analysis)
    const reverseOrder = [...cfg.blockOrder].reverse();

    for (const blockId of reverseOrder) {
      const block = cfg.blocks.get(blockId)!;

      // --- Compute new live_out ---
      const newLiveOut = new Set<string>();
      for (const succId of block.successors) {
        const succ = cfg.blocks.get(succId);
        if (succ) {
          for (const v of succ.liveIn) newLiveOut.add(v);
        }
      }

      // --- Compute new live_in ---
      const newLiveIn = new Set<string>(block.use);
      for (const v of newLiveOut) {
        if (!block.def.has(v)) newLiveIn.add(v);
      }

      // --- Detect change ---
      const liveInChanged = !setsEqual(newLiveIn, block.liveIn);
      const liveOutChanged = !setsEqual(newLiveOut, block.liveOut);

      if (liveInChanged || liveOutChanged) {
        changed = true;
        block.liveIn = newLiveIn;
        block.liveOut = newLiveOut;

        steps.push({
          stageId: 'liveness',
          stepIndex: stepIdx++,
          description: `Iteration ${iteration}: Block "${blockId}" updated`,
          detail: `live_out = {${[...newLiveOut].join(', ') || '∅'}} | live_in = {${[...newLiveIn].join(', ') || '∅'}}`,
          highlightedNodes: [blockId],
          assignmentsSoFar: {},
        });
      } else {
        steps.push({
          stageId: 'liveness',
          stepIndex: stepIdx++,
          description: `Iteration ${iteration}: Block "${blockId}" stable (no change)`,
          detail: `live_out = {${[...newLiveOut].join(', ') || '∅'}} | live_in = {${[...newLiveIn].join(', ') || '∅'}}`,
          highlightedNodes: [blockId],
          assignmentsSoFar: {},
        });
      }
    }
  }

  steps.push({
    stageId: 'liveness',
    stepIndex: stepIdx++,
    description: `Fixpoint reached after ${iteration} iteration(s)`,
    detail: 'Live-in and live-out sets are stable. Liveness analysis complete.',
    assignmentsSoFar: {},
  });

  const blockLiveness = new Map<string, { liveIn: Set<string>; liveOut: Set<string> }>();
  for (const [id, block] of cfg.blocks) {
    blockLiveness.set(id, { liveIn: block.liveIn, liveOut: block.liveOut });
  }

  return { steps, blockLiveness, iterationsNeeded: iteration };
}

// ---- Utility: set equality ----
function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const item of a) if (!b.has(item)) return false;
  return true;
}

// ---- Compute per-instruction liveness (for interference graph) ----
// Works backward through each block's instructions.
export interface InstrLiveness {
  instrId: number;
  instrRaw: string;
  liveAfter: Set<string>; // variables live after this instruction
}

export function computeInstructionLiveness(
  block: BasicBlock
): InstrLiveness[] {
  const result: InstrLiveness[] = [];
  let live = new Set<string>(block.liveOut);

  // Walk instructions in reverse
  const instrs = [...block.instructions].reverse();
  for (const instr of instrs) {
    result.unshift({ instrId: instr.id, instrRaw: instr.raw, liveAfter: new Set(live) });

    // Remove defined variable from live set
    if (instr.result && /^[a-zA-Z_]\w*$/.test(instr.result)) {
      live.delete(instr.result);
    }

    // Add used variables to live set
    for (const operand of [instr.arg1, instr.arg2]) {
      if (operand && /^[a-zA-Z_]\w*$/.test(operand)) {
        live.add(operand);
      }
    }
  }

  return result;
}
