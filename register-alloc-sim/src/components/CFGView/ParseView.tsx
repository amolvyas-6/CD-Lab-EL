import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/simulatorStore';
import type { TACInstruction } from '../../core/types';

const OP_COLORS: Record<string, string> = {
  label:        'var(--accent-cyan)',
  goto:         'var(--accent-amber)',
  if_goto:      'var(--accent-amber)',
  iffalse_goto: 'var(--accent-amber)',
  assign:       'var(--accent-emerald)',
  add:          'var(--accent-purple)',
  sub:          'var(--accent-purple)',
  mul:          'var(--accent-purple)',
  div:          'var(--accent-purple)',
  mod:          'var(--accent-purple)',
  lt:           'var(--accent-rose)',
  gt:           'var(--accent-rose)',
  eq:           'var(--accent-rose)',
  neq:          'var(--accent-rose)',
  param:        'var(--accent-blue)',
  call:         'var(--accent-blue)',
  return:       'var(--accent-amber)',
};

function getOpColor(op: string): string {
  return OP_COLORS[op] ?? 'var(--text-secondary)';
}

function InstrRow({ instr, index }: { instr: TACInstruction; index: number }) {
  const color = getOpColor(instr.op);
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 100px 1fr',
        alignItems: 'center',
        gap: 12,
        padding: '8px 14px',
        borderRadius: 'var(--radius-sm)',
        background: index % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent',
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.8rem',
      }}
    >
      {/* ID */}
      <span style={{ color: 'var(--text-muted)', textAlign: 'right' }}>
        {instr.id}
      </span>

      {/* Op badge */}
      <span
        style={{
          padding: '2px 8px',
          borderRadius: 'var(--radius-xl)',
          background: `${color}18`,
          color,
          fontSize: '0.68rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          textAlign: 'center',
        }}
      >
        {instr.op}
      </span>

      {/* Raw instruction */}
      <span style={{ color: 'var(--text-primary)' }}>{instr.raw}</span>
    </motion.div>
  );
}

export default function ParseView() {
  const { instructions } = useSimulatorStore();

  if (instructions.length === 0) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center' }}>
        No instructions parsed yet. Go back to Input and click "Compile &amp; Simulate".
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
      >
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Parse Results</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {instructions.length} instructions successfully parsed
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['label','assign','add/sub/mul/div','if_goto','goto','return'].map(op => (
            <span
              key={op}
              style={{
                padding: '3px 8px',
                borderRadius: 'var(--radius-xl)',
                background: `${getOpColor(op.split('/')[0])}18`,
                color: getOpColor(op.split('/')[0]),
                fontSize: '0.65rem',
                fontWeight: 600,
              }}
            >
              {op}
            </span>
          ))}
        </div>
      </motion.div>

      {/* Instruction Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '40px 100px 1fr',
            gap: 12,
            padding: '10px 14px',
            borderBottom: '1px solid var(--border-primary)',
            fontSize: '0.7rem',
            fontWeight: 600,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          <span style={{ textAlign: 'right' }}>#</span>
          <span>Operation</span>
          <span>Instruction</span>
        </div>

        <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
          {instructions.map((instr, i) => (
            <InstrRow key={instr.id} instr={instr} index={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
