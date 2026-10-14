import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

let moduleNumber = 0;
async function withBrowser(options, run) {
  const previous = Object.fromEntries(['Audio', 'navigator'].map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  const calls = { sounds: [], vibrations: [], plays: [] };
  class AudioStub {
    constructor(src) { this.src = src; this.currentTime = 7; calls.sounds.push(this); }
    play() { calls.plays.push({ src: this.src, time: this.currentTime }); return options.play?.(); }
  }
  Object.defineProperty(globalThis, 'Audio', { configurable: true, value: options.unsupported ? undefined : options.Audio || AudioStub });
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
    vibrate(pattern) { calls.vibrations.push(pattern); return options.vibrate?.(pattern); },
  } });
  try {
    const { playFeedback } = await import(`../src/lib/feedback.js?test=${++moduleNumber}`);
    await run(playFeedback, calls);
  } finally {
    for (const [name, descriptor] of Object.entries(previous)) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else delete globalThis[name];
    }
  }
}

test('muted feedback creates no media and requests no vibration', async () => {
  await withBrowser({}, (playFeedback, calls) => {
    playFeedback(true, true);
    playFeedback(false, true);
    assert.deepEqual(calls, { sounds: [], vibrations: [], plays: [] });
  });
});

test('answer feedback plays the matching local cue synchronously and restarts repeated cues', async () => {
  await withBrowser({}, (playFeedback, calls) => {
    playFeedback(true, false);
    assert.deepEqual(calls.plays, [{ src: '/sounds/correct.wav', time: 0 }]);
    calls.sounds[0].currentTime = .12;
    playFeedback(true, false);
    playFeedback(false, false);
    assert.deepEqual(calls.plays, [
      { src: '/sounds/correct.wav', time: 0 },
      { src: '/sounds/correct.wav', time: 0 },
      { src: '/sounds/wrong.wav', time: 0 },
    ]);
    assert.equal(calls.sounds.length, 2);
    assert.deepEqual(calls.vibrations, [35, 35, [50, 35, 50]]);
  });
});

test('a vibration exception cannot suppress the answer sound', async () => {
  await withBrowser({ vibrate() { throw new Error('Vibration blocked'); } }, (playFeedback, calls) => {
    assert.doesNotThrow(() => playFeedback(true, false));
    assert.equal(calls.plays.length, 1);
  });
});

test('a rejected seek on unloaded media still attempts playback during the tap', async () => {
  let playCount = 0;
  class UnloadedAudio {
    set currentTime(value) { throw new Error('Media metadata is not loaded'); }
    play() { playCount += 1; }
  }
  await withBrowser({ Audio: UnloadedAudio }, playFeedback => {
    assert.doesNotThrow(() => playFeedback(true, false));
    assert.equal(playCount, 1);
  });
});

test('unavailable, throwing, or rejected media playback does not interrupt learning', async () => {
  await withBrowser({ unsupported: true }, (playFeedback, calls) => {
    assert.doesNotThrow(() => playFeedback(false, false));
    assert.equal(calls.vibrations.length, 1);
    assert.equal(calls.plays.length, 0);
  });
  await withBrowser({ Audio: class { constructor() { throw new Error('Media unavailable'); } } }, playFeedback => {
    assert.doesNotThrow(() => playFeedback(true, false));
  });
  await withBrowser({ play() { throw new Error('Playback blocked'); } }, playFeedback => {
    assert.doesNotThrow(() => playFeedback(true, false));
  });
  await withBrowser({ play() { return Promise.reject(new Error('Playback denied')); } }, async (playFeedback, calls) => {
    assert.doesNotThrow(() => playFeedback(false, false));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(calls.plays.length, 1);
  });
});

test('both original feedback clips are short, audible mono PCM WAV files with faded endpoints', async () => {
  const clips = [];
  for (const name of ['correct', 'wrong']) {
    const bytes = await readFile(new URL(`../public/sounds/${name}.wav`, import.meta.url));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.readUInt32LE(4), bytes.length - 8);
    assert.equal(bytes.toString('ascii', 8, 16), 'WAVEfmt ');
    assert.equal(bytes.readUInt16LE(20), 1);
    assert.equal(bytes.readUInt16LE(22), 1);
    assert.equal(bytes.readUInt16LE(34), 16);
    assert.equal(bytes.toString('ascii', 36, 40), 'data');
    assert.equal(bytes.readUInt32LE(40), bytes.length - 44);
    const sampleRate = bytes.readUInt32LE(24);
    const duration = (bytes.length - 44) / 2 / sampleRate;
    assert.ok(duration >= .22 && duration <= .24);
    const samples = Array.from({ length: (bytes.length - 44) / 2 }, (_, index) => bytes.readInt16LE(44 + index * 2));
    assert.equal(samples[0], 0);
    assert.equal(samples.at(-1), 0);
    assert.ok(Math.max(...samples.map(Math.abs)) > 10000);
    assert.ok(Math.max(...samples.map(Math.abs)) < 32767);
    clips.push(bytes);
  }
  assert.notDeepEqual(clips[0], clips[1]);
});
