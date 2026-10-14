/* User programs run only in an isolated, short-lived Web Worker. */
export const CODE_TIMEOUT_MS = 2000;

const WORKER_SOURCE = String.raw`
'use strict';
const send = self.postMessage.bind(self);
const stringify = JSON.stringify.bind(JSON);
const keys = Object.keys.bind(Object);
const isArray = Array.isArray.bind(Array);
const same = Object.is.bind(Object);
const define = Object.defineProperty.bind(Object);
const text = String;
let logs = [];

function printable(value, depth = 0, seen = new Set()) {
  if (value === undefined) return 'undefined';
  if (typeof value === 'bigint') return text(value) + 'n';
  if (typeof value === 'number' && !Number.isFinite(value)) return text(value);
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'symbol') return text(value);
  if (typeof value === 'string') return value.slice(0, 2000);
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return '[Circular]';
  if (depth >= 4) return '[…]';
  seen.add(value);
  const result = isArray(value) ? [] : {};
  for (const key of keys(value).slice(0, 30)) {
    try { result[key] = printable(value[key], depth + 1, seen); }
    catch { result[key] = '[Unreadable value]'; }
  }
  seen.delete(value);
  return result;
}

function equal(actual, expected, depth = 0) {
  if (same(actual, expected)) return true;
  if (depth > 20 || !actual || !expected || typeof actual !== 'object' || typeof expected !== 'object') return false;
  if (isArray(actual) !== isArray(expected)) return false;
  const actualKeys = keys(actual);
  const expectedKeys = keys(expected);
  if (actualKeys.length !== expectedKeys.length) return false;
  return expectedKeys.every(key => Object.prototype.hasOwnProperty.call(actual, key) && equal(actual[key], expected[key], depth + 1));
}

function friendly(error) {
  const message = text(error && error.message || error || 'The program could not run.').slice(0, 500);
  const stack = text(error && error.stack || '');
  const line = stack.match(/<anonymous>:(\d+):\d+/);
  const sourceLine = line ? Math.max(1, Number(line[1]) - 2) : null;
  return sourceLine ? 'Line ' + sourceLine + ': ' + message : message;
}

for (const name of ['fetch', 'XMLHttpRequest', 'WebSocket', 'importScripts', 'indexedDB', 'caches', 'EventSource', 'Worker', 'SharedWorker', 'WebTransport', 'BroadcastChannel', 'postMessage']) {
  try { define(self, name, { value: undefined, writable: false, configurable: false }); }
  catch { try { self[name] = undefined; } catch {} }
}

const consoleCapture = {};
for (const name of ['log', 'info', 'warn', 'error', 'debug']) {
  consoleCapture[name] = (...values) => {
    if (logs.length >= 30) return;
    try {
      logs.push(values.map(value => {
        const result = printable(value);
        return typeof result === 'string' ? result : stringify(result);
      }).join(' ').slice(0, 1600));
    } catch { logs.push('[Could not display this console message]'); }
    send({ type: 'log', message: logs[logs.length - 1] });
  };
}
try { define(self, 'console', { value: Object.freeze(consoleCapture), writable: false, configurable: false }); }
catch { self.console = consoleCapture; }

self.onmessage = async event => {
  const { code, functionName, tests } = event.data;
  const results = [];
  try {
    const getFunction = new Function(code + '\n;return typeof ' + functionName + ' === "function" ? ' + functionName + ' : null;');
    const solution = getFunction();
    if (!solution) throw new Error('Create a function named ' + functionName + '.');
    for (const test of tests) {
      try {
        const actual = await solution(...test.args);
        results.push({ passed: equal(actual, test.expected), actual: printable(actual), expected: test.expected });
      } catch (error) {
        results.push({ passed: false, actual: undefined, expected: test.expected, error: friendly(error) });
      }
    }
    send({ passed: results.length > 0 && results.every(result => result.passed), results, logs });
  } catch (error) {
    send({ passed: false, results, logs, error: friendly(error) });
  }
};
`;

