/**
 * Assembly viewer component.
 *
 * Handles two kinds of "assembly":
 *  1. Real x86/AArch64 assembly from LLVM llc  (for greedy / fast)
 *  2. Custom pseudo-assembly from graph-coloring / linear-scan backends
 *     which uses lines like:  %var_name   →  r3
 */

// ── Custom pseudo-assembly renderer ──────────────────────────────────────────

function renderCustomAsm(asm: string): string {
  return asm
    .split('\n')
    .map((line) => {
      const esc = line
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      const t = line.trim();
      if (!t) return '';
      // Comment lines
      if (t.startsWith('#')) {
        return `<span class="asm-cmt">${esc}</span>`;
      }
      // Variable → register mapping lines
      if (t.includes('→')) {
        const [left, right] = t.split('→');
        const leftEsc = (left ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
        const rightEsc = (right ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').trim();
        const isSpill = rightEsc.includes('spilled') || rightEsc.includes('memory');
        const valColor = isSpill ? 'var(--red)' : 'var(--cyan)';
        const regColor = isSpill ? 'var(--red)' : 'var(--green)';
        return (
          `<span style="color:${valColor};font-family:var(--font-mono)">${leftEsc}</span>` +
          `<span style="color:var(--text-muted)"> → </span>` +
          `<span style="color:${regColor};font-weight:600">${rightEsc}</span>`
        );
      }
      // Section headers (e.g. "# Register assignments:")
      return `<span style="color:var(--text-secondary)">${esc}</span>`;
    })
    .join('\n');
}

// ── Real assembly syntax highlighter ─────────────────────────────────────────

function highlightAsm(asm: string, spills: string[]): string {
  const spillSet = new Set(spills.map((s) => s.trim()));
  return asm
    .split('\n')
    .map((line) => {
      const esc = line
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const stripped = line.trim();
      if (!stripped) return esc;
      // Comment
      if (stripped.startsWith('#') || stripped.startsWith('//'))
        return `<span class="asm-cmt">${esc}</span>`;
      // Directive
      if (stripped.startsWith('.'))
        return `<span class="asm-dir">${esc}</span>`;
      // Label
      if (stripped.endsWith(':'))
        return `<span class="asm-label">${esc}</span>`;
      // Spill instruction (exact match)
      if (spillSet.has(stripped))
        return `<span class="asm-spill">${esc}  <span class="asm-cmt">← spill</span></span>`;

      // Highlight physical registers only (x86: %rax/%eax/etc, ARM: w0/x0/etc)
      // We intentionally do NOT match %ssa_value style references here
      const withRegs = esc.replace(
        /\b(%(?:r(?:ax|bx|cx|dx|si|di|sp|bp|8|9|10|11|12|13|14|15)|e(?:ax|bx|cx|dx|si|di|sp|bp)|[a-z]{2,3}[lh]?|xmm\d+|ymm\d+)|[wx]\d{1,2}|v\d+\.\d+[a-z]|sp|lr|fp|xzr|wzr)\b/g,
        '<span class="asm-reg">$1</span>',
      );

      // First token = instruction mnemonic (only if it doesn't start with <)
      if (!withRegs.trimStart().startsWith('<')) {
        return withRegs.replace(/^(\s*)(\S+)/, (_m, ws, instr) =>
          `${ws}<span class="asm-instr">${instr}</span>`,
        );
      }
      return withRegs;
    })
    .join('\n');
}

// ── Component ─────────────────────────────────────────────────────────────────

interface AssemblyViewerProps {
  allocatorName: string;
  assembly: string;
  spillInstructions: string[];
  color: string;
}

export default function AssemblyViewer({
  allocatorName, assembly, spillInstructions, color,
}: AssemblyViewerProps) {
  if (!assembly) return null;

  // Detect custom pseudo-assembly: starts with "# Chaitin" or "# Linear"
  const isCustom = assembly.trimStart().startsWith('#');
  const rendered = isCustom
    ? renderCustomAsm(assembly)
    : highlightAsm(assembly, spillInstructions);

  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="card-header">
        <span className="card-title">
          ⌨ Assembly — {allocatorName}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {isCustom
            ? 'pseudo-assembly (register map)'
            : `${spillInstructions.length} spill${spillInstructions.length !== 1 ? 's' : ''}`}
        </span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div
          className="asm-viewer"
          style={{ borderRadius: 0, border: 'none' }}
          dangerouslySetInnerHTML={{ __html: rendered }}
        />
      </div>
    </div>
  );
}
