#!/usr/bin/env bash
# run.sh — Start the Register Allocation Simulator v2 (backend + frontend)
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "╔═══════════════════════════════════════════════════╗"
echo "║  Register Allocation Simulator v2 — Starting...   ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

# ── Start backend ─────────────────────────────────────────────────────────────
echo "▸ Starting FastAPI backend on http://localhost:8000 ..."
cd "$SCRIPT_DIR/backend"
if [ -d ".venv" ]; then
    source .venv/bin/activate
fi
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
echo "  ✓ Backend PID: $BACKEND_PID"

# ── Start frontend ────────────────────────────────────────────────────────────
echo "▸ Starting Vite frontend on http://localhost:5173 ..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!
echo "  ✓ Frontend PID: $FRONTEND_PID"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  Frontend: http://localhost:5173"
echo "  Backend:  http://localhost:8000"
echo "  API docs: http://localhost:8000/docs"
echo ""
echo "  Press Ctrl+C to stop both servers."
echo "═══════════════════════════════════════════════════════"

# Trap to kill both processes on exit
cleanup() {
    echo ""
    echo "Shutting down..."
    kill "$BACKEND_PID" 2>/dev/null || true
    kill "$FRONTEND_PID" 2>/dev/null || true
    wait "$BACKEND_PID" 2>/dev/null || true
    wait "$FRONTEND_PID" 2>/dev/null || true
    echo "Done."
}
trap cleanup EXIT INT TERM

# Wait for either to finish
wait
