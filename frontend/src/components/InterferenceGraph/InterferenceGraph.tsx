import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { InterferenceGraph as IGType } from '../../types';

function strHue(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

interface InterferenceGraphProps {
  graph: IGType;
}

const NODE_STYLE: cytoscape.Css.Node = {
  'background-color': '#eaedff',
  'border-width': 2,
  'border-color': '#4f6ef7',
  'color': '#1a1d2e',
  'font-size': 10,
  'font-family': 'JetBrains Mono, monospace',
  'label': 'data(label)',
  'text-valign': 'center',
  'text-halign': 'center',
  'width': 70,
  'height': 34,
  'shape': 'ellipse',
};

const EDGE_STYLE: cytoscape.Css.Edge = {
  'width': 1.5,
  'line-color': '#c8cedf',
  'curve-style': 'straight',
};

export default function InterferenceGraph({ graph }: InterferenceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [cyError, setCyError] = useState<string | null>(null);

  useEffect(() => {
    if (!graph.nodes.length) return;

    let rafId: number;

    const initCy = () => {
      const container = containerRef.current;
      if (!container) return;

      // Wait until container has actual pixel dimensions
      const { width, height } = container.getBoundingClientRect();
      if (width === 0 || height === 0) {
        rafId = requestAnimationFrame(initCy);
        return;
      }

      // Destroy old instance
      if (cyRef.current) {
        try { cyRef.current.destroy(); } catch { /* ignore */ }
        cyRef.current = null;
      }
      setCyError(null);

      try {
        const elements: cytoscape.ElementDefinition[] = [
          ...graph.nodes.map((n) => ({ data: { id: n, label: n } })),
          ...graph.edges
            // Only include edges where BOTH endpoints exist as nodes
            .filter(([u, v]) => graph.nodes.includes(u) && graph.nodes.includes(v))
            .map(([u, v]) => ({ data: { id: `${u}--${v}`, source: u, target: v } })),
        ];

        const cy = cytoscape({
          container,
          elements,
          style: [
            { selector: 'node', style: NODE_STYLE },
            { selector: 'edge', style: EDGE_STYLE },
          ],
          layout: {
            name: 'circle',
            animate: false,
            padding: 40,
          } as cytoscape.LayoutOptions,
          userZoomingEnabled: true,
          userPanningEnabled: true,
          boxSelectionEnabled: false,
          minZoom: 0.3,
          maxZoom: 3,
        });
        cyRef.current = cy;

        // Apply per-node hue colouring
        graph.nodes.forEach((n) => {
          const hue = strHue(n);
          try {
            cy.getElementById(n).style({
              'background-color': `hsl(${hue}, 60%, 93%)`,
              'border-color': `hsl(${hue}, 65%, 42%)`,
              'color': `hsl(${hue}, 65%, 28%)`,
            });
          } catch { /* ignore */ }
        });

      } catch (e) {
        console.warn('Cytoscape error:', e);
        setCyError(String(e));
      }
    };

    rafId = requestAnimationFrame(initCy);

    return () => {
      cancelAnimationFrame(rafId);
      try { cyRef.current?.destroy(); } catch { /* ignore */ }
      cyRef.current = null;
    };
  }, [graph]);

  if (!graph.nodes.length) return (
    <div className="empty-state">
      <div className="empty-icon">⬡</div>
      <p>No interference graph data yet.</p>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">⬡ Interference Graph</span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {graph.nodes.length} vars · {graph.edges.length} edges
        </span>
      </div>
      {cyError ? (
        <div className="card-body">
          <div className="banner warning" style={{ marginBottom: 14 }}>
            ⚠ Graph renderer unavailable — text fallback below.
          </div>
          <InterferenceText graph={graph} />
        </div>
      ) : (
        <div ref={containerRef} className="graph-container" />
      )}
    </div>
  );
}

function InterferenceText({ graph }: { graph: IGType }) {
  return (
    <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
        <strong style={{ color: 'var(--text-primary)' }}>Variables:</strong>
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {graph.nodes.map((n) => <span key={n} className="live-chip in">{n}</span>)}
      </div>
      <p style={{ color: 'var(--text-muted)', marginBottom: 8 }}>
        <strong style={{ color: 'var(--text-primary)' }}>Interference edges:</strong>
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: 4 }}>
        {graph.edges.map(([u, v]) => (
          <div key={`${u}--${v}`} style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--accent)' }}>{u}</span>
            <span style={{ margin: '0 4px', color: 'var(--text-muted)' }}>⟷</span>
            <span style={{ color: 'var(--purple)' }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
