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

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': '#191d29',
            'border-color': '#6c8dfa',
            'border-width': 1.5,
            'color': '#e8ecf4',
            'font-size': 9,
            'font-family': 'JetBrains Mono, monospace',
            'label': 'data(id)',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-wrap': 'wrap',
            'width': 80,
            'height': 40,
            'shape': 'round-rectangle',
          },
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#353d52',
            'target-arrow-color': '#353d52',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
          },
        },
        {
          selector: ':selected',
          style: { 'background-color': '#6c8dfa', 'color': 'white' },
        },
      ],
      layout: { name: 'breadthfirst', directed: true, spacingFactor: 1.4 } as cytoscape.LayoutOptions,
    });

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
