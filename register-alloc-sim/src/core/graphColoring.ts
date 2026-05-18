// ==========================================
// Chaitin-Briggs Graph Coloring Register Allocation
// 6-Phase: Build → Coalesce → Freeze → Simplify → Spill → Select
// ==========================================

import type { InterferenceGraph, AllocationResult, SimulationStep } from './types';

// Deep-clone the interference graph (we mutate it during simplify)
function cloneGraph(ig: InterferenceGraph): InterferenceGraph {
  const nodes = new Map(
    [...ig.nodes.entries()].map(([k, v]) => [k, { ...v }])
  );
  const adjList = new Map(
    [...ig.adjList.entries()].map(([k, v]) => [k, new Set(v)])
  );
  return {
    nodes,
    edges: new Set(ig.edges),
    adjList,
  };
}

function getDegree(graph: InterferenceGraph, node: string): number {
  const adj = graph.adjList.get(node);
  if (!adj) return 0;
  // Count only non-removed neighbors
  let deg = 0;
  for (const n of adj) {
    const nd = graph.nodes.get(n);
    if (nd && !nd.removed) deg++;
  }
  return deg;
}

export function graphColoringAllocation(
  originalGraph: InterferenceGraph,
  k: number
): AllocationResult {
  const steps: SimulationStep[] = [];
  let stepIdx = 0;
  const assignments: Record<string, number> = {};
  const spills: string[] = [];

  // Work on a copy
  const graph = cloneGraph(originalGraph);
  const allVars = [...graph.nodes.keys()];

  if (allVars.length === 0) {
    return { assignments, spills, spillCode: [], steps, registersUsed: 0, totalSpills: 0 };
  }

  steps.push({
    stageId: 'graphColoring',
    stepIndex: stepIdx++,
    description: `Build phase: ${allVars.length} variables, ${graph.edges.size} interference edges, k=${k} registers`,
    detail: 'Starting Chaitin-Briggs graph coloring. We will simplify the graph by removing low-degree nodes.',
    stackState: [],
    assignmentsSoFar: {},
  });

  // ---- Phase: Simplify + Spill ----
  // Push nodes with degree < k onto the coloring stack
  const colorStack: string[] = [];
  const potentialSpills: string[] = [];
  const remaining = new Set(allVars);

  while (remaining.size > 0) {
    // Find a node with degree < k
    let found = false;
    for (const v of remaining) {
      const deg = getDegree(graph, v);
      if (deg < k) {
        // Push onto stack, mark as removed
        colorStack.push(v);
        remaining.delete(v);
        graph.nodes.get(v)!.removed = true;
        found = true;

        steps.push({
          stageId: 'graphColoring',
          stepIndex: stepIdx++,
          description: `Simplify: pushed "${v}" (degree ${deg} < k=${k})`,
          detail: `Stack: [${[...colorStack].join(', ')}]`,
          stackState: [...colorStack],
          highlightedNodes: [v],
          removedNodes: [...allVars].filter((n) => graph.nodes.get(n)!.removed),
          assignmentsSoFar: { ...assignments },
        });
        break;
      }
    }

    if (!found) {
      // All remaining nodes have degree ≥ k → must select a spill candidate
      // Heuristic: pick node with highest degree (most constrained)
      let spillCandidate = '';
      let maxDeg = -1;
      for (const v of remaining) {
        const deg = getDegree(graph, v);
        if (deg > maxDeg) {
          maxDeg = deg;
          spillCandidate = v;
        }
      }

      if (!spillCandidate) break;

      potentialSpills.push(spillCandidate);
      colorStack.push(spillCandidate);
      remaining.delete(spillCandidate);
      graph.nodes.get(spillCandidate)!.removed = true;

      steps.push({
        stageId: 'graphColoring',
        stepIndex: stepIdx++,
        description: `Potential spill: "${spillCandidate}" (degree ${maxDeg} ≥ k=${k}) — marking as potential spill`,
        detail: `All remaining nodes have degree ≥ k. Must select a spill candidate.`,
        stackState: [...colorStack],
        highlightedNodes: [spillCandidate],
        spilledVariables: [...potentialSpills],
        assignmentsSoFar: { ...assignments },
      });
    }
  }

  // ---- Phase: Select (coloring) ----
  // Pop stack and assign colors greedily
  while (colorStack.length > 0) {
    const v = colorStack.pop()!;
    graph.nodes.get(v)!.removed = false;

    // Find colors used by neighbors
    const usedColors = new Set<number>();
    for (const neighbor of graph.adjList.get(v) ?? []) {
      if (assignments[neighbor] !== undefined) {
        usedColors.add(assignments[neighbor]);
      }
    }

    // Find first available color (0-indexed)
    let color = -1;
    for (let c = 0; c < k; c++) {
      if (!usedColors.has(c)) {
        color = c;
        break;
      }
    }

    if (color === -1) {
      // Actual spill
      spills.push(v);
      steps.push({
        stageId: 'graphColoring',
        stepIndex: stepIdx++,
        description: `Select: "${v}" — SPILLED (all ${k} colors used by neighbors)`,
        detail: `Neighbors' colors: {${[...usedColors].join(', ')}}. No available register.`,
        highlightedNodes: [v],
        stackState: [...colorStack],
        spilledVariables: [...spills],
        assignmentsSoFar: { ...assignments },
      });
    } else {
      assignments[v] = color;
      graph.nodes.get(v)!.color = color;

      steps.push({
        stageId: 'graphColoring',
        stepIndex: stepIdx++,
        description: `Select: assigned R${color} to "${v}"`,
        detail: `Neighbors' colors: {${[...usedColors].join(', ')}}. Register R${color} is free.`,
        highlightedNodes: [v],
        stackState: [...colorStack],
        assignmentsSoFar: { ...assignments },
      });
    }
  }

  const registersUsed = new Set(Object.values(assignments)).size;

  steps.push({
    stageId: 'graphColoring',
    stepIndex: stepIdx++,
    description: `Graph coloring complete! ${registersUsed} registers used, ${spills.length} spills`,
    detail: spills.length === 0
      ? 'All variables successfully allocated to registers.'
      : `Spilled variables: ${spills.join(', ')}`,
    assignmentsSoFar: { ...assignments },
    spilledVariables: [...spills],
  });

  return {
    assignments,
    spills,
    spillCode: [], // Phase 7 fills this in
    steps,
    registersUsed,
    totalSpills: spills.length,
  };
}
