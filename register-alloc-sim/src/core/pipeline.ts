// ==========================================
// Pipeline Runner — Full Compilation Pipeline
// ==========================================

import { tokenize } from './lexer';
import { parse } from './parser';
import { buildCFG } from './cfg';
import { computeLiveness } from './liveness';
import { buildInterferenceGraph } from './interference';
import { graphColoringAllocation } from './graphColoring';
import { linearScanAllocation } from './linearScan';
import type { SimulationStep, TACInstruction, CFG, InterferenceGraph, AllocationResult } from './types';

export interface PipelineResult {
  instructions: TACInstruction[];
  cfg: CFG;
  interferenceGraph: InterferenceGraph;
  graphColoringResult: AllocationResult;
  linearScanResult: AllocationResult;
  steps: SimulationStep[];
  errors: string[];
}

export function runPipeline(source: string, k: number = 4): PipelineResult {
  const allSteps: SimulationStep[] = [];
  const errors: string[] = [];

  // ---- Stage 1: Lexing ----
  const { tokens, errors: lexErrors } = tokenize(source);
  for (const e of lexErrors) errors.push(e.message);

  // ---- Stage 2: Parsing ----
  const { instructions, errors: parseErrors } = parse(tokens);
  for (const e of parseErrors) errors.push(e.message);

  // Parsing steps
  for (let i = 0; i < instructions.length; i++) {
    const instr = instructions[i];
    allSteps.push({
      stageId: 'parsing',
      stepIndex: i,
      description: `Parsed [${i + 1}/${instructions.length}]: ${instr.raw}`,
      detail: `op=${instr.op}${instr.result ? ` | result=${instr.result}` : ''}${instr.arg1 ? ` | arg1=${instr.arg1}` : ''}${instr.arg2 ? ` | arg2=${instr.arg2}` : ''}${instr.target ? ` | target=${instr.target}` : ''}`,
      highlightedNodes: [],
      assignmentsSoFar: {},
    });
  }

  // ---- Stage 3 & 4: Basic Blocks + CFG ----
  const cfg = buildCFG(instructions);

  let blockIdx = 0;
  for (const [blockId, block] of cfg.blocks) {
    allSteps.push({
      stageId: 'basicBlocks',
      stepIndex: blockIdx,
      description: `Block "${blockId}" (${block.instructions.length} instructions)`,
      detail: `predecessors: [${block.predecessors.join(', ') || 'none'}] | successors: [${block.successors.join(', ') || 'none'}] | use: {${[...block.use].join(', ') || '∅'}} | def: {${[...block.def].join(', ') || '∅'}}`,
      highlightedNodes: [blockId],
      assignmentsSoFar: {},
    });

    allSteps.push({
      stageId: 'cfg',
      stepIndex: blockIdx,
      description: `CFG: "${blockId}" → [${block.successors.join(', ') || 'none'}]`,
      detail: `Control flow edge added. Block "${blockId}" falls through or jumps to successors.`,
      highlightedNodes: [blockId],
      highlightedEdges: block.successors.map((s) => `${blockId}-->${s}`),
      assignmentsSoFar: {},
    });
    blockIdx++;
  }

  // ---- Stage 5: Liveness Analysis ----
  const { steps: livenessSteps } = computeLiveness(cfg);
  allSteps.push(...livenessSteps);

  // ---- Stage 6: Interference Graph ----
  const { graph: ig, steps: igSteps } = buildInterferenceGraph(cfg);
  allSteps.push(...igSteps);

  // ---- Stage 7A: Graph Coloring ----
  const graphColoringResult = graphColoringAllocation(ig, k);
  allSteps.push(...graphColoringResult.steps);

  // ---- Stage 7B: Linear Scan ----
  const linearScanResult = linearScanAllocation(instructions, k);
  allSteps.push(...linearScanResult.steps);

  return {
    instructions,
    cfg,
    interferenceGraph: ig,
    graphColoringResult,
    linearScanResult,
    steps: allSteps,
    errors,
  };
}
