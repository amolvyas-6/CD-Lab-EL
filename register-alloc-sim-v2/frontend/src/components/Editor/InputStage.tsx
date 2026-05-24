import { useEffect } from 'react';
import MonacoEditor from '@monaco-editor/react';
import { useSimulatorStore } from '../../store/simulatorStore';
import type { AllocatorId } from '../../types';

const ALLOCATOR_META: Record<AllocatorId, { label: string; cls: string; dot: string }> = {
  greedy:    { label: 'LLVM Greedy',    cls: 'greedy',    dot: '#6c8dfa' },
  fast:      { label: 'LLVM Fast',      cls: 'fast',      dot: '#4ade80' },
  basic:     { label: 'LLVM Basic',     cls: 'basic',     dot: '#fbbf24' },
  custom_gc: { label: 'Custom GC',      cls: 'custom_gc', dot: '#a78bfa' },
  custom_ls: { label: 'Custom LinScan', cls: 'custom_ls', dot: '#22d3ee' },
};

const VISIBLE_ALLOCS: AllocatorId[] = ['greedy', 'fast', 'custom_gc', 'custom_ls'];

export default function InputStage() {
  const {
    source, setSource,
    language, setLanguage,
    optimization, setOptimization,
    numRegisters, setNumRegisters,
    selectedAllocators, toggleAllocator,
    presets, loadPresets, applyPreset,
    runPipeline, isLoading, error, clearError,
  } = useSimulatorStore();

  useEffect(() => { loadPresets(); }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Error banner */}
      {error && (
        <div className="banner error">
          <span>⚠</span>
          <div>
            <strong>Compilation error</strong>
            <pre style={{ marginTop: 6, fontSize: 12, whiteSpace: 'pre-wrap', fontFamily: 'var(--font-mono)' }}>
              {error}
            </pre>
          </div>
          <button
            className="btn btn-ghost btn-sm btn-icon"
            onClick={clearError}
            style={{ marginLeft: 'auto', flexShrink: 0 }}
          >✕</button>
        </div>
      )}

      {/* Presets */}
      {presets.length > 0 && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">📂 Preset Programs</span>
          </div>
          <div className="card-body">
            <div className="preset-grid">
              {presets.map((p) => (
                <button key={p.id} className="preset-btn" onClick={() => applyPreset(p)}>
                  <div className="preset-name">{p.name}</div>
                  <div className="preset-desc">{p.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Editor */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            ✎ C/C++ Source Editor
            <span className="tag tag-llvm">Clang</span>
          </span>
          <div className="control-row">
            <span className="label">Language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value as 'c' | 'cpp')}>
              <option value="c">C</option>
              <option value="cpp">C++</option>
            </select>
            <span className="label">Opt</span>
            <select value={optimization} onChange={(e) => setOptimization(e.target.value as 'O0' | 'O1')}>
              <option value="O0">-O0 (no opt)</option>
              <option value="O1">-O1</option>
            </select>
          </div>
        </div>
        <MonacoEditor
          height="340px"
          language={language === 'cpp' ? 'cpp' : 'c'}
          value={source}
          onChange={(v) => setSource(v ?? '')}
          theme="vs-dark"
          options={{
            fontSize: 13,
            fontFamily: 'JetBrains Mono, Fira Code, monospace',
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            lineNumbers: 'on',
            renderLineHighlight: 'line',
            padding: { top: 12, bottom: 12 },
          }}
        />
      </div>

      {/* Allocator config */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">⚙ Allocator Configuration</span>
        </div>
        <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="control-row">
            <span className="label">Allocators to run</span>
            <div className="allocator-chips">
              {VISIBLE_ALLOCS.map((id) => {
                const meta = ALLOCATOR_META[id];
                const active = selectedAllocators.includes(id);
                return (
                  <div
                    key={id}
                    className={`chip ${active ? `active-${meta.cls}` : ''}`}
                    onClick={() => toggleAllocator(id)}
                  >
                    <span className="chip-dot" style={{ background: active ? meta.dot : '#525c70' }} />
                    {meta.label}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="control-row">
            <span className="label">Custom k =</span>
            <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', minWidth: 20 }}>
              {numRegisters}
            </strong>
            <input
              type="range" min={2} max={16} value={numRegisters}
              onChange={(e) => setNumRegisters(+e.target.value)}
              style={{ width: 140 }}
            />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              registers for custom algorithms
            </span>
          </div>
        </div>
      </div>

      {/* Run button */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          className="btn btn-primary"
          onClick={runPipeline}
          disabled={isLoading || !source.trim()}
          style={{ padding: '10px 28px', fontSize: 14 }}
        >
          {isLoading ? (
            <><div className="spinner" /> Running…</>
          ) : (
            '▶ Run Pipeline'
          )}
        </button>
      </div>
    </div>
  );
}
