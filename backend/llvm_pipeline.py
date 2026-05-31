"""
LLVM pipeline wrappers: clang → opt → llc subprocess calls.

Each function writes to a temp directory, executes the relevant LLVM tool,
and returns (stdout/file-content, stderr, returncode).
"""
import subprocess
import tempfile
import os
import re
from typing import Tuple


def _run(cmd: list[str], input_text: str | None = None) -> Tuple[str, str, int]:
    """Run a shell command, return (stdout, stderr, returncode)."""
    result = subprocess.run(
        cmd,
        input=input_text,
        capture_output=True,
        text=True,
        timeout=30,
    )
    return result.stdout, result.stderr, result.returncode


def compile_to_ir(source: str, language: str = "c", optimization: str = "O0") -> Tuple[str, str, int]:
    """
    Compile C/C++ source to unoptimised LLVM IR.

    clang -S -emit-llvm -O0 -Xclang -disable-O0-optnone <input> -o -

    Returns: (ir_text, stderr, returncode)
    """
    ext = ".c" if language == "c" else ".cpp"
    with tempfile.TemporaryDirectory() as tmpdir:
        src_path = os.path.join(tmpdir, f"input{ext}")
        ll_path = os.path.join(tmpdir, "unopt.ll")
        with open(src_path, "w") as f:
            f.write(source)

        cmd = [
            "clang", "-S", "-emit-llvm",
            "-O0", "-Xclang", "-disable-O0-optnone",
            "-fno-discard-value-names",   # keep human-readable variable names
            src_path, "-o", ll_path,
        ]
        _, stderr, rc = _run(cmd)
        if rc != 0:
            return "", stderr, rc
        with open(ll_path) as f:
            ir = f.read()
        return ir, stderr, rc


def optimise_ir(unopt_ir: str) -> Tuple[str, str, int]:
    """
    Run mem2reg + instcombine on the unoptimised IR.

    opt -passes="mem2reg,instcombine" unopt.ll -S -o opt.ll

    Returns: (opt_ir_text, stderr, returncode)
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        in_path = os.path.join(tmpdir, "unopt.ll")
        out_path = os.path.join(tmpdir, "opt.ll")
        with open(in_path, "w") as f:
            f.write(unopt_ir)

        cmd = ["opt", "-passes=mem2reg,instcombine", in_path, "-S", "-o", out_path]
        _, stderr, rc = _run(cmd)
        if rc != 0:
            # Some LLVM versions use legacy pass syntax
            cmd_legacy = ["opt", "-mem2reg", "-instcombine", in_path, "-S", "-o", out_path]
            _, stderr, rc = _run(cmd_legacy)
            if rc != 0:
                return "", stderr, rc
        with open(out_path) as f:
            ir = f.read()
        return ir, stderr, rc


def run_llc(ir: str, regalloc: str = "greedy") -> Tuple[str, str, int]:
    """
    Run llc with a specific register allocator.

    llc -regalloc=<name> -stats <ir> -o <out.s>

    Returns: (assembly, stats_stderr, returncode)

    Note: llc emits both compilation diagnostics and -stats output to stderr.
    We return the full stderr which contains the stats lines.
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        in_path = os.path.join(tmpdir, "input.ll")
        out_path = os.path.join(tmpdir, f"{regalloc}.s")
        with open(in_path, "w") as f:
            f.write(ir)

        cmd = [
            "llc",
            f"-regalloc={regalloc}",
            "-stats",
            in_path,
            "-o", out_path,
        ]
        _, stderr, rc = _run(cmd)

        asm = ""
        if os.path.exists(out_path):
            with open(out_path) as f:
                asm = f.read()

        return asm, stderr, rc
