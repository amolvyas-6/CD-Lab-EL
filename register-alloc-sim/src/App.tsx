import { useSimulatorStore } from './store/simulatorStore';
import Sidebar from './components/Layout/Sidebar';
import Header from './components/Layout/Header';
import InputStage from './components/Editor/InputStage';
import ParseView from './components/CFGView/ParseView';
import BasicBlockView from './components/CFGView/BasicBlockView';
import CFGGraph from './components/CFGView/CFGGraph';
import LivenessMatrix from './components/LivenessMatrix/LivenessMatrix';
import InterferenceGraphView from './components/InterferenceGraph/InterferenceGraphView';
import GraphColoringView from './components/InterferenceGraph/GraphColoringView';
import GanttChart from './components/GanttChart/GanttChart';
import ComparisonDash from './components/ComparisonDash/ComparisonDash';
import OutputView from './components/ComparisonDash/OutputView';
import StepControls from './components/StepControls/StepControls';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect } from 'react';
import type { StageId } from './core/types';

const STAGES_WITH_STEPS: StageId[] = [
  'parsing', 'basicBlocks', 'cfg', 'liveness', 'interferenceGraph', 'graphColoring', 'linearScan',
];

const PageWrapper = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.25, ease: 'easeOut' }}
    style={{ height: '100%' }}
  >
    {children}
  </motion.div>
);

/** Wraps a stage view in the 2-column layout with step controls on the right */
function StageWithControls({ stageId, children }: { stageId: StageId; children: React.ReactNode }) {
  return (
    <div className="pipeline-stage-layout">
      <div className="pipeline-stage-main">{children}</div>
      <div className="pipeline-stage-controls">
        <StepControls stageId={stageId} />
      </div>
    </div>
  );
}

function App() {
  const { theme, currentStage } = useSimulatorStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const renderStage = () => {
    switch (currentStage) {
      case 'input':
        return <PageWrapper><InputStage /></PageWrapper>;

      case 'parsing':
        return (
          <PageWrapper>
            <StageWithControls stageId="parsing"><ParseView /></StageWithControls>
          </PageWrapper>
        );

      case 'basicBlocks':
        return (
          <PageWrapper>
            <StageWithControls stageId="basicBlocks"><BasicBlockView /></StageWithControls>
          </PageWrapper>
        );

      case 'cfg':
        return (
          <PageWrapper>
            <StageWithControls stageId="cfg"><CFGGraph /></StageWithControls>
          </PageWrapper>
        );

      case 'liveness':
        return (
          <PageWrapper>
            <StageWithControls stageId="liveness"><LivenessMatrix /></StageWithControls>
          </PageWrapper>
        );

      case 'interferenceGraph':
        return (
          <PageWrapper>
            <StageWithControls stageId="interferenceGraph"><InterferenceGraphView /></StageWithControls>
          </PageWrapper>
        );

      case 'graphColoring':
        return (
          <PageWrapper>
            <StageWithControls stageId="graphColoring"><GraphColoringView /></StageWithControls>
          </PageWrapper>
        );

      case 'linearScan':
        return (
          <PageWrapper>
            <StageWithControls stageId="linearScan"><GanttChart /></StageWithControls>
          </PageWrapper>
        );

      case 'output':
        return (
          <PageWrapper>
            <div className="pipeline-stage-layout">
              <div className="pipeline-stage-main">
                <OutputView />
              </div>
              <div className="pipeline-stage-controls">
                <ComparisonDash />
              </div>
            </div>
          </PageWrapper>
        );

      default:
        return <PageWrapper><InputStage /></PageWrapper>;
    }
  };

  return (
    <div className="app-shell">
      <Sidebar />
      <Header />
      <main className="main-content">
        <AnimatePresence mode="wait">
          <div key={currentStage} style={{ height: '100%' }}>
            {renderStage()}
          </div>
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
