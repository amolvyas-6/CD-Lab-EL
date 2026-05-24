import { useEffect, useRef, useState } from 'react';
import cytoscape from 'cytoscape';
import type { InterferenceGraph as IGType } from '../../types';

// Generate a hue from a string for consistent node colouring
function strHue(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) % 360;
  return h;
}

interface InterferenceGraphProps {
  graph: IGType;
}

export default function InterferenceGraph({ graph }: InterferenceGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);
  const [cyError, setCyError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !graph.nodes.length) return;
    if (cyRef.current) { cyRef.current.destroy(); cyRef.current = null; }
    setCyError(null);

    const elements: cytoscape.ElementDefinition[] = [
      ...graph.nodes.map((n) => ({
        data: { id: n, label: n },
      })),
      ...graph.edges.map(([u, v]) => ({
        data: { id: `${u}--${v}`, source: u, target: v },
      })),
    ];

    try {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#1f2433',
              'border-width': 2,
              'color': '#e8ecf4',
              'font-size': 9,
              'font-family': 'JetBrains Mono, monospace',
              'label': 'data(label)',
              'text-valign': 'center',
              'text-halign': 'center',
              'width': 60,
              'height': 30,
              'shape': 'ellipse',
            },
          },
          {
            selector: 'edge',
            style: {
              'width': 1.5,
              'line-color': '#353d52',
              'curve-style': 'straight',
            },
          },
        ],
        layout: { name: 'grid', animate: false } as cytoscape.LayoutOptions,
      });

      // Apply per-node colours after creation (avoids type errors)
      graph.nodes.forEach((n) => {
        const hue = strHue(n);
        cyRef.current?.getElementById(n).style({
          'background-color': `hsl(${hue}, 55%, 28%)`,
          'border-color': `hsl(${hue}, 75%, 52%)`,
        });
      });

      // Run cose layout after initial render
      cyRef.current.layout({ name: 'cose', animate: false } as cytoscape.LayoutOptions).run();
    } catch (e) {
      setCyError(String(e));
    }

    return () => { cyRef.current?.destroy(); cyRef.current = null; };
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
          <div className="banner warning" style={{ marginBottom: 12 }}>
            ⚠ Graph renderer unavailable — showing text summary.
          </div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>Nodes:</strong>{' '}
            {graph.nodes.join(', ')}
            <br /><br />
            <strong style={{ color: 'var(--text-primary)' }}>Interference edges:</strong>
            {graph.edges.map(([u, v]) => (
              <div key={`${u}--${v}`}>
                <span style={{ color: 'var(--accent)' }}>{u}</span>
                {' — '}
                <span style={{ color: 'var(--purple)' }}>{v}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div ref={containerRef} className="graph-container" />
      )}
    </div>
  );
}
