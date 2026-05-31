"""Integration tests for the LLVM pipeline (requires clang + llc installed)."""
import sys, os, shutil
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

import pytest
from llvm_pipeline import compile_to_ir, optimise_ir, run_llc

CLANG_AVAILABLE = shutil.which("clang") is not None
LLC_AVAILABLE = shutil.which("llc") is not None

SIMPLE_C = """\
int add(int a, int b) {
    return a + b;
}
"""

@pytest.mark.skipif(not CLANG_AVAILABLE, reason="clang not installed")
def test_compile_c_to_ir():
    ir, stderr, rc = compile_to_ir(SIMPLE_C, "c", "O0")
    assert rc == 0, f"clang failed: {stderr}"
    assert "define" in ir
    assert "@add" in ir


@pytest.mark.skipif(not CLANG_AVAILABLE, reason="clang not installed")
def test_optimise_ir():
    ir, _, _ = compile_to_ir(SIMPLE_C)
    opt_ir, stderr, rc = optimise_ir(ir)
    assert rc == 0, f"opt failed: {stderr}"
    assert "define" in opt_ir


@pytest.mark.skipif(not (CLANG_AVAILABLE and LLC_AVAILABLE), reason="clang/llc not installed")
def test_llc_greedy():
    ir, _, _ = compile_to_ir(SIMPLE_C)
    opt_ir, _, _ = optimise_ir(ir)
    asm, _stderr, rc = run_llc(opt_ir, "greedy")
    assert rc == 0
    assert len(asm) > 0


@pytest.mark.skipif(not (CLANG_AVAILABLE and LLC_AVAILABLE), reason="clang/llc not installed")
def test_llc_fast():
    ir, _, _ = compile_to_ir(SIMPLE_C)
    opt_ir, _, _ = optimise_ir(ir)
    asm, _stderr, rc = run_llc(opt_ir, "fast")
    assert rc == 0


if __name__ == "__main__":
    if CLANG_AVAILABLE:
        test_compile_c_to_ir()
        test_optimise_ir()
        if LLC_AVAILABLE:
            test_llc_greedy()
            test_llc_fast()
        print("LLVM pipeline tests passed.")
    else:
        print("SKIP: clang not available on this machine.")
