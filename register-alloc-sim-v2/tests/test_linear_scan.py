"""Tests for Poletto-Sarkar linear scan allocator."""
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from linear_scan import LiveInterval, linear_scan


def _make_intervals(specs):
    """specs: list of (var, start, end)"""
    return [LiveInterval(variable=v, start=s, end=e) for v, s, e in specs]


def test_no_overlap_no_spills():
    """Non-overlapping intervals — only 1 register needed."""
    intervals = _make_intervals([("%a", 0, 2), ("%b", 3, 5), ("%c", 6, 8)])
    result = linear_scan(intervals, k=2)
    assert result["spillCount"] == 0


def test_overlapping_fits_k():
    """k=2, two simultaneously live → fits exactly."""
    intervals = _make_intervals([("%a", 0, 5), ("%b", 1, 4)])
    result = linear_scan(intervals, k=2)
    assert result["spillCount"] == 0
    assert result["registerMap"]["%a"] != result["registerMap"]["%b"]


def test_spill_when_pressure_exceeds_k():
    """Three simultaneously live intervals with k=2 → 1 spill."""
    intervals = _make_intervals([("%a", 0, 10), ("%b", 1, 9), ("%c", 2, 8)])
    result = linear_scan(intervals, k=2)
    assert result["spillCount"] >= 1


def test_gantt_data_present():
    """intervals list must include all vars with start/end."""
    intervals = _make_intervals([("%x", 0, 3), ("%y", 1, 5)])
    result = linear_scan(intervals, k=2)
    vars_in_output = {iv["variable"] for iv in result["intervals"]}
    assert "%x" in vars_in_output
    assert "%y" in vars_in_output


def test_no_conflicting_assignment():
    """No two simultaneously live variables should share a register."""
    intervals = _make_intervals([
        ("%a", 0, 5), ("%b", 0, 5), ("%c", 6, 10), ("%d", 6, 10)
    ])
    result = linear_scan(intervals, k=2)
    reg = result["registerMap"]

    # %a and %b overlap → must differ (or one is spilled)
    if reg["%a"] != "spilled" and reg["%b"] != "spilled":
        assert reg["%a"] != reg["%b"]


if __name__ == "__main__":
    test_no_overlap_no_spills()
    test_overlapping_fits_k()
    test_spill_when_pressure_exceeds_k()
    test_gantt_data_present()
    test_no_conflicting_assignment()
    print("All linear scan tests passed.")
