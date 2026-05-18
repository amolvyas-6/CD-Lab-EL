import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/simulatorStore';

const REG_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#f43f5e', '#06b6d4', '#ec4899', '#84cc16',
];
const SPILL_COLOR = '#ef4444';

export default function GraphColoringView() {
  const { graphColoringResult, registerCount } = useSimulatorStore();

  if (!graphColoringResult) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center' }}>
        No graph coloring result. Run the simulation first.
      </div>
    );
  }

  const { assignments, spills, registersUsed, totalSpills } = graphColoringResult;
  const variables = Object.keys(assignments);
  const allVars = [...variables, ...spills];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Graph Coloring — Chaitin-Briggs</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Register assignment via k-coloring of the interference graph (k = {registerCount})
        </p>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        {[
          { label: 'Registers Used', value: registersUsed, color: 'var(--accent-purple)' },
          { label: 'k (available)', value: registerCount, color: 'var(--accent-blue)' },
          { label: 'Variables Allocated', value: variables.length, color: 'var(--accent-emerald)' },
          { label: 'Spills', value: totalSpills, color: totalSpills > 0 ? 'var(--accent-rose)' : 'var(--accent-emerald)' },
        ].map(({ label, value, color }) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="card"
            style={{ textAlign: 'center', padding: 16 }}
          >
            <div style={{ fontSize: '1.8rem', fontWeight: 700, color }}>{value}</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
          </motion.div>
        ))}
      </div>

      {/* Register Assignment Grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
      >
        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: 12 }}>Register Assignments</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
          {allVars.map((v, i) => {
            const reg = assignments[v];
            const isSpilled = spills.includes(v);
            const color = isSpilled ? SPILL_COLOR : REG_COLORS[reg % REG_COLORS.length];
            return (
              <motion.div
                key={v}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: `${color}10`,
                  border: `1px solid ${color}30`,
                  borderStyle: isSpilled ? 'dashed' : 'solid',
                }}
              >
                <span style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.85rem' }}>{v}</span>
                <span style={{ fontWeight: 700, color, fontSize: '0.85rem' }}>
                  {isSpilled ? '⚠ spill' : `R${reg}`}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Algorithm Steps Summary */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="card"
        style={{ background: 'rgba(109, 40, 217, 0.06)', borderColor: 'rgba(109, 40, 217, 0.15)' }}
      >
        <h4 style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: 8, color: 'var(--accent-purple)' }}>
          Chaitin-Briggs Algorithm Phases
        </h4>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 2 }}>
          <div>📐 <strong>Build</strong> — Construct interference graph from liveness</div>
          <div>🔀 <strong>Simplify</strong> — Push low-degree (&lt;k) nodes onto coloring stack</div>
          <div>⚡ <strong>Spill</strong> — Select potential spill when all remaining have degree ≥ k</div>
          <div>🎨 <strong>Select</strong> — Pop stack, assign colors greedily; actual spills determined here</div>
        </div>
      </motion.div>
    </div>
  );
}
