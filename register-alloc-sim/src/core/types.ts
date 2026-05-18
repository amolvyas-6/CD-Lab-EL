// ==========================================
// Core Type Definitions for Register Allocation Simulator
// ==========================================

// ---- TAC (Three-Address Code) ----

export type TACOpType =
  | 'assign'
  | 'add'
  | 'sub'
  | 'mul'
  | 'div'
  | 'mod'
  | 'lt'
  | 'gt'
  | 'eq'
  | 'neq'
  | 'goto'
  | 'if_goto'
  | 'iffalse_goto'
  | 'label'
  | 'param'
  | 'call'
  | 'return';

export interface TACInstruction {
  id: number;
  op: TACOpType;
  result?: string;   // destination variable
  arg1?: string;     // first operand (variable or constant)
  arg2?: string;     // second operand
  target?: string;   // branch target label (for goto/if_goto)
  raw: string;       // original source text
}

// ---- Tokens ----

export type TokenType =
  | 'IDENTIFIER'
  | 'NUMBER'
  | 'OPERATOR'
  | 'ASSIGN'
  | 'COLON'
  | 'COMMA'
  | 'KEYWORD'
  | 'COMPARISON'
  | 'COMMENT'
  | 'NEWLINE'
  | 'EOF';

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}

// ---- Basic Block & CFG ----

export interface BasicBlock {
  id: string;
  instructions: TACInstruction[];
  predecessors: string[];
  successors: string[];
  use: Set<string>;
  def: Set<string>;
  liveIn: Set<string>;
  liveOut: Set<string>;
}

export interface CFG {
  blocks: Map<string, BasicBlock>;
  entry: string;
  exit: string;
  blockOrder: string[];  // topological or linear order
}

// ---- Interference Graph ----

export interface IGNodeData {
  color?: number;
  spillCost: number;
  degree: number;
  removed: boolean;
}

export interface InterferenceGraph {
  nodes: Map<string, IGNodeData>;
  edges: Set<string>;            // "u--v" format (u < v alphabetically)
  adjList: Map<string, Set<string>>;
}

// ---- Linear Scan ----

export interface LiveInterval {
  variable: string;
  start: number;   // instruction index
  end: number;     // instruction index
  register?: number;
  spilled: boolean;
}

// ---- Algorithm Step (for animation) ----

export type StageId =
  | 'input'
  | 'parsing'
  | 'basicBlocks'
  | 'cfg'
  | 'liveness'
  | 'interferenceGraph'
  | 'graphColoring'
  | 'linearScan'
  | 'output';

export interface SimulationStep {
  stageId: StageId;
  stepIndex: number;
  description: string;
  detail?: string;
  highlightedNodes?: string[];
  highlightedEdges?: string[];
  stackState?: string[];         // for graph coloring
  activeIntervals?: string[];    // for linear scan
  removedNodes?: string[];       // for graph coloring simplify
  assignmentsSoFar: Record<string, number>;
  spilledVariables?: string[];
}

// ---- Algorithm Selection ----

export type AlgorithmChoice = 'graphColoring' | 'linearScan' | 'both';

// ---- Preset Example ----

export interface PresetExample {
  id: string;
  name: string;
  description: string;
  complexity: string;
  code: string;
}

// ---- Register Assignment Result ----

export interface AllocationResult {
  assignments: Record<string, number>;   // variable → register number
  spills: string[];                       // spilled variables
  spillCode: TACInstruction[];            // inserted spill/reload instructions
  steps: SimulationStep[];                // step-by-step trace
  registersUsed: number;
  totalSpills: number;
}

// ---- Pipeline State ----

export interface PipelineStage {
  id: StageId;
  name: string;
  description: string;
  completed: boolean;
  active: boolean;
}

export const PIPELINE_STAGES: PipelineStage[] = [
  { id: 'input', name: 'Input', description: 'Enter TAC program', completed: false, active: true },
  { id: 'parsing', name: 'Parsing', description: 'Lexing & parsing TAC', completed: false, active: false },
  { id: 'basicBlocks', name: 'Basic Blocks', description: 'Partitioning into basic blocks', completed: false, active: false },
  { id: 'cfg', name: 'CFG', description: 'Control flow graph construction', completed: false, active: false },
  { id: 'liveness', name: 'Liveness', description: 'Live variable analysis', completed: false, active: false },
  { id: 'interferenceGraph', name: 'Interference Graph', description: 'Building interference graph', completed: false, active: false },
  { id: 'graphColoring', name: 'Graph Coloring', description: 'Chaitin-Briggs register allocation', completed: false, active: false },
  { id: 'linearScan', name: 'Linear Scan', description: 'Poletto-Sarkar register allocation', completed: false, active: false },
  { id: 'output', name: 'Output', description: 'Final register assignment', completed: false, active: false },
];
