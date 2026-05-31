import type { LiveInterval } from '../../types';

interface GanttChartProps {
  intervals: LiveInterval[];
  numRegisters: number;
}

// 10 distinct colours for register lanes
const REG_COLORS = [
  '#6c8dfa', '#4ade80', '#a78bfa', '#22d3ee',
  '#fbbf24', '#f87171', '#fb923c', '#34d399',
  '#818cf8', '#f472b6',
];

export default function GanttChart({ intervals, numRegisters }: GanttChartProps) {
  if (!intervals.length) return (
    <div className="empty-state">
      <div className="empty-icon">📈</div>
      <p>No interval data. Run the pipeline with custom_ls enabled.</p>
    </div>
  );

  const maxEnd = Math.max(...intervals.map((iv) => iv.end), 1);
  const pct = (v: number) => `${(v / maxEnd) * 100}%`;
  const width = (s: number, e: number) => `${((e - s + 1) / maxEnd) * 100}%`;

  // Assign colours by register name
  const regColors: Record<string, string> = {};
  let colIdx = 0;
  for (const iv of intervals) {
    if (iv.register && !(iv.register in regColors)) {
      regColors[iv.register] = REG_COLORS[colIdx++ % REG_COLORS.length];
    }
  }

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">
          📈 Live Interval Timeline (Linear Scan)
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          k = {numRegisters} · {intervals.length} intervals · {intervals.filter((i) => i.spilled).length} spills
        </span>
      </div>
      <div className="card-body">
        {/* Legend */}
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
          {Object.entries(regColors).map(([reg, col]) => (
            <div key={reg} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-secondary)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: col, display: 'inline-block' }} />
              {reg}
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--red)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--red)', display: 'inline-block' }} />
            spilled
          </div>
        </div>

        <div className="gantt-wrap" style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {intervals.map((iv) => {
            const color = iv.spilled ? 'var(--red)' : regColors[iv.register ?? ''] ?? '#525c70';
            return (
              <div key={iv.variable} className="gantt-row">
                <div className="gantt-label" title={iv.variable}>{iv.variable}</div>
                <div className="gantt-track">
                  <div
                    className={`gantt-bar${iv.spilled ? ' spilled' : ''}`}
                    style={{
                      left: pct(iv.start),
                      width: width(iv.start, iv.end),
                      background: color,
                    }}
                    title={`${iv.variable}: [${iv.start}, ${iv.end}] → ${iv.register ?? 'spilled'}`}
                  >
                    {iv.register ?? '✕'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
