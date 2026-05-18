import { motion } from 'framer-motion';
import type { StageId } from '../../core/types';
import { 
  FileCode, 
  Boxes, 
  GitBranch, 
  Activity, 
  Hexagon, 
  Palette, 
  Timer,
  FileOutput 
} from 'lucide-react';

interface StageViewProps {
  stageId: StageId;
}

const STAGE_META: Record<StageId, { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  color: string;
}> = {
  input: {
    title: 'Input',
    description: 'Enter your TAC program',
    icon: <FileCode size={32} />,
    color: 'var(--accent-purple)',
  },
  parsing: {
    title: 'Parsing',
    description: 'Lexing and parsing Three-Address Code into structured instructions',
    icon: <FileCode size={32} />,
    color: 'var(--accent-blue)',
  },
  basicBlocks: {
    title: 'Basic Block Partitioning',
    description: 'Identifying leaders and partitioning instructions into basic blocks',
    icon: <Boxes size={32} />,
    color: 'var(--accent-cyan)',
  },
  cfg: {
    title: 'Control Flow Graph',
    description: 'Constructing the CFG from basic blocks with predecessor/successor edges',
    icon: <GitBranch size={32} />,
    color: 'var(--accent-emerald)',
  },
  liveness: {
    title: 'Liveness Analysis',
    description: 'Computing live-in and live-out sets using backward data-flow equations',
    icon: <Activity size={32} />,
    color: 'var(--accent-amber)',
  },
  interferenceGraph: {
    title: 'Interference Graph',
    description: 'Building the interference graph from liveness information',
    icon: <Hexagon size={32} />,
    color: 'var(--accent-rose)',
  },
  graphColoring: {
    title: 'Graph Coloring (Chaitin-Briggs)',
    description: 'Simplify → Coalesce → Freeze → Spill → Select coloring algorithm',
    icon: <Palette size={32} />,
    color: 'var(--accent-purple)',
  },
  linearScan: {
    title: 'Linear Scan (Poletto-Sarkar)',
    description: 'Sorting live intervals and assigning registers with spill heuristics',
    icon: <Timer size={32} />,
    color: 'var(--accent-blue)',
  },
  output: {
    title: 'Final Output',
    description: 'Annotated TAC with register assignments and spill code',
    icon: <FileOutput size={32} />,
    color: 'var(--accent-emerald)',
  },
};

export default function StageView({ stageId }: StageViewProps) {
  const meta = STAGE_META[stageId];

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: 'calc(100vh - 56px - 48px)',
        gap: 20,
      }}
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.4 }}
        style={{
          width: 72,
          height: 72,
          borderRadius: 'var(--radius-lg)',
          background: `${meta.color}15`,
          border: `1px solid ${meta.color}30`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: meta.color,
        }}
      >
        {meta.icon}
      </motion.div>
      <h2
        style={{
          fontSize: '1.3rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
        }}
      >
        {meta.title}
      </h2>
      <p
        style={{
          fontSize: '0.85rem',
          color: 'var(--text-muted)',
          maxWidth: 420,
          textAlign: 'center',
          lineHeight: 1.7,
        }}
      >
        {meta.description}
      </p>
      <div
        className="badge badge-purple"
        style={{ marginTop: 8, fontSize: '0.7rem', padding: '4px 12px' }}
      >
        Coming in next phase
      </div>
    </motion.div>
  );
}
