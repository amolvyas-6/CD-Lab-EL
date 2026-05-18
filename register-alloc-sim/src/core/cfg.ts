// ==========================================
// CFG Builder — Basic Block Partitioning + Control Flow Graph
// ==========================================

import type { TACInstruction, BasicBlock, CFG } from './types';

// ---- Helper: Is instruction a branch/jump? ----
export function isBranch(instr: TACInstruction): boolean {
  return instr.op === 'goto' || instr.op === 'if_goto' || instr.op === 'iffalse_goto';
}

export function isLabel(instr: TACInstruction): boolean {
  return instr.op === 'label';
}

export function isReturn(instr: TACInstruction): boolean {
  return instr.op === 'return';
}

// ---- Step 1: Find all leader instruction indices ----
//
// Leaders are:
//   1. The first instruction
//   2. Target of any branch (label instruction)
//   3. Instruction immediately following a branch or return
//
function findLeaders(instructions: TACInstruction[]): Set<number> {
  const leaders = new Set<number>();

  if (instructions.length === 0) return leaders;

  // Leader 1: first instruction
  leaders.add(0);

  for (let i = 0; i < instructions.length; i++) {
    const instr = instructions[i];

    if (isBranch(instr) || isReturn(instr)) {
      // Instruction after branch is a leader
      if (i + 1 < instructions.length) {
        leaders.add(i + 1);
      }
    }

    if (isLabel(instr)) {
      // Label itself is a leader
      leaders.add(i);
    }
  }

  return leaders;
}

// ---- Step 2: Partition instructions into BasicBlocks ----
function partitionBlocks(instructions: TACInstruction[]): BasicBlock[] {
  if (instructions.length === 0) return [];

  const leaders = findLeaders(instructions);
  const sortedLeaders = Array.from(leaders).sort((a, b) => a - b);

  const blocks: BasicBlock[] = [];

  for (let li = 0; li < sortedLeaders.length; li++) {
    const start = sortedLeaders[li];
    const end = li + 1 < sortedLeaders.length ? sortedLeaders[li + 1] : instructions.length;

    const blockInstrs = instructions.slice(start, end);

    // Block ID: use label name if first instruction is a label, else B0, B1, ...
    let blockId: string;
    if (blockInstrs.length > 0 && isLabel(blockInstrs[0])) {
      blockId = blockInstrs[0].target ?? `B${li}`;
    } else if (li === 0) {
      blockId = 'entry';
    } else {
      blockId = `B${li}`;
    }

    blocks.push({
      id: blockId,
      instructions: blockInstrs,
      predecessors: [],
      successors: [],
      use: new Set(),
      def: new Set(),
      liveIn: new Set(),
      liveOut: new Set(),
    });
  }

  return blocks;
}

// ---- Step 3: Wire edges between blocks (CFG) ----
function buildEdges(blocks: BasicBlock[]): void {
  if (blocks.length === 0) return;

  // Build label → block ID map
  const labelToBlockId = new Map<string, string>();
  for (const block of blocks) {
    if (block.instructions.length > 0 && isLabel(block.instructions[0])) {
      const labelName = block.instructions[0].target!;
      labelToBlockId.set(labelName, block.id);
    }
    // Also map block ID itself (for blocks that start with their own label)
    labelToBlockId.set(block.id, block.id);
  }

  // Helper to add an edge
  const addEdge = (from: BasicBlock, toId: string) => {
    const resolvedId = labelToBlockId.get(toId) ?? toId;
    if (!from.successors.includes(resolvedId)) {
      from.successors.push(resolvedId);
    }
    const toBlock = blocks.find((b) => b.id === resolvedId);
    if (toBlock && !toBlock.predecessors.includes(from.id)) {
      toBlock.predecessors.push(from.id);
    }
  };

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    if (block.instructions.length === 0) continue;

    const lastInstr = block.instructions[block.instructions.length - 1];

    if (lastInstr.op === 'goto') {
      // Unconditional jump: only successor is the target
      addEdge(block, lastInstr.target!);
    } else if (lastInstr.op === 'if_goto' || lastInstr.op === 'iffalse_goto') {
      // Conditional jump: two successors — branch target + fall-through
      addEdge(block, lastInstr.target!);
      if (i + 1 < blocks.length) {
        addEdge(block, blocks[i + 1].id);
      }
    } else if (lastInstr.op === 'return') {
      // Return: no successors (exit node)
    } else {
      // Fall-through to next block
      if (i + 1 < blocks.length) {
        addEdge(block, blocks[i + 1].id);
      }
    }
  }
}

// ---- Step 4: Compute use/def sets for each block ----
//
// use[B] = variables used before being defined in B
// def[B] = variables defined before being used in B
//
function isVariable(s: string): boolean {
  // Variables: identifiers not starting with *
  return /^[a-zA-Z_][\w]*$/.test(s);
}

function computeUseDef(block: BasicBlock): void {
  const defined = new Set<string>();

  for (const instr of block.instructions) {
    if (isLabel(instr)) continue;

    // Operands: arg1, arg2 — if they are variables and not yet defined → use
    const operands: (string | undefined)[] = [instr.arg1, instr.arg2];
    for (const op of operands) {
      if (op && isVariable(op) && !defined.has(op)) {
        block.use.add(op);
      }
    }

    // Result: if it is a variable → def
    if (instr.result && isVariable(instr.result)) {
      if (!block.use.has(instr.result)) {
        block.def.add(instr.result);
      }
      defined.add(instr.result);
    }
  }
}

// ---- Main: Build CFG ----
export function buildCFG(instructions: TACInstruction[]): CFG {
  const blocks = partitionBlocks(instructions);
  buildEdges(blocks);

  for (const block of blocks) {
    computeUseDef(block);
  }

  const blockMap = new Map<string, BasicBlock>();
  const blockOrder: string[] = [];

  for (const block of blocks) {
    blockMap.set(block.id, block);
    blockOrder.push(block.id);
  }

  const entry = blocks.length > 0 ? blocks[0].id : 'entry';
  const exit = blocks.length > 0 ? blocks[blocks.length - 1].id : 'exit';

  return {
    blocks: blockMap,
    entry,
    exit,
    blockOrder,
  };
}

// ---- Utility: Get all variables in the CFG ----
export function getAllVariables(cfg: CFG): string[] {
  const vars = new Set<string>();
  for (const block of cfg.blocks.values()) {
    for (const instr of block.instructions) {
      if (instr.result && isVariable(instr.result)) vars.add(instr.result);
      if (instr.arg1 && isVariable(instr.arg1)) vars.add(instr.arg1);
      if (instr.arg2 && isVariable(instr.arg2)) vars.add(instr.arg2);
    }
  }
  return Array.from(vars).sort();
}
