import { useState } from 'react';
import type { AllocatorResult, AlgorithmStep } from '../../types';

const ALLOC_LABELS: Record<string, string> = {
  greedy:    'LLVM Greedy',
  fast:      'LLVM Fast',
  basic:     'LLVM Basic',
  custom_gc: 'Custom Graph Coloring',
  custom_ls: 'Custom Linear Scan',
};

const ALLOC_COLORS: Record<string, string> = {
  greedy:    '#4f6ef7',
  fast:      '#16a34a',
  basic:     '#d97706',
  custom_gc: '#7c3aed',
  custom_ls: '#0891b2',
};

const PHASE_ICONS: Record<string, string> = {
  Build:              '🔨',
  Simplify:           '📉',
  Spill:              '💥',
  'Spill (Actual)':   '🔴',
  Select:             '🎨',
};

interface AllocationDetailProps {
  allocatorId: string;
  result: AllocatorResult;
  numRegisters: number;
}

function RegisterMapTable({ registerMap, allocatorId }: { registerMap: Record<string, string>; allocatorId: string }) {
  const entries = Object.entries(registerMap);
  if (!entries.length) return null;

  const assigned = entries.filter(([_, v]) => v !== 'spilled');
  const spilled = entries.filter(([_, v]) => v === 'spilled');

  return (
    <div className="card" style={{ borderLeft: `3px solid ${ALLOC_COLORS[allocatorId] ?? '#6c8dfa'}` }}>
      <div className="card-header">
        <span className="card-title">
          📋 Register Map — {ALLOC_LABELS[allocatorId] ?? allocatorId}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {assigned.length} assigned · {spilled.length} spilled
        </span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="liveness-table-wrap" style={{ maxHeight: 260 }}>
          <table className="liveness-table">
            <thead>
              <tr>
                <th>Variable</th>
                <th>Register</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {assigned.map(([v, r]) => (
                <tr key={v}>
                  <td><code style={{ color: 'var(--cyan)', fontSize: 12 }}>{v}</code></td>
                  <td><code style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700 }}>{r}</code></td>
                  <td><span className="live-chip in">assigned</span></td>
                </tr>
              ))}
              {spilled.map(([v]) => (
                <tr key={v}>
                  <td><code style={{ color: 'var(--red)', fontSize: 12 }}>{v}</code></td>
                  <td><code style={{ color: 'var(--red)', fontSize: 12 }}>—</code></td>
                  <td><span className="live-chip" style={{ background: '#dc262612', color: 'var(--red)' }}>spilled</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StepTimeline({ steps, allocatorId }: { steps: AlgorithmStep[]; allocatorId: string }) {
  const [expanded, setExpanded] = useState(false);
  const displaySteps = expanded ? steps : steps.slice(0, 12);
  const color = ALLOC_COLORS[allocatorId] ?? '#6c8dfa';

  return (
    <div className="card" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="card-header">
        <span className="card-title">
          🔬 Algorithm Steps — {ALLOC_LABELS[allocatorId] ?? allocatorId}
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {steps.length} steps
        </span>
      </div>
      <div className="card-body" style={{ padding: 0 }}>
        <div className="step-timeline">
          {displaySteps.map((step, i) => {
            const phase = step.phase ?? '';
            const icon = PHASE_ICONS[phase] ?? '•';
            const isSpill = phase.toLowerCase().includes('spill');
            return (
              <div key={i} className={`step-item ${isSpill ? 'step-spill' : ''}`}>
                <div className="step-icon">{icon}</div>
                <div className="step-content">
                  <div className="step-phase">{phase || `Step ${i + 1}`}</div>
                  <div className="step-desc">{step.description}</div>
                  {step.stackState && step.stackState.length > 0 && (
                    <div className="step-meta">
                      Stack: [{step.stackState.join(', ')}]
                    </div>
                  )}
                  {step.activeList && step.activeList.length > 0 && (
                    <div className="step-meta">
                      Active: [{step.activeList.join(', ')}]
                    </div>
                  )}
                  {step.node && (
                    <div className="step-meta">
                      Node: <code style={{ color: 'var(--accent)' }}>{step.node}</code>
                      {step.register && <> → <code style={{ color: 'var(--green)' }}>{step.register}</code></>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        {steps.length > 12 && (
          <div style={{ padding: '10px 18px', textAlign: 'center' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? '▲ Show Less' : `▼ Show All ${steps.length} Steps`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AllocationDetail({ allocatorId, result, numRegisters }: AllocationDetailProps) {
  const hasSteps = result.steps && result.steps.length > 0;
  const hasRegMap = result.registerMap && Object.keys(result.registerMap).length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Summary banner */}
      <div className="alloc-summary-banner" style={{
        background: `${ALLOC_COLORS[allocatorId] ?? '#6c8dfa'}12`,
        border: `1px solid ${ALLOC_COLORS[allocatorId] ?? '#6c8dfa'}40`,
        borderRadius: 'var(--radius)',
        padding: '12px 16px',
        display: 'flex',
        gap: 24,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: ALLOC_COLORS[allocatorId] }}>
          {ALLOC_LABELS[allocatorId] ?? allocatorId}
        </span>
        <div style={{ display: 'flex', gap: 20, fontSize: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>
            Spills: <strong style={{ color: result.spillCount > 0 ? 'var(--red)' : 'var(--green)' }}>
              {result.spillCount}
            </strong>
          </span>
          <span style={{ color: 'var(--text-secondary)' }}>
            Registers used: <strong style={{ color: 'var(--text-primary)' }}>{result.registerCount}</strong>
          </span>
          {allocatorId.startsWith('custom') && (
            <span style={{ color: 'var(--text-secondary)' }}>
              k = <strong style={{ color: 'var(--accent)' }}>{numRegisters}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Register map */}
      {hasRegMap && <RegisterMapTable registerMap={result.registerMap} allocatorId={allocatorId} />}

      {/* Algorithm steps */}
      {hasSteps && <StepTimeline steps={result.steps} allocatorId={allocatorId} />}
    </div>
  );
}
