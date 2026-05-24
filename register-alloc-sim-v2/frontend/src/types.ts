// Shared TypeScript interfaces matching the backend Pydantic schemas

export type Language = 'c' | 'cpp';
export type Optimization = 'O0' | 'O1';
export type AllocatorId = 'greedy' | 'fast' | 'basic' | 'custom_gc' | 'custom_ls';

// ── API Request / Response types ──────────────────────────────────────────────

export interface CompileRequest {
  source: string;
  language: Language;
  optimization: Optimization;
}

export interface CompileResponse {
  unoptimizedIR: string;
  optimizedIR: string;
  error?: string;
}

export interface AllocateRequest {
  ir: string;
  allocators: AllocatorId[];
  num_registers: number;
}

export interface AllocatorResult {
  assembly: string;
  registerMap: Record<string, string>;
  spillCount: number;
  spillInstructions: string[];
  registerCount: number;
  instructionCount: number;
  rawStats: string;
}

export interface AllocateResponse {
  results: Record<AllocatorId, AllocatorResult>;
  error?: string;
}

export interface BasicBlock {
  id: string;
  label: string;
  instructions: string[];
  predecessors: string[];
  successors: string[];
  liveIn: string[];
  liveOut: string[];
}

export interface InterferenceGraph {
  nodes: string[];
  edges: [string, string][];
}

export interface LivenessResponse {
  blocks: BasicBlock[];
  livenessMatrix: Record<string, { liveIn: string[]; liveOut: string[] }>;
  interferenceGraph: InterferenceGraph;
  error?: string;
}

export interface PresetProgram {
  id: string;
  name: string;
  description: string;
  source: string;
  language: Language;
}

// ── Live interval (from custom_ls) ────────────────────────────────────────────

export interface LiveInterval {
  variable: string;
  start: number;
  end: number;
  register: string | null;
  spilled: boolean;
}

// ── Pipeline stage IDs ────────────────────────────────────────────────────────

export type PipelineStage =
  | 'input'
  | 'unopt_ir'
  | 'opt_ir'
  | 'liveness'
  | 'interference'
  | 'allocation'
  | 'assembly'
  | 'comparison';

export const STAGE_ORDER: PipelineStage[] = [
  'input',
  'unopt_ir',
  'opt_ir',
  'liveness',
  'interference',
  'allocation',
  'assembly',
  'comparison',
];

export const STAGE_LABELS: Record<PipelineStage, string> = {
  input:        '1 · C Source',
  unopt_ir:     '2 · Unopt IR',
  opt_ir:       '3 · Optimised IR',
  liveness:     '4 · Liveness',
  interference: '5 · Interference',
  allocation:   '6 · Allocation',
  assembly:     '7 · Assembly',
  comparison:   '8 · Comparison',
};
