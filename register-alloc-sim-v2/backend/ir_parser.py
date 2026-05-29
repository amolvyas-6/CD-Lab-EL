"""
LLVM IR parser.

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

# Labels: match "label:" optionally followed by whitespace and/or a ; comment
# Handles both "entry:" and "while.cond:                    ; preds = ..."
_LABEL_RE    = re.compile(r"^([\w][\w.]*)\s*:\s*(?:;.*)?$")

_RESULT_RE   = re.compile(r"^\s*(%[\w.]+)\s*=")
_USE_RE      = re.compile(r"%[\w.]+")
# Unconditional branch
_BR_UNCOND   = re.compile(r"^\s*br\s+label\s+%([\w.]+)")
# Conditional branch
_BR_COND     = re.compile(r"^\s*br\s+i1\s+%[\w.]+,\s*label\s+%([\w.]+),\s*label\s+%([\w.]+)")
_RET_RE      = re.compile(r"^\s*ret\b")

# Phi node predecessor labels: in  "[ %val, %block ]" or "[ 1, %block ]",
# the SECOND item is ALWAYS a block label — never an SSA value to track.
# Match any pair [ anything, %label ] to extract the label.
_PHI_PRED_RE = re.compile(r"\[\s*[^,\[\]]+,\s*%([\w.]+)\s*\]")

# Branch target labels (for br instructions) — also not SSA values
_BR_LABEL_RE = re.compile(r"\blabel\s+%([\w.]+)")


def parse_ir(ir_text: str) -> List[IRBasicBlock]:
    """
    Parse LLVM IR text into a list of IRBasicBlock objects.
    Builds the CFG (predecessor/successor links) and use/def sets.
    """
    blocks: List[IRBasicBlock] = []
    block_map: Dict[str, IRBasicBlock] = {}

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

        stripped = line.strip()

        # Skip metadata lines (start with !)
        if stripped.startswith("!"):
            continue

        # Named label → start new block
        # Labels have NO leading whitespace in LLVM IR (unlike instructions)
        # Must check the RAW line, not stripped, to avoid matching indented text
        m = _LABEL_RE.match(stripped)
        raw_stripped = line.lstrip()
        if m and not line.startswith(" ") and not line.startswith("\t"):
            _finish_block()
            label = m.group(1)
            current_block = IRBasicBlock(
                id=f"BB{block_index}",
                label=label,
                instructions=[],
            )
            block_index += 1
            continue

        # First instruction inside a function (implicit "entry" block, no explicit label)
        if in_function and current_block is None and stripped:
            current_block = IRBasicBlock(
                id=f"BB{block_index}",
                label="entry",
                instructions=[],
            )
            block_index += 1

        if current_block is not None and stripped:
            # Strip trailing metadata tokens like ", !llvm.loop !6"
            clean = re.sub(r",?\s*![\w.]+ !\d+", "", stripped).strip()
            if clean:
                current_block.instructions.append(clean)

    # Wire up CFG edges
    _build_cfg_edges(blocks, block_map)
    return blocks


def _compute_use_def(block: IRBasicBlock):
    """
    Compute use and def sets for a basic block.

    Rules:
    - Phi node [ %value, %block_label ] → %value is a use, %block_label is NOT
    - Branch `label %target` → %target is NOT an SSA value use
    - Everything else: %xxx references are uses (if not yet defined in this block)
    """
    defined: Set[str] = set()
    used: Set[str] = set()

    for instr in block.instructions:
        # Collect all %xxx references
        all_refs = set(_USE_RE.findall(instr))

        # Remove phi predecessor labels — they are block names, not SSA values
        phi_preds = {f"%{lb}" for lb in _PHI_PRED_RE.findall(instr)}
        all_refs -= phi_preds

        # Remove branch target labels — also block names, not SSA values
        br_labels = {f"%{lb}" for lb in _BR_LABEL_RE.findall(instr)}
        all_refs -= br_labels

        # Find what this instruction defines
        def_match = _RESULT_RE.match(instr)
        defined_here = def_match.group(1) if def_match else None

        # Remove the LHS from uses
        if defined_here:
            all_refs.discard(defined_here)

        # Use = referenced before defined in this block
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
            if tgt not in block.successors:
                block.successors.append(tgt)
            if tgt in block_map and block.label not in block_map[tgt].predecessors:
                block_map[tgt].predecessors.append(block.label)
            continue

        # Conditional branch
        m = _BR_COND.match(last)
        if m:
            for tgt in (m.group(1), m.group(2)):
                if tgt not in block.successors:
                    block.successors.append(tgt)
                if tgt in block_map and block.label not in block_map[tgt].predecessors:
                    block_map[tgt].predecessors.append(block.label)
            continue

        # ret — no successors
