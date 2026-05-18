// ==========================================
// Zustand Global Store — Register Allocation Simulator
// ==========================================

import { create } from 'zustand';
import type {
  TACInstruction,
  BasicBlock,
  CFG,
  InterferenceGraph,
  LiveInterval,
  SimulationStep,
  AlgorithmChoice,
  StageId,
  PipelineStage,
  AllocationResult,
} from '../core/types';
import { PIPELINE_STAGES } from '../core/types';

// ---- Store State ----

export interface SimulatorState {
  // Input
  sourceCode: string;
  registerCount: number;
  algorithmChoice: AlgorithmChoice;

  // Theme
  theme: 'dark' | 'light';

  // Pipeline stages
  stages: PipelineStage[];
  currentStage: StageId;

  // Parsed data
  instructions: TACInstruction[];
  basicBlocks: BasicBlock[];
  cfg: CFG | null;

  // Liveness
  livenessComputed: boolean;

  // Interference graph
  interferenceGraph: InterferenceGraph | null;

  // Live intervals (linear scan)
  liveIntervals: LiveInterval[];

  // Algorithm results
  graphColoringResult: AllocationResult | null;
  linearScanResult: AllocationResult | null;

  // Step-through animation
  simulationSteps: SimulationStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  playbackSpeed: number; // ms between steps

  // Actions
  setSourceCode: (code: string) => void;
  setRegisterCount: (k: number) => void;
  setAlgorithmChoice: (choice: AlgorithmChoice) => void;
  toggleTheme: () => void;
  setCurrentStage: (stage: StageId) => void;
  markStageCompleted: (stage: StageId) => void;
  setInstructions: (instr: TACInstruction[]) => void;
  setBasicBlocks: (blocks: BasicBlock[]) => void;
  setCFG: (cfg: CFG) => void;
  setLivenessComputed: (v: boolean) => void;
  setInterferenceGraph: (ig: InterferenceGraph) => void;
  setLiveIntervals: (intervals: LiveInterval[]) => void;
  setGraphColoringResult: (result: AllocationResult) => void;
  setLinearScanResult: (result: AllocationResult) => void;
  setSimulationSteps: (steps: SimulationStep[]) => void;
  setCurrentStepIndex: (index: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  togglePlayback: () => void;
  setPlaybackSpeed: (speed: number) => void;
  resetSimulation: () => void;
}

// ---- Default TAC Program ----

const DEFAULT_CODE = `# Compute GCD
entry:
  t1 = a % b
  if t1 == 0 goto end
  a = b
  b = t1
  goto entry
end:
  result = a`;

// ---- Store Implementation ----

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  // Input
  sourceCode: DEFAULT_CODE,
  registerCount: 4,
  algorithmChoice: 'both',

  // Theme
  theme: 'dark',

  // Pipeline
  stages: PIPELINE_STAGES.map((s) => ({ ...s })),
  currentStage: 'input',

  // Parsed data
  instructions: [],
  basicBlocks: [],
  cfg: null,

  // Liveness
  livenessComputed: false,

  // Interference graph
  interferenceGraph: null,

  // Live intervals
  liveIntervals: [],

  // Algorithm results
  graphColoringResult: null,
  linearScanResult: null,

  // Animation
  simulationSteps: [],
  currentStepIndex: 0,
  isPlaying: false,
  playbackSpeed: 800,

  // ---- Actions ----

  setSourceCode: (code) => set({ sourceCode: code }),

  setRegisterCount: (k) => set({ registerCount: k }),

  setAlgorithmChoice: (choice) => set({ algorithmChoice: choice }),

  toggleTheme: () =>
    set((state) => ({ theme: state.theme === 'dark' ? 'light' : 'dark' })),

  setCurrentStage: (stage) =>
    set((state) => ({
      currentStage: stage,
      stages: state.stages.map((s) => ({
        ...s,
        active: s.id === stage,
      })),
    })),

  markStageCompleted: (stage) =>
    set((state) => ({
      stages: state.stages.map((s) =>
        s.id === stage ? { ...s, completed: true } : s
      ),
    })),

  setInstructions: (instr) => set({ instructions: instr }),
  setBasicBlocks: (blocks) => set({ basicBlocks: blocks }),
  setCFG: (cfg) => set({ cfg }),
  setLivenessComputed: (v) => set({ livenessComputed: v }),
  setInterferenceGraph: (ig) => set({ interferenceGraph: ig }),
  setLiveIntervals: (intervals) => set({ liveIntervals: intervals }),
  setGraphColoringResult: (result) => set({ graphColoringResult: result }),
  setLinearScanResult: (result) => set({ linearScanResult: result }),
  setSimulationSteps: (steps) => set({ simulationSteps: steps }),
  setCurrentStepIndex: (index) => set({ currentStepIndex: index }),

  nextStep: () =>
    set((state) => ({
      currentStepIndex: Math.min(
        state.currentStepIndex + 1,
        state.simulationSteps.length - 1
      ),
    })),

  prevStep: () =>
    set((state) => ({
      currentStepIndex: Math.max(state.currentStepIndex - 1, 0),
    })),

  togglePlayback: () => set((state) => ({ isPlaying: !state.isPlaying })),

  setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),

  resetSimulation: () =>
    set({
      stages: PIPELINE_STAGES.map((s) => ({ ...s })),
      currentStage: 'input',
      instructions: [],
      basicBlocks: [],
      cfg: null,
      livenessComputed: false,
      interferenceGraph: null,
      liveIntervals: [],
      graphColoringResult: null,
      linearScanResult: null,
      simulationSteps: [],
      currentStepIndex: 0,
      isPlaying: false,
    }),
}));
