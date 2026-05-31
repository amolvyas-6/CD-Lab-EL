"""
Custom Graph Coloring register allocator — Chaitin-Briggs algorithm.

Operates on the interference graph produced by interference.py.
Returns a register assignment dict and a list of spilled variables.
"""
from typing import Dict, List, Set, Optional, Tuple
from collections import defaultdict
import copy


def chaitin_briggs(
    nodes: List[str],
    edges: List[List[str]],
    k: int = 6,
) -> Dict:
    """
    Chaitin-Briggs graph coloring register allocator.

    Parameters
    ----------
    nodes : list of SSA value names (e.g. "%x", "%y")
    edges : list of [u, v] interference edges
    k     : number of available registers

    Returns
    -------
    {
        "registerMap": { node: register_name },
        "spills":      [ node, ... ],
        "spillCount":  int,
        "registerCount": int,
        "steps":       [ { phase, description, state } ]  # for animation
    }
    """
    # ── Build adjacency list ───────────────────────────────────────────────────
    adj: Dict[str, Set[str]] = defaultdict(set)
    for u, v in edges:
        adj[u].add(v)
        adj[v].add(u)
    # Ensure all nodes appear in adj even if degree-0
    for n in nodes:
        adj.setdefault(n, set())

    steps: List[Dict] = []
    spills: List[str] = []
    stack: List[str] = []
    remaining: Set[str] = set(nodes)

    def degree(n: str) -> int:
        return len(adj[n] & remaining)

    def record(phase: str, desc: str, extra: Dict = {}):
        steps.append({
            "phase": phase,
            "description": desc,
            "stackState": list(stack),
            "remaining": sorted(remaining),
            **extra,
        })

    record("Build", f"Interference graph has {len(nodes)} nodes, {len(edges)} edges. k={k}.")

    # ── Simplify / Spill loop ──────────────────────────────────────────────────
    iteration = 0
    while remaining and iteration < 500:
        iteration += 1
        # Find a node with degree < k
        low = next((n for n in list(remaining) if degree(n) < k), None)
        if low is not None:
            remaining.remove(low)
            stack.append(low)
            record("Simplify", f"Push {low} (degree {degree(low)+1}) onto stack.", {"node": low})
        else:
            # Spill: pick the node with minimum neighbors (simple heuristic)
            spill_candidate = min(remaining, key=lambda n: (degree(n), n))
            remaining.remove(spill_candidate)
            spills.append(spill_candidate)
            record("Spill", f"Potential spill: {spill_candidate} (all nodes have degree ≥ k).", {"node": spill_candidate})

    # ── Select (colour) ────────────────────────────────────────────────────────
    register_names = [f"r{i}" for i in range(k)]
    assignment: Dict[str, str] = {}
    actual_spills: List[str] = []

    # Add potential spills back to stack in reverse order
    for s in reversed(spills):
        stack.append(s)

    while stack:
        node = stack.pop()
        used_colors = {assignment[nb] for nb in adj[node] if nb in assignment}
        free = [r for r in register_names if r not in used_colors]
        if free:
            assignment[node] = free[0]
            record("Select", f"Assign {node} → {free[0]}.", {"node": node, "register": free[0]})
        else:
            actual_spills.append(node)
            record("Spill (Actual)", f"Cannot colour {node} — actual spill.", {"node": node})

    registers_used = len(set(assignment.values()))

    return {
        "registerMap": {n: assignment.get(n, "spilled") for n in nodes},
        "spills": actual_spills,
        "spillCount": len(actual_spills),
        "registerCount": registers_used,
        "steps": steps,
    }
