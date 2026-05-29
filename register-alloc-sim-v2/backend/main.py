"""
Register Allocation Simulator — FastAPI Backend
================================================
Endpoints:
  POST /api/compile   — C/C++ source → unoptimised IR + optimised IR
  POST /api/allocate  — optimised IR → LLVM greedy/fast + custom allocations
  POST /api/liveness  — optimised IR → basic blocks, liveness, interference graph
  GET  /api/presets   — list of built-in C example programs
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from schemas import (
    CompileRequest, CompileResponse,
    AllocateRequest, AllocateResponse, AllocatorResult,
    LivenessRequest, LivenessResponse, BasicBlock,
    PresetProgram,
)
from llvm_pipeline import compile_to_ir, optimise_ir, run_llc
from asm_parser import (
    extract_spill_instructions, count_instructions,
    count_physical_registers, parse_stats_spill_count, parse_register_map,
)
from ir_parser import parse_ir
from liveness import compute_liveness, build_liveness_matrix
from interference import build_interference_graph
from graph_coloring import chaitin_briggs
from linear_scan import compute_live_intervals, linear_scan
from presets import PRESETS

app = FastAPI(
    title="Register Allocation Simulator API",
    version="2.0.0",
    description="LLVM-backed register allocation simulator with custom algorithms",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── /api/compile ───────────────────────────────────────────────────────────────

@app.post("/api/compile", response_model=CompileResponse)
async def compile_source(req: CompileRequest):
    """Compile C/C++ source to LLVM IR (unoptimised + mem2reg-optimised)."""
    unopt_ir, stderr, rc = compile_to_ir(req.source, req.language, req.optimization)
    if rc != 0:
        return CompileResponse(unoptimizedIR="", optimizedIR="", error=stderr)

    opt_ir, opt_stderr, opt_rc = optimise_ir(unopt_ir)
    if opt_rc != 0:
        # Return unoptimised as fallback
        return CompileResponse(unoptimizedIR=unopt_ir, optimizedIR=unopt_ir,
                               error=f"opt failed: {opt_stderr}")

    return CompileResponse(unoptimizedIR=unopt_ir, optimizedIR=opt_ir)


# ── /api/allocate ──────────────────────────────────────────────────────────────

@app.post("/api/allocate", response_model=AllocateResponse)
async def allocate(req: AllocateRequest):
    """Run register allocators on optimised LLVM IR."""
    results: dict = {}

    # LLVM allocators
    llvm_allocators = [a for a in req.allocators if a in ("greedy", "fast", "basic")]
    for alloc_name in llvm_allocators:
        asm, stats_text, rc = run_llc(req.ir, regalloc=alloc_name)
        if rc != 0:
            # Still include partial result
            results[alloc_name] = AllocatorResult(
                assembly=asm or f"llc failed (rc={rc}): {stats_text[:200]}",
                registerMap={},
                spillCount=-1,
                spillInstructions=[],
                registerCount=0,
                instructionCount=0,
                rawStats=stats_text[:500],
            )
            continue

        spill_instrs = extract_spill_instructions(asm)
        spill_count = parse_stats_spill_count(stats_text)
        if spill_count < 0:
            spill_count = len(spill_instrs)
        reg_count = count_physical_registers(asm)
        instr_count = count_instructions(asm)
        reg_map = parse_register_map(asm)

        results[alloc_name] = AllocatorResult(
            assembly=asm,
            registerMap=reg_map,
            spillCount=spill_count,
            spillInstructions=spill_instrs,
            registerCount=reg_count,
            instructionCount=instr_count,
            rawStats=stats_text[:1000],
        )

    # Custom allocators — need liveness/interference first
    custom_requested = [a for a in req.allocators if a in ("custom_gc", "custom_ls")]
    if custom_requested:
        blocks = parse_ir(req.ir)
        compute_liveness(blocks)
        ig = build_interference_graph(blocks)
        nodes = ig["nodes"]
        edges = ig["edges"]

        if "custom_gc" in req.allocators:
            gc_result = chaitin_briggs(nodes, edges, k=req.num_registers)
            # Build a pseudo-assembly string for display
            asm_lines = [f"# Chaitin-Briggs Graph Coloring (k={req.num_registers})"]
            asm_lines.append(f"# {len(nodes)} variables, {len(edges)} interference edges")
            asm_lines.append("")
            asm_lines.append("# Register assignments:")
            for var, reg in gc_result["registerMap"].items():
                if reg != "spilled":
                    asm_lines.append(f"  {var:20s}  →  {reg}")
            if gc_result["spills"]:
                asm_lines.append("")
                asm_lines.append("# Spilled variables:")
                for s in gc_result["spills"]:
                    asm_lines.append(f"  {s}  (spilled to memory)")
            results["custom_gc"] = AllocatorResult(
                assembly="\n".join(asm_lines),
                registerMap=gc_result["registerMap"],
                spillCount=gc_result["spillCount"],
                spillInstructions=gc_result["spills"],
                registerCount=gc_result["registerCount"],
                instructionCount=0,
                rawStats=f"{len(gc_result['steps'])} algorithm steps recorded",
                steps=gc_result["steps"],
            )

        if "custom_ls" in req.allocators:
            intervals = compute_live_intervals(blocks)
            ls_result = linear_scan(intervals, k=req.num_registers)
            asm_lines = [f"# Linear Scan — Poletto-Sarkar (k={req.num_registers})"]
            asm_lines.append(f"# {len(intervals)} live intervals")
            asm_lines.append("")
            asm_lines.append("# Register assignments:")
            for var, reg in ls_result["registerMap"].items():
                if reg != "spilled":
                    asm_lines.append(f"  {var:20s}  →  {reg}")
            if ls_result["spills"]:
                asm_lines.append("")
                asm_lines.append("# Spilled variables:")
                for s in ls_result["spills"]:
                    asm_lines.append(f"  {s}  (spilled to memory)")
            results["custom_ls"] = AllocatorResult(
                assembly="\n".join(asm_lines),
                registerMap=ls_result["registerMap"],
                spillCount=ls_result["spillCount"],
                spillInstructions=ls_result["spills"],
                registerCount=ls_result["registerCount"],
                instructionCount=0,
                rawStats=f"{len(ls_result['steps'])} algorithm steps recorded",
                steps=ls_result["steps"],
                intervals=ls_result["intervals"],
            )

    return AllocateResponse(results=results)


# ── /api/liveness ──────────────────────────────────────────────────────────────

@app.post("/api/liveness", response_model=LivenessResponse)
async def liveness(req: LivenessRequest):
    """Parse LLVM IR, compute liveness, build interference graph."""
    try:
        blocks = parse_ir(req.ir)
        compute_liveness(blocks)
        matrix = build_liveness_matrix(blocks)
        ig = build_interference_graph(blocks)

        api_blocks = [
            BasicBlock(
                id=b.id,
                label=b.label,
                instructions=b.instructions,
                predecessors=b.predecessors,
                successors=b.successors,
                liveIn=sorted(b.live_in),
                liveOut=sorted(b.live_out),
            )
            for b in blocks
        ]

        return LivenessResponse(
            blocks=api_blocks,
            livenessMatrix=matrix,
            interferenceGraph=ig,
        )
    except Exception as exc:
        return LivenessResponse(
            blocks=[],
            livenessMatrix={},
            interferenceGraph={"nodes": [], "edges": []},
            error=str(exc),
        )


# ── /api/presets ───────────────────────────────────────────────────────────────

@app.get("/api/presets", response_model=list[PresetProgram])
async def get_presets():
    """Return the six built-in C example programs."""
    return [PresetProgram(**p) for p in PRESETS]


# ── health check ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "version": "2.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)