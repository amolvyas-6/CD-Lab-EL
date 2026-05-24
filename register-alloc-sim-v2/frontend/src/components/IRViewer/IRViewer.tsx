interface IRViewerProps {
  title: string;
  ir: string;
  tag?: React.ReactNode;
  maxHeight?: string;
}

// Very lightweight syntax-highlight for LLVM IR
function highlightIR(ir: string): string {
  return ir
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    // Comments
    .replace(/(;.*)/g, '<span class="cmt">$1</span>')
    // Keywords
    .replace(/\b(define|declare|ret|br|label|entry|phi|i32|i64|i1|i8|i16|void|ptr|alloca|load|store|add|sub|mul|sdiv|srem|icmp|ne|eq|slt|sgt|sle|sge|call|getelementptr|bitcast|zext|sext|trunc)\b/g,
      '<span class="kw">$1</span>')
    // Function names @xxx
    .replace(/(@[\w.]+)/g, '<span class="fn">$1</span>')
    // SSA values %xxx
    .replace(/((?<!@)%[\w.]+)/g, '<span class="val">$1</span>')
    // Numbers (standalone)
    .replace(/\b(\d+)\b/g, '<span class="num">$1</span>');
}

export default function IRViewer({ title, ir, tag, maxHeight = '420px' }: IRViewerProps) {
  if (!ir) return (
    <div className="empty-state">
      <div className="empty-icon">⬡</div>
      <p>No IR available yet. Run the pipeline first.</p>
    </div>
  );
  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">{title} {tag}</span>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => navigator.clipboard.writeText(ir)}
        >📋 Copy</button>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div
          className="ir-viewer"
          style={{ maxHeight, borderRadius: 0, border: 'none' }}
          dangerouslySetInnerHTML={{ __html: highlightIR(ir) }}
        />
      </div>
    </div>
  );
}
