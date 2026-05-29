"""
Interference graph construction from liveness data.

Two SSA values u and v interfere if they are simultaneously live at any
program point.  Construction rule (per definition):
  For each definition d in block B, add edges (d, v) for every v ∈ live_out[B]
  where v ≠ d.

We use the precise backward-walk approach inside each block, which handles
the case where a variable is defined and used within the same block.

IMPORTANT: We filter out block-label pseudo-variables (values that appear as
phi predecessor labels or branch targets but are NOT real SSA values).
Only `%xxx` values that appear as LHS results in at least one instruction
are treated as real variables. This prevents block labels like `%entry` or
`%while.body` from appearing as interference graph nodes.
"""
from typing import List, Dict, Set, Tuple
from ir_parser import IRBasicBlock
import re

_RESULT_RE = re.compile(r"^\s*(%[\w.]+)\s*=")
_REF_RE    = re.compile(r"%[\w.]+")

# Phi predecessor labels: [ anything, %block_label ]
_PHI_PRED_RE = re.compile(r"\[\s*[^,\[\]]+,\s*%([\w.]+)\s*\]")
# Branch target labels
_BR_LABEL_RE = re.compile(r"\blabel\s+%([\w.]+)")


def _get_real_ssa_values(blocks: List[IRBasicBlock]) -> Set[str]:
    """
    Collect all SSA values that actually appear as LHS definitions (= real values).
    Values like %entry or %while.body are block labels, not SSA values.
    """
    real: Set[str] = set()
    for block in blocks:
        for instr in block.instructions:
            m = _RESULT_RE.match(instr)
            if m:
                real.add(m.group(1))
    return real


def _get_pseudo_labels(block: IRBasicBlock) -> Set[str]:
    """Extract phi predecessor labels and branch target labels from a block's instructions."""
    pseudo: Set[str] = set()
    for instr in block.instructions:
        for lb in _PHI_PRED_RE.findall(instr):
            pseudo.add(f"%{lb}")
        for lb in _BR_LABEL_RE.findall(instr):
            pseudo.add(f"%{lb}")
    return pseudo


def build_interference_graph(blocks: List[IRBasicBlock]) -> Dict:
    """
    Build an interference graph and return a JSON-serialisable dict:
      {
        "nodes": ["%v1", "%v2", ...],
        "edges": [["%v1", "%v2"], ...]
      }

    Only real SSA values (those defined by an assignment instruction) are
    included. Block-label pseudo-variables are excluded.
    """
    # First pass: collect all real SSA value names (LHS of assignments)
    real_values = _get_real_ssa_values(blocks)

    nodes: Set[str] = set(real_values)
    edges: Set[Tuple[str, str]] = set()

    def add_edge(u: str, v: str):
        if u != v and u in real_values and v in real_values:
            edge = (min(u, v), max(u, v))
            edges.add(edge)

    for block in blocks:
        # Collect pseudo-labels to exclude from this block's instruction refs
        pseudo = _get_pseudo_labels(block)

        # Backward walk through instructions to build precise interference
        # Start with live_out (already computed by liveness analysis)
        live = set(block.live_out) & real_values   # only keep real SSA values

        for instr in reversed(block.instructions):
            m = _RESULT_RE.match(instr)
            d = m.group(1) if m else None

            if d and d in real_values:
                # d is defined here; it interferes with everything currently live
                for v in live:
                    add_edge(d, v)
                # Remove d from live (backward: before this point d wasn't live)
                live.discard(d)

            # Add real SSA value references to live set (backward)
            all_refs = set(_REF_RE.findall(instr)) - pseudo
            if d:
                all_refs.discard(d)
            live |= (all_refs & real_values)

    return {
        "nodes": sorted(nodes),
        "edges": [list(e) for e in sorted(edges)],
    }
