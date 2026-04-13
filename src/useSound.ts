// ============================================
// NEXUS TETRIS — Synthesized Sound Effects
// Web Audio API — không cần file âm thanh
// ============================================

let _ctx: AudioContext | null = null;

// getCtx async: đảm bảo context đã resumed trước khi phát âm
async function getCtx(): Promise<AudioContext | null> {
  try {
    if (!_ctx) {
      _ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    if (_ctx.state === 'suspended') {
      await _ctx.resume();
    }
    return _ctx;
  } catch {
    return null;
  }
}

// Phát 1 nốt — async để đợi context resume
async function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.3,
  endFreq?: number,
  delay = 0
) {
  const c = await getCtx();
  if (!c) return;
  try {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.connect(gain);
    gain.connect(c.destination);
    osc.type = type;
    const t = c.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t);
    if (endFreq) {
      osc.frequency.exponentialRampToValueAtTime(endFreq, t + dur * 0.7);
    }
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.start(t);
    osc.stop(t + dur + 0.01);
  } catch {
    // ignore
  }
}

export const sounds = {
  move() {
    void tone(220, 0.06, 'square', 0.18);
  },

  rotate() {
    void tone(440, 0.07, 'square', 0.2);
    void tone(600, 0.05, 'square', 0.12, undefined, 0.04);
  },

  softDrop() {
    void tone(160, 0.05, 'square', 0.15);
  },

  hardDrop() {
    void tone(200, 0.06, 'sawtooth', 0.4, 60);
    void tone(60, 0.2, 'sine', 0.45, undefined, 0.05);
  },

  lock() {
    void tone(250, 0.09, 'square', 0.25, 120);
  },

  lineClear(lines: number) {
    if (lines >= 4) {
      // TETRIS! — fanfare 4 nốt
      [523, 659, 784, 1047].forEach((f, i) =>
        void tone(f, 0.22, 'sine', 0.35, undefined, i * 0.08)
      );
    } else {
      const freqs: Record<number, number> = { 1: 440, 2: 554, 3: 659 };
      const f = freqs[lines] ?? 440;
      void tone(f, 0.14, 'sine', 0.3);
      void tone(f * 1.5, 0.1, 'sine', 0.18, undefined, 0.08);
    }
  },

  levelUp() {
    [523, 659, 784, 1047].forEach((f, i) =>
      void tone(f, 0.15, 'sine', 0.28, undefined, i * 0.09)
    );
  },

  gameOver() {
    [380, 280, 190, 95].forEach((f, i) =>
      void tone(f, 0.25, 'sawtooth', 0.32, undefined, i * 0.18)
    );
  },
};
