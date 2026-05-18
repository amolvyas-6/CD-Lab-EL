import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/simulatorStore';
import { computeLiveIntervals } from '../../core/linearScan';
import type { LiveInterval } from '../../core/types';

const REG_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#f43f5e', '#06b6d4', '#ec4899', '#84cc16',
];
const SPILL_COLOR = '#ef4444';

export default function GanttChart() {
  const { linearScanResult, instructions, registerCount } = useSimulatorStore();

  if (!linearScanResult || instructions.length === 0) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center' }}>
        No linear scan result. Run the simulation first.
      </div>
    );
  }

  const intervals = computeLiveIntervals(instructions);
  const spills = new Set(linearScanResult.spills);
  const assignments = linearScanResult.assignments;

  // Annotate intervals with assignment info
  const annotated: (LiveInterval & { register: number | undefined; spilled: boolean })[] = intervals.map((iv) => ({
    ...iv,
    register: assignments[iv.variable],
    spilled: spills.has(iv.variable),
  }));

  annotated.sort((a, b) => a.start - b.start);

  const totalInstructions = instructions.length;
  const usedRegisters = new Set(Object.values(assignments));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Linear Scan — Poletto-Sarkar</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Live interval timeline (Gantt chart) — k = {registerCount} registers
        </p>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
        {[
          { label: 'Registers Used', value: usedRegisters.size, color: 'var(--accent-purple)' },
          { label: 'Variables', value: annotated.length, color: 'var(--accent-blue)' },
          { label: 'Spills', value: linearScanResult.totalSpills, color: linearScanResult.totalSpills > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' },
          { label: 'Instructions', value: totalInstructions, color: 'var(--accent-cyan)' },
        ].map(({ label, value, color }) => (
          <motion.div key={label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}
            className="card" style={{ textAlign: 'center', padding: 16 }}>
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Gantt Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card" style={{ padding: 20, overflowX: 'auto' }}>
        <h3 style={{ fontSize: '0.88rem', fontWeight: 600, marginBottom: 16 }}>Live Interval Timeline</h3>

        {/* Instruction header */}
        <div style={{ display: 'flex', marginBottom: 8, marginLeft: 80 }}>
          {Array.from({ length: totalInstructions }, (_, i) => (
            <div key={i} style={{
              flex: 1,
              textAlign: 'center',
              fontSize: '0.6rem',
              color: 'var(--text-muted)',
              borderLeft: '1px solid var(--border-primary)',
              padding: '2px 0',
              minWidth: 24,
            }}>
              {i}
            </div>
          ))}
        </div>

        {/* Interval rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {annotated.map((iv, idx) => {
            const color = iv.spilled ? SPILL_COLOR : REG_COLORS[(iv.register ?? 0) % REG_COLORS.length];
            const leftPct = (iv.start / totalInstructions) * 100;
            const widthPct = ((iv.end - iv.start + 1) / totalInstructions) * 100;

            return (
              <motion.div
                key={iv.variable}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.05 * idx }}
                style={{ display: 'flex', alignItems: 'center', height: 28 }}
              >
                {/* Variable label */}
                <div style={{
                  width: 80, flexShrink: 0,
                  fontSize: '0.78rem', fontWeight: 600, fontFamily: 'monospace',
                  color: 'var(--text-primary)',
                  textAlign: 'right', paddingRight: 10,
                }}>
                  {iv.variable}
                </div>

                {/* Timeline track */}
                <div style={{ flex: 1, position: 'relative', height: '100%', background: 'var(--bg-tertiary)', borderRadius: 4, overflow: 'hidden' }}>
                  {/* Interval bar */}
                  <div
                    style={{
                      position: 'absolute',
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      height: '100%',
                      background: iv.spilled ? `repeating-linear-gradient(45deg, ${color}30, ${color}30 4px, ${color}10 4px, ${color}10 8px)` : `${color}`,
                      border: `1px solid ${color}`,
                      borderStyle: iv.spilled ? 'dashed' : 'solid',
                      borderRadius: 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      color: 'white',
                      overflow: 'hidden',
                    }}
                    title={`${iv.variable}: [${iv.start}–${iv.end}] → ${iv.spilled ? 'SPILL' : `R${iv.register}`}`}
                  >
                    {iv.spilled ? 'spill' : `R${iv.register}`}
                  </div>
                </div>

                {/* Register label */}
                <div style={{
                  width: 50, flexShrink: 0,
                  fontSize: '0.72rem', fontWeight: 700,
                  color,
                  textAlign: 'left', paddingLeft: 8,
                }}>
                  {iv.spilled ? '⚠' : `R${iv.register}`}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
