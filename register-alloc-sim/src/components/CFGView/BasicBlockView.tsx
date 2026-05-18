import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/simulatorStore';
import type { BasicBlock } from '../../core/types';

const BLOCK_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#f43f5e', '#06b6d4', '#ec4899', '#84cc16',
];

function BlockCard({
  block,
  index,
}: {
  block: BasicBlock;
  index: number;
}) {
  const color = BLOCK_COLORS[index % BLOCK_COLORS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: 'easeOut' }}
      style={{
        background: 'var(--bg-card)',
        border: `1px solid ${color}35`,
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden',
        boxShadow: `0 0 20px ${color}10`,
      }}
    >
      {/* Block Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 16px',
          background: `${color}12`,
          borderBottom: `1px solid ${color}25`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background: color,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.7rem',
              fontWeight: 700,
              color: 'white',
            }}
          >
            B{index}
          </div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: '0.9rem' }}>
            {block.id}
          </span>
        </div>
        <span
          style={{
            fontSize: '0.65rem',
            color,
            background: `${color}15`,
            padding: '2px 8px',
            borderRadius: 100,
            fontWeight: 600,
          }}
        >
          {block.instructions.length} instr
        </span>
      </div>

      {/* Instructions */}
      <div style={{ padding: '8px 0' }}>
        {block.instructions.map((instr) => (
          <div
            key={instr.id}
            style={{
              padding: '4px 16px',
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: '0.78rem',
              color: instr.op === 'label' ? color : 'var(--text-secondary)',
              fontWeight: instr.op === 'label' ? 600 : 400,
            }}
          >
            {instr.raw}
          </div>
        ))}
      </div>

      {/* Use/Def Sets */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gap: 0,
          borderTop: `1px solid ${color}20`,
          fontSize: '0.68rem',
        }}
      >
        {[
          { label: 'use', set: block.use, color: 'var(--accent-emerald)' },
          { label: 'def', set: block.def, color: 'var(--accent-blue)' },
          { label: 'pred', set: new Set(block.predecessors), color: 'var(--accent-amber)' },
          { label: 'succ', set: new Set(block.successors), color: 'var(--accent-rose)' },
        ].map(({ label, set, color: c }) => (
          <div
            key={label}
            style={{
              padding: '6px 10px',
              borderRight: '1px solid var(--border-primary)',
            }}
          >
            <div style={{ color: 'var(--text-muted)', fontWeight: 600, marginBottom: 2 }}>
              {label}
            </div>
            <div style={{ color: c }}>
              {set.size > 0 ? [...set].join(', ') : '∅'}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function BasicBlockView() {
  const { cfg } = useSimulatorStore();

  if (!cfg) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center' }}>
        No CFG available. Run the simulation from the Input stage first.
      </div>
    );
  }

  const blocks = [...cfg.blocks.values()];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Basic Block Partitioning</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
          {blocks.length} basic blocks identified by leader detection algorithm
        </p>
      </motion.div>

      {/* Leader Detection Explanation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="card"
        style={{
          background: 'rgba(59, 130, 246, 0.06)',
          borderColor: 'rgba(59, 130, 246, 0.15)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.8,
        }}
      >
        <strong style={{ color: 'var(--accent-blue)' }}>Leader Detection Rules:</strong>
        <span style={{ marginLeft: 8 }}>
          (1) First instruction is always a leader &nbsp;|&nbsp;
          (2) Instruction after a branch is a leader &nbsp;|&nbsp;
          (3) Branch target labels are leaders
        </span>
      </motion.div>

      {/* Block Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        {blocks.map((block, i) => (
          <BlockCard key={block.id} block={block} index={i} />
        ))}
      </div>
    </div>
  );
}
