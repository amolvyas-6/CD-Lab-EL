import { useEffect, useRef } from 'react';
import cytoscape from 'cytoscape';
import type { BasicBlock } from '../../types';

interface CFGViewProps {
  blocks: BasicBlock[];
}

export default function CFGView({ blocks }: CFGViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!containerRef.current || !blocks.length) return;
    if (cyRef.current) cyRef.current.destroy();

    const elements: cytoscape.ElementDefinition[] = [];
    for (const b of blocks) {
      elements.push({
        data: {
          id: b.label,
          label: `${b.label}\n${b.instructions.slice(0, 3).join('\n')}${b.instructions.length > 3 ? '\n…' : ''}`,
          liveIn: b.liveIn.join(', ') || '∅',
          liveOut: b.liveOut.join(', ') || '∅',
        },
      });
    }
    for (const b of blocks) {
      for (const s of b.successors) {
        elements.push({ data: { source: b.label, target: s, id: `${b.label}→${s}` } });
      }
    }

    try {
      cyRef.current = cytoscape({
        container: containerRef.current,
        elements,
        style: [
          {
            selector: 'node',
            style: {
              'background-color': '#ffffff',
              'border-color': '#4f6ef7',
              'border-width': 1.5,
              'color': '#1a1d2e',
              'font-size': 9,
              'font-family': 'JetBrains Mono, monospace',
              'label': 'data(id)',
              'text-valign': 'center',
              'text-halign': 'center',
              'text-wrap': 'wrap',
              'width': 90,
              'height': 44,
              'shape': 'round-rectangle',
            },
          },
          {
            selector: 'edge',
            style: {
              'width': 1.5,
              'line-color': '#c8cedf',
              'target-arrow-color': '#4f6ef7',
              'target-arrow-shape': 'triangle',
              'curve-style': 'bezier',
            },
          },
          {
            selector: ':selected',
            style: { 'background-color': '#4f6ef7', 'color': 'white' },
          },
        ],
        layout: { name: 'breadthfirst', directed: true, spacingFactor: 1.6, padding: 30 } as cytoscape.LayoutOptions,
        userZoomingEnabled: true,
        userPanningEnabled: true,
      });
    } catch (e) {
      console.warn('CFGView render error:', e);
    }

    return () => { cyRef.current?.destroy(); };
  }, [blocks]);

  if (!blocks.length) return (
    <div className="empty-state">
      <div className="empty-icon">◈</div>
      <p>No CFG data yet. Run the pipeline.</p>
    </div>
  );

  return (
    <div className="card">
      <div className="card-header">
        <span className="card-title">◈ Control Flow Graph
          <span className="tag tag-ssa">SSA</span>
        </span>
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{blocks.length} blocks</span>
      </div>
      <div ref={containerRef} className="graph-container" />
    </div>
  );
}
