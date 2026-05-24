// Syntax-highlight x86/AArch64 assembly
function highlightAsm(asm: string, spills: string[]): string {
  const spillSet = new Set(spills.map((s) => s.trim()));
  return asm
    .split('\n')
    .map((line) => {
      const esc = line
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      const stripped = line.trim();
      if (!stripped) return esc;
      if (stripped.startsWith('#') || stripped.startsWith('//'))
        return `<span class="asm-cmt">${esc}</span>`;
      if (stripped.startsWith('.'))
        return `<span class="asm-dir">${esc}</span>`;
      if (stripped.endsWith(':'))
        return `<span class="asm-label">${esc}</span>`;
      if (spillSet.has(stripped))
        return `<span class="asm-spill">${esc}  <span class="asm-cmt">← spill</span></span>`;
      // Highlight registers
      const withRegs = esc.replace(
        /(%[a-z]{2,4}\d{0,2}|[wx]\d{1,2}|[xq]\d{1,2}|sp|lr|fp)/g,
        '<span class="asm-reg">$1</span>',
      );
      // First token = instruction mnemonic
      return withRegs.replace(/^\s*(\S+)/, (m, instr) =>
        m.replace(instr, `<span class="asm-instr">${instr}</span>`),
      );
    })
    .join('\n');
}

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

  return (
    <div className="card" style={{ borderTop: `3px solid ${color}` }}>
      <div className="card-header">
        <span className="card-title">
          ⌨ Assembly — {allocatorName}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {spillInstructions.length} spill{spillInstructions.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div
          className="asm-viewer"
          style={{ borderRadius: 0, border: 'none' }}
          dangerouslySetInnerHTML={{ __html: highlightAsm(assembly, spillInstructions) }}
        />
      </div>
    </div>
  );
}
