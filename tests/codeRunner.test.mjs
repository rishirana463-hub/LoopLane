import test from 'node:test';
import assert from 'node:assert/strict';
import { CODE_TIMEOUT_MS, runCode } from '../src/lib/codeRunner.js';

// These tests exercise message/lifecycle handling without executing a program.
function browserHarness(onRun) {
  const previous = { document: globalThis.document, Worker: globalThis.Worker };
  const frames = [];
  globalThis.Worker = class {};
  globalThis.document = {
    createElement() {
      const frame = {
        attributes: {},
        listeners: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, listener) { this.listeners[name] = listener; },
        remove() { this.removed = true; this.port?.close(); },
      };
      frame.contentWindow = {
        postMessage(message, origin, ports) {
          assert.equal(message, 'codeleap-runner');
          frame.port = ports[0];
          frame.port.onmessage = event => {
            if (event.data.type === 'run') onRun(event.data.payload, frame.port, frame);
          };
          frame.port.start();
          frame.port.postMessage({ type: 'ready' });
        },
      };
      frames.push(frame);
      return frame;
    },
    body: { append(frame) { queueMicrotask(() => frame.listeners.load()); } },
  };
  return {
    frames,
    restore() {
      for (const frame of frames) frame.port?.close();
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete globalThis[key];
        else globalThis[key] = value;
      }
    },
  };
}

const exercise = { code: 'function add(a, b) { return a + b; }', functionName: 'add', tests: [{ args: [2, 3], expected: 5 }] };

test('unsupported browsers receive a useful error without executing code', async () => {
  const result = await runCode(exercise);
  assert.equal(result.passed, false);
  assert.match(result.error, /browser does not support/i);
});

test('successful feedback disposes its isolated frame and keeps the network policy separate', async () => {
  const harness = browserHarness((payload, port) => {
    assert.equal(payload.code, exercise.code);
    port.postMessage({ type: 'started' });
    port.postMessage({ type: 'result', result: { passed: true, results: [{ passed: true, actual: 5, expected: 5 }], logs: ['5'] } });
  });
  try {
    const result = await runCode(exercise);
    assert.equal(result.passed, true);
    assert.deepEqual(result.logs, ['5']);
    assert.equal(harness.frames[0].attributes.sandbox, 'allow-scripts');
    assert.match(harness.frames[0].srcdoc, /connect-src 'none'/);
    assert.ok(harness.frames[0].srcdoc.endsWith('</script></body></html>'));
    assert.equal(harness.frames[0].removed, true);
  } finally { harness.restore(); }
});

test('an invalid function identifier cannot enter the worker compilation template', async () => {
  const harness = browserHarness(() => assert.fail('Runner should not start'));
  try {
    const result = await runCode({ ...exercise, functionName: 'add(); malicious()' });
    assert.equal(result.passed, false);
    assert.match(result.error, /valid function name/);
    assert.equal(harness.frames.length, 0);
  } finally { harness.restore(); }
});

test('abort removes the pending runner and resolves as cancellation', async () => {
  const controller = new AbortController();
  const harness = browserHarness((payload, port) => {
    port.postMessage({ type: 'started' });
    controller.abort();
  });
  try {
    const result = await runCode({ ...exercise, signal: controller.signal });
    assert.equal(result.cancelled, true);
    assert.equal(result.passed, false);
    assert.equal(harness.frames[0].removed, true);
  } finally { harness.restore(); }
});

test('callers cannot extend the two-second code deadline', async () => {
  const harness = browserHarness((payload, port) => {
    assert.equal(payload.timeoutMs, CODE_TIMEOUT_MS);
    port.postMessage({ type: 'result', result: { passed: false, results: [], logs: [] } });
  });
  try { await runCode({ ...exercise, timeoutMs: 60000 }); }
  finally { harness.restore(); }
});

test('the page deadline preserves streamed console output and removes a stalled frame', async () => {
  const harness = browserHarness((payload, port) => {
    port.postMessage({ type: 'started' });
    port.postMessage({ type: 'log', message: 'before the loop' });
    // Simulate a throttled frame that never sends its own timeout response.
  });
  try {
    const result = await runCode({ ...exercise, timeoutMs: 20 });
    assert.equal(result.timedOut, true);
    assert.deepEqual(result.logs, ['before the loop']);
    assert.equal(harness.frames[0].removed, true);
  } finally { harness.restore(); }
});
