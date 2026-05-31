"""Tests for Chaitin-Briggs graph coloring allocator."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from graph_coloring import chaitin_briggs


def test_no_interference_no_spills():
    """Three independent variables — no edges — all get distinct registers."""
    nodes = ["%a", "%b", "%c"]
    edges = []
    result = chaitin_briggs(nodes, edges, k=3)
    assert result["spillCount"] == 0
    assert len(set(result["registerMap"].values())) <= 3


def test_triangle_k3_no_spill():
    """Triangle graph (3 nodes, all interfering) with k=3 → 0 spills."""
    nodes = ["%x", "%y", "%z"]
    edges = [["%x", "%y"], ["%y", "%z"], ["%x", "%z"]]
    result = chaitin_briggs(nodes, edges, k=3)
    assert result["spillCount"] == 0
    # Verify no two adjacent nodes share a register
    reg = result["registerMap"]
    assert reg["%x"] != reg["%y"]
    assert reg["%y"] != reg["%z"]
    assert reg["%x"] != reg["%z"]


def test_triangle_k2_forces_spill():
    """Triangle graph with k=2 → at least 1 spill."""
    nodes = ["%x", "%y", "%z"]
    edges = [["%x", "%y"], ["%y", "%z"], ["%x", "%z"]]
    result = chaitin_briggs(nodes, edges, k=2)
    assert result["spillCount"] >= 1


def test_valid_colouring():
    """No two interfering nodes may share the same register."""
    nodes = ["%a", "%b", "%c", "%d"]
    edges = [["%a", "%b"], ["%b", "%c"], ["%c", "%d"]]
    result = chaitin_briggs(nodes, edges, k=2)
    reg = result["registerMap"]
    for u, v in edges:
        if reg[u] != "spilled" and reg[v] != "spilled":
            assert reg[u] != reg[v], f"Conflict: {u} and {v} both assigned {reg[u]}"


def test_step_recording():
    """Steps should be non-empty and contain required keys."""
    nodes = ["%a", "%b"]
    edges = [["%a", "%b"]]
    result = chaitin_briggs(nodes, edges, k=2)
    assert len(result["steps"]) > 0
    for step in result["steps"]:
        assert "phase" in step
        assert "description" in step


if __name__ == "__main__":
    test_no_interference_no_spills()
    test_triangle_k3_no_spill()
    test_triangle_k2_forces_spill()
    test_valid_colouring()
    test_step_recording()
    print("All graph coloring tests passed.")
