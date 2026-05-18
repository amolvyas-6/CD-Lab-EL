import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import cytoscape from 'cytoscape';
import { useSimulatorStore } from '../../store/simulatorStore';

const REG_COLORS = [
  '#8b5cf6', '#3b82f6', '#10b981', '#f59e0b',
  '#f43f5e', '#06b6d4', '#ec4899', '#84cc16',
];
const SPILL_COLOR = '#ef4444';

export default function InterferenceGraphView() {
  const { interferenceGraph, graphColoringResult, theme } = useSimulatorStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!interferenceGraph || !containerRef.current) return;

    const isDark = theme === 'dark';
    const textColor = isDark ? '#e8e8f0' : '#1a1a2e';
    const edgeColor = isDark ? '#3a3a65' : '#c0c0d8';

    if (cyRef.current) cyRef.current.destroy();

    const elements: cytoscape.ElementDefinition[] = [];
    const assignments = graphColoringResult?.assignments ?? {};
    const spills = new Set(graphColoringResult?.spills ?? []);

    // Nodes
    for (const [varName, nodeData] of interferenceGraph.nodes) {
      const isSpilled = spills.has(varName);
      const regColor = isSpilled
        ? SPILL_COLOR
        : nodeData.color !== undefined
        ? REG_COLORS[nodeData.color % REG_COLORS.length]
        : '#6b7280';

      elements.push({
        group: 'nodes',
        data: {
          id: varName,
          label: varName,
          color: regColor,
          isSpilled,
          register: assignments[varName] !== undefined ? `R${assignments[varName]}` : 'spill',
          degree: nodeData.degree,
        },
      });
    }

    // Edges
    for (const edgeKey of interferenceGraph.edges) {
      const [u, v] = edgeKey.split('--');
      if (u && v && interferenceGraph.nodes.has(u) && interferenceGraph.nodes.has(v)) {
        elements.push({
          group: 'edges',
          data: { id: edgeKey, source: u, target: v },
        });
      }
    }

    cyRef.current = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => ele.data('color') + '28',
            'border-color': (ele) => ele.data('color'),
            'border-width': 2.5,
            'label': (ele) => `${ele.data('label')}\n${ele.data('register')}`,
            'color': textColor,
            'text-valign': 'center',
            'text-halign': 'center',
            'font-family': 'JetBrains Mono, monospace',
            'font-size': '11px',
            'font-weight': '600',
            'text-wrap': 'wrap',
            'width': 70,
            'height': 70,
            'shape': 'ellipse',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'node[?isSpilled]',
          style: {
            'border-style': 'dashed',
            'border-width': 2.5,
          } as cytoscape.Css.Node,
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': edgeColor,
            'curve-style': 'straight',
          } as cytoscape.Css.Edge,
        },
        {
          selector: ':selected',
          style: { 'border-width': 4 } as cytoscape.Css.Node,
        },
      ],
      layout: {
        name: interferenceGraph.nodes.size <= 6 ? 'circle' : 'cose',
        padding: 50,
        animate: false,
        avoidOverlap: true,
        spacingFactor: 1.6,
      },
      userZoomingEnabled: true,
      userPanningEnabled: true,
    });

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [interferenceGraph, graphColoringResult, theme]);

  if (!interferenceGraph) {
    return (
      <div style={{ padding: 32, color: 'var(--text-muted)', textAlign: 'center' }}>
        No interference graph. Run the simulation first.
      </div>
    );
  }

  const assignments = graphColoringResult?.assignments ?? {};
  const spills = graphColoringResult?.spills ?? [];
  const usedRegisters = new Set(Object.values(assignments));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, height: 'calc(100vh - 130px)' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexShrink: 0 }}
      >
        <div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Interference Graph</h2>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {interferenceGraph.nodes.size} variables · {interferenceGraph.edges.size} interference edges
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <span className="badge badge-purple">{usedRegisters.size} registers used</span>
          {spills.length > 0 && (
            <span className="badge badge-rose">{spills.length} spilled</span>
          )}
        </div>
      </motion.div>

      {/* Graph Canvas */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        style={{ flex: 1, minHeight: 0 }}
      >
        <div className="card" style={{ height: '100%', padding: 0, overflow: 'hidden' }}>
          <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
        </div>
      </motion.div>

      {/* Legend: Register colors */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}
      >
        {[...usedRegisters].sort().map((reg) => (
          <div
            key={reg}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 100,
              background: `${REG_COLORS[reg % REG_COLORS.length]}15`,
              border: `1px solid ${REG_COLORS[reg % REG_COLORS.length]}30`,
              fontSize: '0.72rem', color: REG_COLORS[reg % REG_COLORS.length], fontWeight: 500,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: REG_COLORS[reg % REG_COLORS.length] }} />
            R{reg}
          </div>
        ))}
        {spills.length > 0 && (
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 100,
              background: `${SPILL_COLOR}15`, border: `1px dashed ${SPILL_COLOR}50`,
              fontSize: '0.72rem', color: SPILL_COLOR, fontWeight: 500,
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: SPILL_COLOR }} />
            Spill ({spills.join(', ')})
          </div>
        )}
      </motion.div>
    </div>
  );
}
