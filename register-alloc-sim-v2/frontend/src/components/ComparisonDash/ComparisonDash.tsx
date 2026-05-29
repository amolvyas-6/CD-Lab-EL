import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
} from 'recharts';
import type { AllocateResponse, AllocatorId, AllocatorResult } from '../../types';

const ALLOC_LABELS: Record<string, string> = {
  greedy:    'LLVM Greedy',
  fast:      'LLVM Fast',
  basic:     'LLVM Basic',
  custom_gc: 'Custom GC',
  custom_ls: 'Custom LinScan',
};

const ALLOC_COLORS: Record<string, string> = {
  greedy:    '#4f6ef7',
  fast:      '#16a34a',
  basic:     '#d97706',
  custom_gc: '#7c3aed',
  custom_ls: '#0891b2',
};

interface ComparisonDashProps {
  result: AllocateResponse;
  numRegisters: number;
}

function MetricCard({ id, name, data, best }: {
  id: string; name: string; data: AllocatorResult; best: string;
}) {
  const color = ALLOC_COLORS[id] ?? '#6c8dfa';
  const isBest = id === best;
  return (
    <div className={`alloc-card ${id}`}>
      <div className="alloc-card-name">
        <span style={{ width: 10, height: 10, borderRadius: '50%', background: color, display: 'inline-block' }} />
        {name}
        {isBest && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--green)', fontWeight: 700 }}>
            ★ Best
          </span>
        )}
      </div>
      <div className="metric-row">
        <span className="metric-label">Spills</span>
        <span className={`metric-value ${data.spillCount > 0 ? 'bad' : 'good'}`}>
          {data.spillCount < 0 ? '—' : data.spillCount}
        </span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Registers</span>
        <span className="metric-value">{data.registerCount || '—'}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Instructions</span>
        <span className="metric-value">{data.instructionCount || '—'}</span>
      </div>
      <div className="metric-row">
        <span className="metric-label">Spill Instructions</span>
        <span className="metric-value">{data.spillInstructions?.length ?? '—'}</span>
      </div>
    </div>
  );
}

export default function ComparisonDash({ result, numRegisters }: ComparisonDashProps) {
  const entries = Object.entries(result.results) as [string, AllocatorResult][];
  if (!entries.length) return (
    <div className="empty-state">
      <div className="empty-icon">⊞</div>
      <p>No allocation results yet.</p>
    </div>
  );

  // Best = fewest spills (then fewest registers)
  const bestId = entries.reduce<string>((best, [id, r]) => {
    const bData = result.results[best];
    if (r.spillCount < bData.spillCount) return id;
    if (r.spillCount === bData.spillCount && r.registerCount < bData.registerCount) return id;
    return best;
  }, entries[0][0]);

  // Chart data
  const spillData = entries.map(([id, r]) => ({
    name: ALLOC_LABELS[id] ?? id,
    Spills: Math.max(0, r.spillCount),
    color: ALLOC_COLORS[id] ?? '#6c8dfa',
  }));
  const regData = entries.map(([id, r]) => ({
    name: ALLOC_LABELS[id] ?? id,
    Registers: r.registerCount,
    color: ALLOC_COLORS[id] ?? '#6c8dfa',
  }));
  const instrData = entries.map(([id, r]) => ({
    name: ALLOC_LABELS[id] ?? id,
    Instructions: r.instructionCount || 0,
    color: ALLOC_COLORS[id] ?? '#6c8dfa',
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Info about k */}
      <div className="banner info">
        <span>ℹ</span>
        <div>
          <strong>Comparison Dashboard</strong> — Custom allocators use <strong>k = {numRegisters}</strong> registers.
          LLVM allocators use the target architecture's full register file (not limited by k).
          This is an apples-to-oranges comparison by design: LLVM serves as the production baseline.
        </div>
      </div>

      {/* Metric cards */}
      <div className="comparison-grid">
        {entries.map(([id, r]) => (
          <MetricCard
            key={id}
            id={id}
            name={ALLOC_LABELS[id] ?? id}
            data={r}
            best={bestId}
          />
        ))}
      </div>

      {/* Spill chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📊 Spill Count Comparison</span>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={spillData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4a5272' }} />
              <YAxis tick={{ fontSize: 11, fill: '#4a5272' }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Spills" radius={[4, 4, 0, 0]}>
                {spillData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Register chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📊 Register Usage Comparison</span>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={regData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4a5272' }} />
              <YAxis tick={{ fontSize: 11, fill: '#4a5272' }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Registers" radius={[4, 4, 0, 0]}>
                {regData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Instruction count chart */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">📊 Instruction Count (LLVM Only)</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Custom allocators don't produce assembly</span>
        </div>
        <div className="card-body">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={instrData.filter(d => d.Instructions > 0)} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#4a5272' }} />
              <YAxis tick={{ fontSize: 11, fill: '#4a5272' }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="Instructions" radius={[4, 4, 0, 0]}>
                {instrData.filter(d => d.Instructions > 0).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Explanation */}
      <div className="banner info">
        <span>ℹ</span>
        <div>
          <strong>What these results mean:</strong>&nbsp;
          <em>LLVM Greedy</em> = production-quality (Chaitin-style eviction heuristics).
          <em> LLVM Fast</em> = per-block linear scan, fastest compile time, more spills.
          <em> Custom GC</em> = Chaitin-Briggs implementation on the SSA interference graph (k={numRegisters}).
          <em> Custom LinScan</em> = Poletto-Sarkar on flattened live intervals (k={numRegisters}).
        </div>
      </div>
    </div>
  );
}
