"""
LLVM IR parser using llvmlite.

Parses a .ll file into Python BasicBlock objects, extracts the CFG,
and computes use/def sets for each block.
"""
import re
from typing import List, Dict, Set, Tuple, Optional
from dataclasses import dataclass, field


@dataclass
class IRBasicBlock:
    """A basic block extracted from LLVM IR."""
    id: str
    label: str
    instructions: List[str]
    predecessors: List[str] = field(default_factory=list)
    successors: List[str] = field(default_factory=list)
    use: Set[str] = field(default_factory=set)     # SSA values used before def
    defn: Set[str] = field(default_factory=set)    # SSA values defined here
    live_in: Set[str] = field(default_factory=set)
    live_out: Set[str] = field(default_factory=set)


# ── Regex patterns for LLVM IR ─────────────────────────────────────────────────

_LABEL_RE = re.compile(r"^(\w[\w.]*):$")
_RESULT_RE = re.compile(r"^\s+(%[\w.]+)\s*=")           # instructions that define a value
_USE_RE = re.compile(r"%[\w.]+")                         # any SSA value reference
_BR_UNCOND = re.compile(r"^\s+br\s+label\s+%(\w[\w.]*)")
_BR_COND = re.compile(r"^\s+br\s+i1\s+%[\w.]+,\s*label\s+%(\w[\w.]*),\s*label\s+%(\w[\w.]*)")
_RET_RE = re.compile(r"^\s+ret\b")
_PHI_RE = re.compile(r"^\s+(%[\w.]+)\s*=\s*phi\b")
_PHI_FROM_RE = re.compile(r"\[\s*(%[\w.]+)\s*,\s*%(\w[\w.]*)\s*\]")


def parse_ir(ir_text: str) -> List[IRBasicBlock]:
    """
    Parse LLVM IR text into a list of IRBasicBlock objects.
    Builds the CFG (predecessor/successor links) and use/def sets.
    """
    blocks: List[IRBasicBlock] = []
    block_map: Dict[str, IRBasicBlock] = {}

    # Split the IR into function bodies (skip module-level metadata)
    lines = ir_text.splitlines()
    current_block: Optional[IRBasicBlock] = None
    in_function = False
    block_index = 0

    def _finish_block():
        nonlocal current_block
        if current_block is not None:
            _compute_use_def(current_block)
            blocks.append(current_block)
            block_map[current_block.label] = current_block

    for raw_line in lines:
        line = raw_line.rstrip()

        # Detect function entry
        if re.match(r"^define\b", line):
            in_function = True
            current_block = None
            continue

        if not in_function:
            continue

        # End of function body
        if line.strip() == "}":
            _finish_block()
            in_function = False
            current_block = None
            continue

        # Named label → start new block
        m = _LABEL_RE.match(line.strip())
        if m:
            _finish_block()
            label = m.group(1)
            current_block = IRBasicBlock(
                id=f"BB{block_index}",
                label=label,
                instructions=[],
            )
            block_index += 1
            continue

        # First instruction inside a function (implicit "entry" block, no label)
        if in_function and current_block is None and line.strip():
            current_block = IRBasicBlock(
                id=f"BB{block_index}",
                label="entry",
                instructions=[],
            )
            block_index += 1

        if current_block is not None and line.strip():
            current_block.instructions.append(line.strip())

    # Wire up CFG edges
    _build_cfg_edges(blocks, block_map)
    return blocks


def _compute_use_def(block: IRBasicBlock):
    """
    Compute use and def sets for a basic block.
    For phi nodes, the uses come from predecessor blocks (handled separately).
    """
    defined: Set[str] = set()
    used: Set[str] = set()

    for instr in block.instructions:
        # Find all SSA value references in this instruction
        all_refs = set(_USE_RE.findall(instr))

        # Find what this instruction defines
        def_match = _RESULT_RE.match(instr)
        defined_here = def_match.group(1) if def_match else None

        # Uses = refs that are not yet defined in this block
        for ref in all_refs:
            if ref not in defined:
                used.add(ref)

        if defined_here:
            defined.add(defined_here)

    block.use = used
    block.defn = defined


def _build_cfg_edges(blocks: List[IRBasicBlock], block_map: Dict[str, IRBasicBlock]):
    """Add predecessor/successor links between blocks."""
    for block in blocks:
        if not block.instructions:
            continue
        last = block.instructions[-1]

        # Unconditional branch
        m = _BR_UNCOND.match(last)
        if m:
            tgt = m.group(1)
            block.successors.append(tgt)
            if tgt in block_map:
                block_map[tgt].predecessors.append(block.label)
            continue

        # Conditional branch
        m = _BR_COND.match(last)
        if m:
            for tgt in (m.group(1), m.group(2)):
                block.successors.append(tgt)
                if tgt in block_map:
                    block_map[tgt].predecessors.append(block.label)
            continue

        # ret — no successors
