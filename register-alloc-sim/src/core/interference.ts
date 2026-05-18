// ==========================================
// Interference Graph Builder
// Two variables interfere if simultaneously live at any point
// ==========================================

import type { CFG, InterferenceGraph, SimulationStep } from './types';
import { computeInstructionLiveness } from './liveness';

export interface InterferenceResult {
  graph: InterferenceGraph;
  steps: SimulationStep[];
}

function edgeKey(u: string, v: string): string {
  return u < v ? `${u}--${v}` : `${v}--${u}`;
}

function isVariable(s: string): boolean {
  return /^[a-zA-Z_]\w*$/.test(s);
}

export function buildInterferenceGraph(cfg: CFG): InterferenceResult {
  const graph: InterferenceGraph = {
    nodes: new Map(),
    edges: new Set(),
    adjList: new Map(),
  };

  const steps: SimulationStep[] = [];
  let stepIdx = 0;

  // Collect all variables across the CFG
  const allVars = new Set<string>();
  for (const block of cfg.blocks.values()) {
    for (const instr of block.instructions) {
      if (instr.result && isVariable(instr.result)) allVars.add(instr.result);
      if (instr.arg1 && isVariable(instr.arg1)) allVars.add(instr.arg1);
      if (instr.arg2 && isVariable(instr.arg2)) allVars.add(instr.arg2);
    }
  }

  // Initialize graph nodes
  for (const v of allVars) {
    graph.nodes.set(v, { spillCost: 1, degree: 0, removed: false });
    graph.adjList.set(v, new Set());
  }

  // ---- Build edges from per-instruction liveness ----
  for (const [blockId, block] of cfg.blocks) {
    const instrLiveness = computeInstructionLiveness(block);

    for (const { instrId, instrRaw, liveAfter } of instrLiveness) {
      // Find the instruction
      const instr = block.instructions.find((i) => i.id === instrId);
      if (!instr || !instr.result || !isVariable(instr.result)) continue;

      const defined = instr.result;
      const liveVars = [...liveAfter].filter(isVariable);

      // Add edge: defined variable interferes with all live variables at this point
      for (const v of liveVars) {
        if (v === defined) continue;

        const key = edgeKey(defined, v);
        if (!graph.edges.has(key)) {
          graph.edges.add(key);

          // Update adjacency list
          graph.adjList.get(defined)!.add(v);
          graph.adjList.get(v)?.add(defined);

          // Update degree
          const dNode = graph.nodes.get(defined)!;
          const vNode = graph.nodes.get(v)!;
          dNode.degree++;
          vNode.degree++;

          steps.push({
            stageId: 'interferenceGraph',
            stepIndex: stepIdx++,
            description: `Interference: ${defined} ↔ ${v}`,
            detail: `Block "${blockId}", instr: "${instrRaw}" | ${defined} is defined while ${v} is live`,
            highlightedNodes: [defined, v],
            highlightedEdges: [key],
            assignmentsSoFar: {},
          });
        }
      }
    }
  }

  // Final summary step
  steps.push({
    stageId: 'interferenceGraph',
    stepIndex: stepIdx++,
    description: `Interference graph complete`,
    detail: `${graph.nodes.size} variables, ${graph.edges.size} interference edges`,
    assignmentsSoFar: {},
  });

  return { graph, steps };
}
