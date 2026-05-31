import { useSimulatorStore } from '../../store/simulatorStore';

export default function Header() {
  const { isLoading, currentStage } = useSimulatorStore();
  return (
    <header className="header">
      <div className="header-logo">
        <div className="logo-icon">⬡</div>
        <span>RegAlloc Sim</span>
        <span className="logo-badge">LLVM v2</span>
      </div>
      <div className="header-spacer" />
      <div className="header-status">
        {isLoading ? (
          <>
            <div className="spinner" style={{ width: 10, height: 10, borderWidth: 1.5 }} />
            Running pipeline…
          </>
        ) : (
          <>
            <div className="status-dot" />
            {currentStage === 'input' ? 'Ready' : `Stage: ${currentStage}`}
          </>
        )}
      </div>
    </header>
  );
}
