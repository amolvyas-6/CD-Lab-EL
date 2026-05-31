#!/usr/bin/env bash
# build.sh — Install dependencies for the Register Allocation Simulator v2
set -e

echo "╔═══════════════════════════════════════════════════╗"
echo "║  Register Allocation Simulator v2 — Build Script  ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# ── Check LLVM toolchain ──────────────────────────────────────────────────────
echo "▸ Checking LLVM toolchain..."
missing=""
for tool in clang opt llc; do
    if command -v "$tool" &>/dev/null; then
        echo "  ✓ $tool found: $(command -v "$tool")"
    else
        echo "  ✗ $tool NOT FOUND"
        missing="$missing $tool"
    fi
done

if [ -n "$missing" ]; then
    echo ""
    echo "⚠  Missing LLVM tools:$missing"
    echo "   Install with:"
    echo "     Ubuntu/Debian: sudo apt install clang llvm"
    echo "     macOS:         brew install llvm"
    echo ""
    echo "   Continuing anyway (LLVM allocators will fail at runtime)..."
fi

# ── Check Python ──────────────────────────────────────────────────────────────
echo ""
echo "▸ Checking Python..."
if command -v python3 &>/dev/null; then
    echo "  ✓ python3 found: $(python3 --version)"
else
    echo "  ✗ python3 NOT FOUND — please install Python 3.11+"
    exit 1
fi

# ── Check Node.js ─────────────────────────────────────────────────────────────
echo ""
echo "▸ Checking Node.js..."
if command -v node &>/dev/null; then
    echo "  ✓ node found: $(node --version)"
else
    echo "  ✗ node NOT FOUND — please install Node.js 18+"
    exit 1
fi

# ── Install backend dependencies ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
echo ""
echo "▸ Installing backend dependencies..."
cd "$SCRIPT_DIR/backend"
if [ -d ".venv" ]; then
    echo "  Found existing .venv"
    source .venv/bin/activate
else
    echo "  Creating virtual environment..."
    python3 -m venv .venv
    source .venv/bin/activate
fi
pip install -r requirements.txt --quiet 2>&1 | tail -1
echo "  ✓ Backend dependencies installed"

# ── Install frontend dependencies ─────────────────────────────────────────────
echo ""
echo "▸ Installing frontend dependencies..."
cd "$SCRIPT_DIR/frontend"
npm install --silent 2>&1 | tail -1
echo "  ✓ Frontend dependencies installed"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Build complete! Run ./run.sh to start the simulator."
echo "═══════════════════════════════════════════════════════"