function runnerDocument() {
  // A separate CSP prevents programs from sharing the app's cloud permissions.
  return `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; worker-src blob:; child-src blob:; connect-src 'none'; form-action 'none'; base-uri 'none'"></head><body><script>
  'use strict';
  window.addEventListener('message', function begin(event) {
    if (event.source !== parent || event.data !== 'codeleap-runner' || !event.ports[0]) return;
    window.removeEventListener('message', begin);
    const port = event.ports[0];
    let worker, url, timer, finished = false;
    const capturedLogs = [];
    function finish(result) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (worker) worker.terminate();
      if (url) URL.revokeObjectURL(url);
      port.postMessage({ type: 'result', result });
      port.close();
    }
    port.onmessage = function (message) {
      if (message.data.type === 'cancel') {
        finish({ passed: false, results: [], logs: capturedLogs, cancelled: true, error: 'Run cancelled.' });
        return;
      }
      if (message.data.type !== 'run' || worker || finished) return;
      const payload = message.data.payload;
      try {
        url = URL.createObjectURL(new Blob([${JSON.stringify(WORKER_SOURCE)}], { type: 'text/javascript' }));
        worker = new Worker(url);
        worker.onmessage = function (reply) {
          if (reply.data && reply.data.type === 'log') {
            if (capturedLogs.length < 30) {
              capturedLogs.push(reply.data.message);
              port.postMessage({ type: 'log', message: reply.data.message });
            }
          } else finish(reply.data);
        };
        worker.onerror = function (error) {
          error.preventDefault();
          finish({ passed: false, results: [], logs: capturedLogs, error: error.message || 'The program could not run. Check your syntax.' });
        };
        timer = setTimeout(function () {
          finish({ passed: false, results: [], logs: capturedLogs, timedOut: true, error: 'Your code ran for too long. Check for a loop that never ends, then try again.' });
        }, payload.timeoutMs);
        port.postMessage({ type: 'started' });
        worker.postMessage(payload);
      } catch (error) {
        finish({ passed: false, results: [], logs: [], error: error.message || 'This browser could not start the code runner.' });
      }
    };
    port.start();
    port.postMessage({ type: 'ready' });
  });
  </script></body></html>`;
}

const failed = error => ({ passed: false, results: [], logs: [], error });

/** Run a lesson program locally. Resolves with feedback, including cancellation. */
export function runCode({ code, functionName, tests, timeoutMs = CODE_TIMEOUT_MS, signal } = {}) {
  if (typeof document === 'undefined' || typeof Worker === 'undefined' || typeof MessageChannel === 'undefined') {
    return Promise.resolve(failed('This browser does not support the code runner. Try a current browser.'));
  }
  if (!/^[A-Za-z_$][\w$]*$/.test(functionName || '')) {
    return Promise.resolve(failed('This exercise needs a valid function name.'));
  }
  if (!Array.isArray(tests) || !tests.length || tests.length > 20 || tests.some(test => !Array.isArray(test.args))) {
    return Promise.resolve(failed('This exercise has no valid tests.'));
  }
  if (typeof code !== 'string' || code.length > 50000) {
    return Promise.resolve(failed('Keep your solution under 50,000 characters.'));
  }
  if (signal?.aborted) return Promise.resolve({ ...failed('Run cancelled.'), cancelled: true });

  // Callers may shorten a run, but cannot bypass the two-second limit.
  const duration = Math.max(1, Math.min(CODE_TIMEOUT_MS, Number(timeoutMs) || CODE_TIMEOUT_MS));
  return new Promise(resolve => {
    const frame = document.createElement('iframe');
    const channel = new MessageChannel();
    const capturedLogs = [];
    let watchdog;
    let settled = false;
    const finish = result => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdog);
      signal?.removeEventListener('abort', abort);
      channel.port1.close();
      channel.port2.close();
      frame.remove();
      resolve(result);
    };
    const abort = () => {
      channel.port1.postMessage({ type: 'cancel' });
      finish({ ...failed('Run cancelled.'), logs: capturedLogs, cancelled: true });
    };
    frame.title = 'Isolated code runner';
    frame.hidden = true;
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.srcdoc = runnerDocument();
    frame.addEventListener('load', () => {
      if (!settled) frame.contentWindow.postMessage('codeleap-runner', '*', [channel.port2]);
    }, { once: true });
    channel.port1.onmessage = event => {
      const message = event.data;
      if (message?.type === 'ready') {
        channel.port1.postMessage({ type: 'run', payload: { code, functionName, tests, timeoutMs: duration } });
      } else if (message?.type === 'started') {
        clearTimeout(watchdog);
        // The page timer also covers browsers that throttle hidden-frame timers.
        watchdog = setTimeout(() => {
          channel.port1.postMessage({ type: 'cancel' });
          finish({ ...failed('Your code ran for too long. Check for a loop that never ends, then try again.'), logs: capturedLogs, timedOut: true });
        }, duration);
      } else if (message?.type === 'log') {
        if (capturedLogs.length < 30) capturedLogs.push(String(message.message).slice(0, 1600));
      } else if (message?.type === 'result') {
        finish(message.result);
      }
    };
    channel.port1.start();
    signal?.addEventListener('abort', abort, { once: true });
    watchdog = setTimeout(() => finish(failed('The code runner did not start. Reload the page and try again.')), 5000);
    document.body.append(frame);
  });
}
