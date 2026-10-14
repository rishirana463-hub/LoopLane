import { useEffect, useId, useRef, useState } from 'react';
import { runCode } from '../lib/codeRunner.js';

function display(value) {
  if (value === undefined) return 'undefined';
  return JSON.stringify(value);
}

export default function CodeEditor({ question, onPassChange, disabled = false }) {
  const [code, setCode] = useState(question.starter || '');
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showHint, setShowHint] = useState(false);
  const controller = useRef(null);
  const runNumber = useRef(0);
  const onPass = useRef(onPassChange);
  const editorId = useId();
  const hintId = useId();

  useEffect(() => { onPass.current = onPassChange; }, [onPassChange]);
  useEffect(() => {
    runNumber.current += 1;
    controller.current?.abort();
    setCode(question.starter || '');
    setFeedback(null);
    setRunning(false);
    setShowHint(false);
    onPass.current(false);
    return () => {
      runNumber.current += 1;
      controller.current?.abort();
    };
  }, [question.id, question.starter]);

  function changeCode(next) {
    runNumber.current += 1;
    controller.current?.abort();
    setCode(next);
    setRunning(false);
    setFeedback(null);
    onPass.current(false);
  }

  async function run() {
    controller.current?.abort();
    controller.current = new AbortController();
    const number = ++runNumber.current;
    setRunning(true);
    setFeedback(null);
    onPass.current(false);
    try {
      const result = await runCode({ code, functionName: question.functionName, tests: question.tests, signal: controller.current.signal });
      if (number !== runNumber.current || result.cancelled) return;
      setFeedback(result);
      onPass.current(result.passed);
    } catch {
      if (number === runNumber.current) setFeedback({ passed: false, results: [], logs: [], error: 'The runner could not start. Try running your code again.' });
    } finally {
      if (number === runNumber.current) setRunning(false);
    }
  }

  return (
    <div className="editor-panel">
      <div className="editor-heading">
        <label htmlFor={editorId}>Your JavaScript</label>
        <span>Runs on your device</span>
      </div>
      <textarea
        id={editorId}
        className="code-textarea"
        value={code}
        onChange={event => changeCode(event.target.value)}
        disabled={disabled}
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        aria-describedby={showHint ? hintId : undefined}
        rows={Math.max(6, Math.min(12, code.split('\n').length + 1))}
      />
      <div className="editor-actions">
        <button className="code-run-button" type="button" onClick={run} disabled={disabled || running} aria-busy={running}>
          {running ? 'Running…' : 'Run code'}
        </button>
        {question.hint && <button className="code-hint-button" type="button" onClick={() => setShowHint(value => !value)} aria-expanded={showHint} aria-controls={hintId}>
          {showHint ? 'Hide hint' : 'Need a hint?'}
        </button>}
      </div>
      {showHint && <p className="code-hint" id={hintId}>{question.hint}</p>}
      <div aria-live="polite" aria-atomic="true">
        {running && <p className="editor-status">Testing your solution…</p>}
        {feedback?.error && <p className="editor-error" role="alert">{feedback.error}</p>}
        {feedback?.results?.length > 0 && (
          <div className="test-results">
            <p className="test-summary">{feedback.passed ? 'All tests passed. You can check your answer.' : 'Keep going — check the test results below.'}</p>
            <ul>
              {feedback.results.map((result, index) => (
                <li className={`test-result ${result.passed ? 'test-pass' : 'test-fail'}`} key={index}>
                  <strong>{result.passed ? '✓ Passed' : '✕ Try again'} · Test {index + 1}</strong>
                  <code>{question.functionName}({question.tests[index].args.map(display).join(', ')})</code>
                  <span>Expected: <code>{display(result.expected)}</code></span>
                  {result.error ? <span className="editor-error">{result.error}</span> : <span>Actual: <code>{display(result.actual)}</code></span>}
                </li>
              ))}
            </ul>
          </div>
        )}
        {feedback?.logs?.length > 0 && <div className="console-output"><p>Console output</p><pre>{feedback.logs.join('\n')}</pre></div>}
      </div>
    </div>
  );
}
