// Web Audio API beep generator with synthetic fallback and haptic vibration

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playLaserBeep(type: 'success' | 'remove' | 'info' | 'alert' = 'success') {
  try {
    const ctx = getAudioContext();
    if (ctx) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      let freq = 2400;
      let duration = 0.09;

      if (type === 'remove') {
        freq = 880;
        duration = 0.14;
      } else if (type === 'info') {
        freq = 1600;
        duration = 0.1;
      } else if (type === 'alert') {
        freq = 440;
        duration = 0.2;
      }

      osc.type = type === 'remove' ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + duration);
    }
  } catch {
    // Audio context may not be allowed until user gesture
  }

  // Haptic feedback for mobile devices (Termux / Android Chrome)
  triggerHaptic(type);
}

export function triggerHaptic(type: 'success' | 'remove' | 'info' | 'alert' = 'success') {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      if (type === 'success') {
        navigator.vibrate([70, 40, 70]);
      } else if (type === 'remove') {
        navigator.vibrate([120]);
      } else if (type === 'alert') {
        navigator.vibrate([100, 50, 100, 50, 150]);
      } else {
        navigator.vibrate(50);
      }
    } catch {
      // Ignore vibration error
    }
  }
}
