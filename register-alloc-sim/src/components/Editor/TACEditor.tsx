import Editor from '@monaco-editor/react';
import { useSimulatorStore } from '../../store/simulatorStore';

export default function TACEditor() {
  const { sourceCode, setSourceCode, theme } = useSimulatorStore();

  return (
    <div className="editor-wrapper" style={{ flex: 1, minHeight: 0 }}>
      <Editor
        height="100%"
        defaultLanguage="plaintext"
        value={sourceCode}
        onChange={(value) => setSourceCode(value ?? '')}
        theme={theme === 'dark' ? 'vs-dark' : 'light'}
        options={{
          fontSize: 14,
          fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: 'gutter',
          smoothScrolling: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          bracketPairColorization: { enabled: true },
          tabSize: 2,
          automaticLayout: true,
        }}
      />
    </div>
  );
}
