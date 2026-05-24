"""
Interference graph construction from liveness data.

Two SSA values u and v interfere if they are simultaneously live at any
program point.  Construction rule (per definition):
  For each definition d in block B, add edges (d, v) for every v ∈ live_out[B]
  where v ≠ d.
"""
from typing import List, Dict, Set, Tuple
from ir_parser import IRBasicBlock
import re

_RESULT_RE = re.compile(r"^\s*(%[\w.]+)\s*=")


def build_interference_graph(blocks: List[IRBasicBlock]) -> Dict:
    """
    Build an interference graph and return a JSON-serialisable dict:
      {
        "nodes": ["v1", "v2", ...],
        "edges": [["v1", "v2"], ...]
      }
    """
    nodes: Set[str] = set()
    edges: Set[Tuple[str, str]] = set()

    def add_edge(u: str, v: str):
        if u != v:
            edge = (min(u, v), max(u, v))
            edges.add(edge)

    for block in blocks:
        # Collect all SSA values defined in this function (for node set)
        for instr in block.instructions:
            m = _RESULT_RE.match(instr)
            if m:
                nodes.add(m.group(1))

        # For each definition d in this block, it interferes with live_out
        live = set(block.live_out)
        # Walk instructions in reverse to simulate backward analysis
        for instr in reversed(block.instructions):
            m = _RESULT_RE.match(instr)
            if m:
                d = m.group(1)
                nodes.add(d)
                for v in live:
                    add_edge(d, v)
                # After the definition, d is no longer live (backward)
                live.discard(d)
            # Add uses to live set (backward)
            refs = set(re.findall(r"%[\w.]+", instr))
            defined = {m.group(1)} if m else set()
            live |= refs - defined

    return {
        "nodes": sorted(nodes),
        "edges": [list(e) for e in sorted(edges)],
    }
