import type { BasicBlock } from '../../types';

interface LivenessMatrixProps {
  blocks: BasicBlock[];
  matrix: Record<string, { liveIn: string[]; liveOut: string[] }>;
}

export default function LivenessMatrix({ blocks, matrix }: LivenessMatrixProps) {
  if (!blocks.length) return (
    <div className="empty-state">
      <div className="empty-icon">📊</div>
      <p>No liveness data yet.</p>
    </div>
  );

  // Collect all SSA values that appear in any set
  const allVars = new Set<string>();
  for (const b of blocks) {
    b.liveIn.forEach((v) => allVars.add(v));
    b.liveOut.forEach((v) => allVars.add(v));
  }
  const vars = [...allVars].sort();

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">📊 Liveness Analysis</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {blocks.length} blocks · {vars.length} SSA values
        </span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="liveness-table-wrap">
          <table className="liveness-table">
            <thead>
              <tr>
                <th>Block</th>
                <th>Instructions</th>
                <th>Live-In</th>
                <th>Live-Out</th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((b) => (
                <tr key={b.id}>
                  <td>
                    <code style={{ color: 'var(--amber)', fontSize: 12 }}>{b.label}</code>
                  </td>
                  <td style={{ maxWidth: 280 }}>
                    {b.instructions.slice(0, 4).map((ins, i) => (
                      <div key={i} style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {ins.length > 50 ? ins.slice(0, 50) + '…' : ins}
                      </div>
                    ))}
                    {b.instructions.length > 4 && (
                      <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>+{b.instructions.length - 4} more</div>
                    )}
                  </td>
                  <td>
                    {(matrix[b.label]?.liveIn ?? b.liveIn).length === 0
                      ? <span style={{ color: 'var(--text-muted)' }}>∅</span>
                      : (matrix[b.label]?.liveIn ?? b.liveIn).map((v) => (
                          <span key={v} className="live-chip in">{v}</span>
                        ))}
                  </td>
                  <td>
                    {(matrix[b.label]?.liveOut ?? b.liveOut).length === 0
                      ? <span style={{ color: 'var(--text-muted)' }}>∅</span>
                      : (matrix[b.label]?.liveOut ?? b.liveOut).map((v) => (
                          <span key={v} className="live-chip out">{v}</span>
                        ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
