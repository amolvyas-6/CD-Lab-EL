"""
Liveness analysis on LLVM IR basic blocks.

Implements the standard backward data-flow fixpoint solver:
  live_out[B] = ⋃  live_in[S]   for each successor S
  live_in[B]  = use[B] ∪ (live_out[B] − def[B])

Iterates until no set changes (fixpoint).
"""
from typing import List, Dict, Set
from ir_parser import IRBasicBlock


def compute_liveness(blocks: List[IRBasicBlock]) -> List[IRBasicBlock]:
    """
    Run the backward data-flow fixpoint solver on a list of basic blocks.
    Modifies each block's live_in / live_out in place and returns the list.
    """
    block_map: Dict[str, IRBasicBlock] = {b.label: b for b in blocks}

    # Initialise all sets to empty
    for b in blocks:
        b.live_in = set()
        b.live_out = set()

    changed = True
    iterations = 0
    while changed and iterations < 500:
        changed = False
        iterations += 1
        # Process in reverse order (backward analysis)
        for block in reversed(blocks):
            # live_out[B] = ⋃ live_in[S]
            new_live_out: Set[str] = set()
            for succ_label in block.successors:
                if succ_label in block_map:
                    new_live_out |= block_map[succ_label].live_in

            # live_in[B] = use[B] ∪ (live_out[B] − def[B])
            new_live_in = block.use | (new_live_out - block.defn)

            if new_live_out != block.live_out or new_live_in != block.live_in:
                block.live_out = new_live_out
                block.live_in = new_live_in
                changed = True

    return blocks


def build_liveness_matrix(blocks: List[IRBasicBlock]) -> Dict[str, Dict[str, List[str]]]:
    """
    Return a dict suitable for the API response:
      { block_label: { liveIn: [...], liveOut: [...] } }
    """
    return {
        b.label: {
            "liveIn": sorted(b.live_in),
            "liveOut": sorted(b.live_out),
        }
        for b in blocks
    }
