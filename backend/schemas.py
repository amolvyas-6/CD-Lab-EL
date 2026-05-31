"""Pydantic schemas for request/response validation."""
from pydantic import BaseModel
from typing import Optional, List, Dict, Any


# ── Request models ─────────────────────────────────────────────────────────────

class CompileRequest(BaseModel):
    source: str
    language: str = "c"          # "c" | "cpp"
    optimization: str = "O0"     # "O0" | "O1"


class AllocateRequest(BaseModel):
    ir: str                      # Optimised LLVM IR (.ll text)
    allocators: List[str] = ["greedy", "fast", "custom_gc", "custom_ls"]
    num_registers: int = 6       # k for custom algorithms


class LivenessRequest(BaseModel):
    ir: str


# ── Response models ────────────────────────────────────────────────────────────

class CompileResponse(BaseModel):
    unoptimizedIR: str
    optimizedIR: str
    error: Optional[str] = None


class AllocatorResult(BaseModel):
    assembly: str
    registerMap: Dict[str, str]          # virtual → physical
    spillCount: int
    spillInstructions: List[str]
    registerCount: int
    instructionCount: int
    rawStats: str = ""
    # Detailed algorithm step data (for custom allocators)
    steps: List[Dict[str, Any]] = []
    # Live interval data (for linear scan Gantt chart)
    intervals: List[Dict[str, Any]] = []


class AllocateResponse(BaseModel):
    results: Dict[str, AllocatorResult]
    error: Optional[str] = None


class BasicBlock(BaseModel):
    id: str
    label: str
    instructions: List[str]
    predecessors: List[str]
    successors: List[str]
    liveIn: List[str] = []
    liveOut: List[str] = []


class LivenessResponse(BaseModel):
    blocks: List[BasicBlock]
    livenessMatrix: Dict[str, Dict[str, List[str]]]   # block → {liveIn, liveOut}
    interferenceGraph: Dict[str, Any]                  # {nodes, edges}
    error: Optional[str] = None


class PresetProgram(BaseModel):
    id: str
    name: str
    description: str
    source: str
    language: str = "c"
