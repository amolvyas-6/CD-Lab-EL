import { motion } from 'framer-motion';
import { useSimulatorStore } from '../../store/simulatorStore';
import { Download } from 'lucide-react';

const REG_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#f43f5e', '#06b6d4', '#ec4899', '#84cc16',
];

function downloadText(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function OutputView() {
  const { instructions, graphColoringResult, linearScanResult, algorithmChoice, registerCount } = useSimulatorStore();

  const gcAssign = graphColoringResult?.assignments ?? {};
  const gcSpills = new Set(graphColoringResult?.spills ?? []);
  const lsAssign = linearScanResult?.assignments ?? {};
  const lsSpills = new Set(linearScanResult?.spills ?? []);

  const showGC = algorithmChoice === 'graphColoring' || algorithmChoice === 'both';
  const showLS = algorithmChoice === 'linearScan' || algorithmChoice === 'both';

  const handleExport = () => {
    const lines: string[] = [
      '# Register Allocation Simulator — Output',
      `# k = ${registerCount} registers`,
      '',
      '# ─── Graph Coloring (Chaitin-Briggs) ───',
    ];
    for (const [v, r] of Object.entries(gcAssign)) {
      lines.push(`#   ${v.padEnd(12)} → R${r}`);
    }
    for (const v of gcSpills) {
      lines.push(`#   ${v.padEnd(12)} → SPILL`);
    }
    lines.push('', '# ─── Linear Scan (Poletto-Sarkar) ───');
    for (const [v, r] of Object.entries(lsAssign)) {
      lines.push(`#   ${v.padEnd(12)} → R${r}`);
    }
    for (const v of lsSpills) {
      lines.push(`#   ${v.padEnd(12)} → SPILL`);
    }
    lines.push('', '# ─── Annotated TAC ───');
    for (const instr of instructions) {
      const gcReg = instr.result ? gcAssign[instr.result] : undefined;
      const annotation = gcReg !== undefined ? `  # → R${gcReg}` : instr.result && gcSpills.has(instr.result) ? '  # → SPILL' : '';
      lines.push(`${instr.raw}${annotation}`);
    }
    downloadText(lines.join('\n'), 'register_allocation_output.txt');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Final Output</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            Annotated TAC with register assignments — k = {registerCount}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={handleExport}>
          <Download size={14} /> Export
        </button>
      </motion.div>

      {/* Annotated TAC */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '10px 16px', borderBottom: '1px solid var(--border-primary)',
          fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)',
          textTransform: 'uppercase', letterSpacing: '0.06em',
          display: 'flex', gap: 20,
        }}>
          <span style={{ flex: '0 0 28px', textAlign: 'right' }}>#</span>
          <span style={{ flex: 1 }}>Instruction</span>
          {showGC && <span style={{ flex: '0 0 100px', textAlign: 'center', color: '#8b5cf6' }}>Graph Coloring</span>}
          {showLS && <span style={{ flex: '0 0 100px', textAlign: 'center', color: '#3b82f6' }}>Linear Scan</span>}
        </div>
        <div style={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
          {instructions.map((instr, i) => {
            const gcReg = instr.result ? gcAssign[instr.result] : undefined;
            const gcIsSpill = instr.result ? gcSpills.has(instr.result) : false;
            const lsReg = instr.result ? lsAssign[instr.result] : undefined;
            const lsIsSpill = instr.result ? lsSpills.has(instr.result) : false;

            return (
              <motion.div
                key={instr.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 20,
                  padding: '7px 16px',
                  background: i % 2 === 0 ? 'var(--bg-tertiary)' : 'transparent',
                  borderBottom: '1px solid var(--border-primary)',
                }}
              >
                <span style={{ flex: '0 0 28px', textAlign: 'right', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{i}</span>
                <span style={{
                  flex: 1, fontFamily: 'monospace', fontSize: '0.8rem',
                  color: instr.op === 'label' ? 'var(--accent-cyan)' : 'var(--text-primary)',
                  fontWeight: instr.op === 'label' ? 600 : 400,
                }}>
                  {instr.raw}
                </span>
                {showGC && (
                  <span style={{
                    flex: '0 0 100px', textAlign: 'center', fontWeight: 700,
                    fontFamily: 'monospace', fontSize: '0.78rem',
                    color: gcIsSpill ? '#ef4444' : gcReg !== undefined ? REG_COLORS[gcReg % REG_COLORS.length] : 'var(--text-muted)',
                  }}>
                    {gcIsSpill ? '⚠ spill' : gcReg !== undefined ? `R${gcReg}` : '—'}
                  </span>
                )}
                {showLS && (
                  <span style={{
                    flex: '0 0 100px', textAlign: 'center', fontWeight: 700,
                    fontFamily: 'monospace', fontSize: '0.78rem',
                    color: lsIsSpill ? '#ef4444' : lsReg !== undefined ? REG_COLORS[lsReg % REG_COLORS.length] : 'var(--text-muted)',
                  }}>
                    {lsIsSpill ? '⚠ spill' : lsReg !== undefined ? `R${lsReg}` : '—'}
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
