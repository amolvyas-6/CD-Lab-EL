import { create } from 'zustand';
import type {
  PipelineStage, Language, Optimization, AllocatorId,
  CompileResponse, AllocateResponse, LivenessResponse, PresetProgram,
} from '../types';
import { compile, allocate, getLiveness, getPresets } from '../api/client';

interface SimulatorState {
  // Input
  source: string;
  language: Language;
  optimization: Optimization;
  numRegisters: number;
  selectedAllocators: AllocatorId[];

  // Pipeline data
  compileResult: CompileResponse | null;
  allocateResult: AllocateResponse | null;
  livenessResult: LivenessResponse | null;
  presets: PresetProgram[];

  // UI state
  currentStage: PipelineStage;
  isLoading: boolean;
  error: string | null;

  // Actions
  setSource: (s: string) => void;
  setLanguage: (l: Language) => void;
  setOptimization: (o: Optimization) => void;
  setNumRegisters: (k: number) => void;
  toggleAllocator: (id: AllocatorId) => void;
  setStage: (s: PipelineStage) => void;
  loadPresets: () => Promise<void>;
  applyPreset: (p: PresetProgram) => void;
  runPipeline: () => Promise<void>;
  clearError: () => void;
}

const DEFAULT_SOURCE = `// Register Allocation Simulator v2
// Uses real LLVM toolchain (clang + llc)
// Edit or choose a preset below, then click "Run Pipeline"

int gcd(int a, int b) {
    while (b != 0) {
        int t = a % b;
        a = b;
        b = t;
    }
    return a;
}
`;

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  source: DEFAULT_SOURCE,
  language: 'c',
  optimization: 'O0',
  numRegisters: 6,
  selectedAllocators: ['greedy', 'fast', 'custom_gc', 'custom_ls'],

  compileResult: null,
  allocateResult: null,
  livenessResult: null,
  presets: [],

  currentStage: 'input',
  isLoading: false,
  error: null,

  setSource: (s) => set({ source: s }),
  setLanguage: (l) => set({ language: l }),
  setOptimization: (o) => set({ optimization: o }),
  setNumRegisters: (k) => set({ numRegisters: k }),
  setStage: (s) => set({ currentStage: s }),
  clearError: () => set({ error: null }),

  toggleAllocator: (id) => {
    const cur = get().selectedAllocators;
    const next = cur.includes(id) ? cur.filter((a) => a !== id) : [...cur, id];
    set({ selectedAllocators: next });
  },

  loadPresets: async () => {
    try {
      const presets = await getPresets();
      set({ presets });
    } catch {
      // non-fatal
    }
  },

  applyPreset: (p) => {
    set({ source: p.source, language: p.language, currentStage: 'input' });
  },

  runPipeline: async () => {
    const { source, language, optimization, selectedAllocators, numRegisters } = get();
    set({ isLoading: true, error: null });

    try {
      // Stage 2+3: compile
      set({ currentStage: 'unopt_ir' });
      const compileResult = await compile({ source, language, optimization });
      if (compileResult.error && !compileResult.optimizedIR) {
        set({ error: compileResult.error, isLoading: false });
        return;
      }
      set({ compileResult, currentStage: 'opt_ir' });

      const irToUse = compileResult.optimizedIR || compileResult.unoptimizedIR;

      // Stage 4+5: liveness + interference
      set({ currentStage: 'liveness' });
      const livenessResult = await getLiveness(irToUse);
      set({ livenessResult, currentStage: 'interference' });

      // Stage 6+7: allocate
      set({ currentStage: 'allocation' });
      const allocateResult = await allocate({
        ir: irToUse,
        allocators: selectedAllocators,
        num_registers: numRegisters,
      });
      set({ allocateResult, currentStage: 'assembly' });

      // Stage 8: comparison
      set({ currentStage: 'comparison', isLoading: false });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      set({ error: `Pipeline failed: ${msg}`, isLoading: false });
    }
  },
}));
