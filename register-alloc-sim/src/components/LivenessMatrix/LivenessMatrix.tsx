import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/simulatorStore';
import { getAllVariables } from '../../core/cfg';

export default function LivenessMatrix() {
  const { cfg } = useSimulatorStore();

  if (!cfg) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center' }}>
        No liveness data. Run the simulation first.
      </div>
    );
  }

  const blocks = [...cfg.blocks.values()];
  const allVars = getAllVariables(cfg);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Liveness Analysis</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
          Backward data-flow analysis — live-in / live-out sets per basic block
        </p>
      </motion.div>

      {/* Equations */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="card"
        style={{
          background: 'rgba(245, 158, 11, 0.06)',
          borderColor: 'rgba(245, 158, 11, 0.15)',
          fontFamily: 'monospace',
          fontSize: '0.82rem',
          lineHeight: 2,
          color: 'var(--text-secondary)',
        }}
      >
        <div><strong style={{ color: 'var(--accent-amber)' }}>use[B]</strong> = variables used before being defined in B</div>
        <div><strong style={{ color: 'var(--accent-amber)' }}>def[B]</strong> = variables defined before being used in B</div>
        <div><strong style={{ color: 'var(--accent-purple)' }}>live_out[B]</strong> = ∪ live_in[S] for all successors S of B</div>
        <div><strong style={{ color: 'var(--accent-blue)' }}>live_in[B]</strong> = use[B] ∪ (live_out[B] − def[B])</div>
      </motion.div>

      {/* Liveness Matrix */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
        style={{ padding: 0, overflow: 'hidden' }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-tertiary)' }}>
                <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--border-primary)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', minWidth: 100 }}>
                  Block
                </th>
                {allVars.map((v) => (
                  <th key={v} style={{ padding: '10px 12px', textAlign: 'center', borderBottom: '1px solid var(--border-primary)', fontWeight: 600, color: 'var(--accent-purple)', fontFamily: 'monospace', minWidth: 60 }}>
                    {v}
                  </th>
                ))}
                <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--border-primary)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  live_in
                </th>
                <th style={{ padding: '10px 16px', textAlign: 'left', borderBottom: '1px solid var(--border-primary)', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  live_out
                </th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block, bi) => (
                <motion.tr
                  key={block.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + bi * 0.05 }}
                  style={{ borderBottom: '1px solid var(--border-primary)' }}
                >
                  <td style={{ padding: '10px 16px', fontWeight: 600, fontFamily: 'monospace', color: 'var(--accent-cyan)' }}>
                    {block.id}
                  </td>
                  {allVars.map((v) => {
                    const inLiveIn = block.liveIn.has(v);
                    const inLiveOut = block.liveOut.has(v);
                    const inDef = block.def.has(v);
                    const inUse = block.use.has(v);
                    const label = inDef ? 'def' : inUse ? 'use' : inLiveIn && inLiveOut ? '●' : inLiveIn ? 'in' : inLiveOut ? 'out' : '';
                    const color = inDef ? 'var(--accent-blue)' : inUse ? 'var(--accent-emerald)' : inLiveIn || inLiveOut ? 'var(--accent-amber)' : 'var(--text-muted)';
                    return (
                      <td key={v} style={{ padding: '10px 12px', textAlign: 'center', color, fontWeight: label ? 600 : 400, fontSize: '0.72rem' }}>
                        {label || '·'}
                      </td>
                    );
                  })}
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: 'var(--accent-blue)', fontSize: '0.75rem' }}>
                    {'{' + [...block.liveIn].join(', ') + '}'}
                  </td>
                  <td style={{ padding: '10px 16px', fontFamily: 'monospace', color: 'var(--accent-purple)', fontSize: '0.75rem' }}>
                    {'{' + [...block.liveOut].join(', ') + '}'}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '0.72rem' }}>
        {[
          { label: 'def — defined in block', color: 'var(--accent-blue)' },
          { label: 'use — used before def', color: 'var(--accent-emerald)' },
          { label: '● — live in & out', color: 'var(--accent-amber)' },
          { label: 'in — only live-in', color: 'var(--accent-amber)' },
          { label: 'out — only live-out', color: 'var(--accent-amber)' },
        ].map(({ label, color }) => (
          <span key={label} style={{ color, fontWeight: 500 }}>{label}</span>
        ))}
      </div>
    </div>
  );
}
