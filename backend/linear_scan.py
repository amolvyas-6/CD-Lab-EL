"""
Custom Linear Scan register allocator — Poletto-Sarkar algorithm.

Operates on live intervals derived from the LLVM IR's liveness data.
Returns a register assignment dict, spill list, and Gantt-chart data.
"""
from typing import Dict, List, Set, Optional, Tuple
from dataclasses import dataclass, field
import re


@dataclass
class LiveInterval:
    variable: str
    start: int      # instruction index of first definition
    end: int        # instruction index of last use
    register: Optional[str] = None
    spilled: bool = False


def compute_live_intervals(blocks: list) -> List[LiveInterval]:
    """
    Compute linear live intervals from a list of IRBasicBlock objects.

    We assign a monotonically increasing instruction index across all blocks
    (flattening the CFG to a linear order) and then compute [start, end]
    for each SSA value.
    """
    _RESULT_RE = re.compile(r"^\s*(%[\w.]+)\s*=")
    _USE_RE = re.compile(r"%[\w.]+")

    instr_index = 0
    first_def: Dict[str, int] = {}
    last_use: Dict[str, int] = {}

    for block in blocks:
        for instr in block.instructions:
            # Definition
            m = _RESULT_RE.match(instr)
            if m:
                var = m.group(1)
                if var not in first_def:
                    first_def[var] = instr_index

            # All uses
            refs = _USE_RE.findall(instr)
            for ref in refs:
                last_use[ref] = instr_index

            instr_index += 1

    # Build intervals — a variable's interval spans from first def to last use
    intervals: List[LiveInterval] = []
    all_vars = set(first_def) | set(last_use)
    for var in sorted(all_vars):
        start = first_def.get(var, last_use.get(var, 0))
        end = last_use.get(var, start)
        intervals.append(LiveInterval(variable=var, start=start, end=end))

    return sorted(intervals, key=lambda iv: iv.start)


def linear_scan(
    intervals: List[LiveInterval],
    k: int = 6,
) -> Dict:
    """
    Poletto-Sarkar Linear Scan register allocator.

    Returns
    -------
    {
        "registerMap":   { variable: register_name | "spilled" },
        "spills":        [ variable, ... ],
        "spillCount":    int,
        "registerCount": int,
        "intervals":     [ { variable, start, end, register, spilled } ],
        "steps":         [ { description, activeList, assigned } ]
    }
    """
    register_pool = [f"r{i}" for i in range(k)]
    free_regs: List[str] = list(register_pool)
    active: List[LiveInterval] = []   # sorted by end point
    spills: List[str] = []
    steps: List[Dict] = []

    def record(desc: str):
        steps.append({
            "description": desc,
            "activeList": [iv.variable for iv in active],
            "assigned": {iv.variable: iv.register for iv in active if iv.register},
        })

    for iv in intervals:
        # Expire old intervals
        expired = [a for a in active if a.end < iv.start]
        for e in expired:
            active.remove(e)
            if e.register:
                free_regs.append(e.register)
            record(f"Expire {e.variable} (end={e.end} < start={iv.start})")

        if len(active) == k:
            # Spill: choose the interval with the farthest endpoint
            spill_target = max(active, key=lambda a: a.end)
            if spill_target.end > iv.end:
                iv.register = spill_target.register
                spill_target.register = None
                spill_target.spilled = True
                active.remove(spill_target)
                active.append(iv)
                spills.append(spill_target.variable)
                record(f"Spill {spill_target.variable} (farthest end) → give r to {iv.variable}")
            else:
                iv.spilled = True
                spills.append(iv.variable)
                record(f"Spill {iv.variable} (its end ≤ current farthest active)")
        else:
            if free_regs:
                iv.register = free_regs.pop(0)
            else:
                iv.spilled = True
                spills.append(iv.variable)
                record(f"No free registers — spill {iv.variable}")
                continue
            active.append(iv)
            active.sort(key=lambda a: a.end)
            record(f"Assign {iv.variable} → {iv.register}")

    register_map = {
        iv.variable: iv.register if iv.register else "spilled"
        for iv in intervals
    }
    registers_used = len({iv.register for iv in intervals if iv.register})

    return {
        "registerMap": register_map,
        "spills": spills,
        "spillCount": len(spills),
        "registerCount": registers_used,
        "intervals": [
            {
                "variable": iv.variable,
                "start": iv.start,
                "end": iv.end,
                "register": iv.register,
                "spilled": iv.spilled,
            }
            for iv in intervals
        ],
        "steps": steps,
    }
