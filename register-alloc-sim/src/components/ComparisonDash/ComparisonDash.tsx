import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/simulatorStore';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const REG_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#f43f5e', '#06b6d4', '#ec4899', '#84cc16',
];
const SPILL_COLOR = '#ef4444';

function AssignmentColumn({
  title,
  color,
  assignments,
  spills,
}: {
  title: string;
  color: string;
  assignments: Record<string, number>;
  spills: string[];
}) {
  const allVars = [...Object.keys(assignments), ...spills];
  const spillSet = new Set(spills);

  return (
    <div style={{ flex: 1 }}>
      <div style={{
        padding: '10px 16px',
        background: `${color}12`,
        borderBottom: `2px solid ${color}`,
        fontWeight: 700,
        fontSize: '0.9rem',
        color,
        textAlign: 'center',
      }}>
        {title}
      </div>
      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
        {allVars.map((v) => {
          const isSpilled = spillSet.has(v);
          const reg = assignments[v];
          const c = isSpilled ? SPILL_COLOR : REG_COLORS[(reg ?? 0) % REG_COLORS.length];
          return (
            <div key={v} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '6px 10px', borderRadius: 6,
              background: `${c}10`, border: `1px solid ${c}25`,
              borderStyle: isSpilled ? 'dashed' : 'solid',
            }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 600, fontSize: '0.82rem', color: 'var(--text-primary)' }}>{v}</span>
              <span style={{ fontWeight: 700, color: c, fontSize: '0.82rem' }}>
                {isSpilled ? '⚠ spill' : `R${reg}`}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function ComparisonDash() {
  const { graphColoringResult, linearScanResult, registerCount } = useSimulatorStore();

  if (!graphColoringResult || !linearScanResult) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center' }}>
        Run the simulation first to see the comparison dashboard.
      </div>
    );
  }

  const chartData = [
    {
      metric: 'Registers Used',
      'Graph Coloring': graphColoringResult.registersUsed,
      'Linear Scan': linearScanResult.registersUsed,
    },
    {
      metric: 'Spills',
      'Graph Coloring': graphColoringResult.totalSpills,
      'Linear Scan': linearScanResult.totalSpills,
    },
    {
      metric: 'Algorithm Steps',
      'Graph Coloring': graphColoringResult.steps.length,
      'Linear Scan': linearScanResult.steps.length,
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Algorithm Comparison Dashboard</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Graph Coloring (Chaitin-Briggs) vs Linear Scan (Poletto-Sarkar) — k={registerCount}
        </p>
      </motion.div>

      {/* Metrics Bar Chart */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card">
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 16 }}>Metrics Comparison</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} margin={{ top: 0, right: 20, bottom: 0, left: 0 }}>
            <XAxis dataKey="metric" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <YAxis tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
            <Tooltip
              contentStyle={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border-primary)',
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Graph Coloring" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Linear Scan" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Side-by-side assignment comparison */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Register Assignments</h3>
        <div className="card" style={{ padding: 0, overflow: 'hidden', display: 'flex' }}>
          <AssignmentColumn
            title="Graph Coloring"
            color="#8b5cf6"
            assignments={graphColoringResult.assignments}
            spills={graphColoringResult.spills}
          />
          <div style={{ width: 1, background: 'var(--border-primary)' }} />
          <AssignmentColumn
            title="Linear Scan"
            color="#3b82f6"
            assignments={linearScanResult.assignments}
            spills={linearScanResult.spills}
          />
        </div>
      </motion.div>

      {/* When to use each */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="card" style={{ background: 'rgba(139,92,246,0.06)', borderColor: 'rgba(139,92,246,0.2)' }}>
            <h4 style={{ color: '#8b5cf6', fontWeight: 600, marginBottom: 8 }}>Graph Coloring — When to use</h4>
            <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.9, paddingLeft: 16 }}>
              <li>Optimizing compilers (GCC)</li>
              <li>When spill minimization is critical</li>
              <li>Static compilation with time to spare</li>
              <li>Complex programs with many variables</li>
            </ul>
          </div>
          <div className="card" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}>
            <h4 style={{ color: '#3b82f6', fontWeight: 600, marginBottom: 8 }}>Linear Scan — When to use</h4>
            <ul style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.9, paddingLeft: 16 }}>
              <li>JIT compilers (HotSpot JVM, LLVM)</li>
              <li>When compilation speed matters</li>
              <li>Simple, fast allocation needed</li>
              <li>Streaming code with clear intervals</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
