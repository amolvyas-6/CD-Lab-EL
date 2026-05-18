import { useSimulatorStore } from '../../store/simulatorStore';
import { Sun, Moon, RotateCcw } from 'lucide-react';

export default function Header() {
  const { theme, toggleTheme, currentStage, stages, resetSimulation } =
    useSimulatorStore();

  const activeStage = stages.find((s) => s.id === currentStage);

  return (
    <header className="header">
      <div>
        <span className="header-title">
          {activeStage?.name ?? 'Input'} — {activeStage?.description ?? ''}
        </span>
      </div>
      <div className="header-actions">
        <button
          className="btn btn-ghost btn-sm"
          onClick={resetSimulation}
          title="Reset Simulation"
        >
          <RotateCcw size={14} />
          Reset
        </button>
        <button
          className="theme-toggle"
          onClick={toggleTheme}
          title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </div>
    </header>
  );
}
