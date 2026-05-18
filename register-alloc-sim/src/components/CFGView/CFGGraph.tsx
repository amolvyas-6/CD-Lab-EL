import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import cytoscape from 'cytoscape';
import { useSimulatorStore } from '../../store/simulatorStore';

const BLOCK_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#f43f5e', '#06b6d4', '#ec4899', '#84cc16',
];

export default function CFGGraph() {
  const { cfg, theme } = useSimulatorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!cfg || !containerRef.current) return;

    const blocks = [...cfg.blocks.values()];
    const colorMap = new Map<string, string>();
    blocks.forEach((b, i) => colorMap.set(b.id, BLOCK_COLORS[i % BLOCK_COLORS.length]));

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#12122a' : '#f8f9fc';
    const textColor = isDark ? '#e8e8f0' : '#1a1a2e';
    const edgeColor = isDark ? '#3a3a65' : '#c0c0d8';
    const nodeBorder = isDark ? '#2a2a55' : '#d0d0e0';

    // Destroy previous instance
    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elements: cytoscape.ElementDefinition[] = [];

    // Nodes
    for (const block of blocks) {
      const instrText = block.instructions
        .map((i) => i.raw)
        .join('\n');
      elements.push({
        group: 'nodes',
        data: {
          id: block.id,
          label: block.id,
          instructions: instrText,
          color: colorMap.get(block.id) ?? '#8b5cf6',
          isEntry: block.id === cfg.entry,
          isExit: block.predecessors.length > 0 && block.successors.length === 0,
        },
      });
    }

    // Edges
    const addedEdges = new Set<string>();
    for (const block of blocks) {
      for (const succ of block.successors) {
        const edgeId = `${block.id}-->${succ}`;
        if (!addedEdges.has(edgeId) && cfg.blocks.has(succ)) {
          addedEdges.add(edgeId);
          elements.push({
            group: 'edges',
            data: {
              id: edgeId,
              source: block.id,
              target: succ,
            },
          });
        }
      }
    }

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => ele.data('color') + '22',
            'border-color': (ele) => ele.data('color'),
            'border-width': 2,
            'label': (ele) => ele.data('label'),
            'color': textColor,
            'text-valign': 'center',
            'text-halign': 'center',
            'font-family': 'Inter, sans-serif',
            'font-size': '13px',
            'font-weight': '600',
            'width': 110,
            'height': 50,
            'shape': (ele) => ele.data('isEntry') ? 'roundrectangle' : 'roundrectangle',
            'text-outline-width': 0,
          } as cytoscape.Css.Node,
        },
        {
          selector: 'node[?isEntry]',
          style: {
            'border-style': 'solid',
            'border-width': 3,
          } as cytoscape.Css.Node,
        },
        {
          selector: 'edge',
          style: {
            'width': 2,
            'line-color': edgeColor,
            'target-arrow-color': edgeColor,
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'arrow-scale': 1.2,
          } as cytoscape.Css.Edge,
        },
        {
          selector: ':selected',
          style: {
            'border-width': 3,
            'border-color': '#fff',
          } as cytoscape.Css.Node,
        },
      ],
      layout: {
        name: 'breadthfirst',
        directed: true,
        padding: 40,
        spacingFactor: 1.5,
        avoidOverlap: true,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
      boxSelectionEnabled: false,
      backgroundColor: bgColor,
    });

    // Tooltip on hover
    cyRef.current.on('mouseover', 'node', (evt) => {
      const node = evt.target;
      node.style('border-width', 3);
    });
    cyRef.current.on('mouseout', 'node', (evt) => {
      const node = evt.target;
      node.style('border-width', node.data('isEntry') ? 3 : 2);
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [cfg, theme]);

  if (!cfg) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center' }}>
        No CFG available. Run the simulation from the Input stage first.
      </div>
    );
  }

  const blocks = [...cfg.blocks.values()];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}
      >
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Control Flow Graph</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {blocks.length} nodes, {blocks.reduce((acc, b) => acc + b.successors.length, 0)} edges
          </p>
        </div>
        <div style={{ display: 'flex', gap: 12, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <span>🖱️ Drag to pan &nbsp;|&nbsp; Scroll to zoom</span>
          <span
            style={{
              background: 'rgba(139,92,246,0.12)',
              color: 'var(--accent-purple)',
              padding: '2px 8px',
              borderRadius: 100,
              fontWeight: 600,
              fontSize: '0.65rem',
            }}
          >
            Entry: {cfg.entry}
          </span>
        </div>
      </motion.div>

      {/* Graph Canvas */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{ flex: 1, minHeight: 0 }}
      >
        <div
          className="card"
          style={{ height: '100%', padding: 0, overflow: 'hidden', position: 'relative' }}
        >
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </motion.div>

      {/* Block Legend */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ display: 'flex', flexWrap: 'wrap', gap: 8, flexShrink: 0 }}
      >
        {blocks.map((block, i) => (
          <div
            key={block.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 100,
              background: `${BLOCK_COLORS[i % BLOCK_COLORS.length]}15`,
              border: `1px solid ${BLOCK_COLORS[i % BLOCK_COLORS.length]}30`,
              fontSize: '0.72rem',
              color: BLOCK_COLORS[i % BLOCK_COLORS.length],
              fontWeight: 500,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: BLOCK_COLORS[i % BLOCK_COLORS.length],
              }}
            />
            {block.id}
            {block.id === cfg.entry && (
              <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>(entry)</span>
            )}
          </div>
        ))}
      </motion.div>
    </div>
  );
}
