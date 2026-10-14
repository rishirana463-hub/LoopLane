const sounds = new Map();

export function playFeedback(correct, muted) {
  if (muted) return;

  try {
    globalThis.navigator?.vibrate?.(correct ? 35 : [50, 35, 50]);
  } catch { /* A blocked vibration API must not prevent sound. */ }

  try {
    if (typeof globalThis.Audio !== 'function') return;
    const cue = correct ? 'correct' : 'wrong';
    let sound = sounds.get(cue);
    if (!sound) {
      sound = new globalThis.Audio(`/sounds/${cue}.wav`);
      sound.preload = 'auto';
      sound.volume = .7;
      sounds.set(cue, sound);
    }
    try { sound.currentTime = 0; } catch { /* Unloaded media can reject a seek. */ }
    // Keep play() in the Check tap, before any asynchronous work.
    const playback = sound.play();
    playback?.catch?.(() => {});
  } catch { /* Feedback is optional when media playback is unavailable. */ }
}
