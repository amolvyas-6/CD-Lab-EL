"""
Assembly parser: extract register map and spill statistics from llc output.

Handles x86-64 and AArch64 assembly output from LLVM.
"""
import re
from typing import Dict, List, Tuple


# Spill patterns: stack load/store instructions that indicate spill code
_X86_SPILL_LOAD = re.compile(
    r"^\s+mov[lqwb]?\s+(-?\d+)\(%(?:rsp|rbp)\),\s*%(\w+)", re.MULTILINE
)
_X86_SPILL_STORE = re.compile(
    r"^\s+mov[lqwb]?\s+%(\w+),\s*(-?\d+)\(%(?:rsp|rbp)\)", re.MULTILINE
)
_ARM_SPILL = re.compile(
    r"^\s+(?:ldr|str)[bwdq]?\s+\w+,\s*\[(?:sp|x29)\b", re.MULTILINE
)


def parse_register_map(asm: str) -> Dict[str, str]:
    """
    Attempt to extract virtual→physical register hints from annotated assembly.

    LLVM does not emit the virtual→physical map in the normal .s output.
    We approximate by collecting all physical registers used and labelling them.
    """
    phys_regs = sorted(set(re.findall(r"%([a-z]{2,4}\d{0,2})", asm)))
    # Build a placeholder map — a full map requires debug (-print-after=regalloc)
    register_map: Dict[str, str] = {}
    for i, reg in enumerate(phys_regs):
        register_map[f"vreg{i}"] = f"%{reg}"
    return register_map


def extract_spill_instructions(asm: str) -> List[str]:
    """Return all lines in the assembly that look like spill load/store code."""
    spills: List[str] = []
    for line in asm.splitlines():
        stripped = line.strip()
        # x86: stack accesses via rsp/rbp offsets
        if re.search(r"\(%(?:rsp|rbp)\)", stripped):
            if re.match(r"mov", stripped):
                spills.append(stripped)
        # AArch64: stack accesses via sp/x29
        elif re.search(r"\[(?:sp|x29)[,\]]", stripped):
            if re.match(r"(?:ldr|str)", stripped):
                spills.append(stripped)
    return spills


def count_instructions(asm: str) -> int:
    """Count non-directive, non-label, non-comment assembly instructions."""
    count = 0
    for line in asm.splitlines():
        stripped = line.strip()
        if (
            stripped
            and not stripped.startswith(".")  # directives
            and not stripped.startswith("#")  # comments
            and not stripped.startswith("//") # C++ style comments
            and not stripped.endswith(":")    # labels
        ):
            count += 1
    return count


def count_physical_registers(asm: str) -> int:
    """Count distinct physical registers referenced in the assembly."""
    regs = set(re.findall(r"%([a-z]{2,4}\d{0,2})", asm))
    # Exclude segment/flag registers
    regs -= {"cs", "ds", "es", "fs", "gs", "ss", "eflags"}
    return len(regs)


def parse_stats_spill_count(stats_stderr: str) -> int:
    """
    Extract spill count from llc -stats stderr output.

    LLVM prints lines like:
      3 regalloc  - Number of spills inserted
    """
    match = re.search(r"(\d+)\s+regalloc\s+.*spill", stats_stderr, re.IGNORECASE)
    if match:
        return int(match.group(1))
    # Fallback: count spill-looking instructions in the asm (caller passes asm)
    return -1  # sentinel: use asm-based counting instead
