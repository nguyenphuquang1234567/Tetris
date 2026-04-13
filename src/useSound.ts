// ============================================
// NEXUS TETRIS — Synthesized Sound Effects
// Web Audio API — không cần file âm thanh
// ============================================

// AudioContext singleton — lazy init khi user tương tác đầu tiên
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!_ctx) {
      _ctx = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
    }
    if (_ctx.state === 'suspended') void _ctx.resume();
    return _ctx;
  } catch {
    return null;
  }
}

// Helper: phát 1 nốt
function tone(
  freq: number,
  dur: number,
  type: OscillatorType = 'square',
  vol = 0.2,
  endFreq?: number,
  delay = 0
) {
  const c = getCtx();
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
    // ignore — audio không available
  }
}

export const sounds = {
  // ────────────────────────────────────────
  // Điều khiển piece
  // ────────────────────────────────────────
  move() {
    tone(200, 0.04, 'square', 0.1);
  },

  rotate() {
    tone(380, 0.05, 'square', 0.12);
    tone(500, 0.04, 'square', 0.08, undefined, 0.03);
  },

  softDrop() {
    tone(140, 0.035, 'square', 0.09);
  },

  hardDrop() {
    // Thud + bass thump
    tone(180, 0.05, 'sawtooth', 0.3, 60);
    tone(55, 0.18, 'sine', 0.35, undefined, 0.04);
  },

  lock() {
    tone(220, 0.07, 'square', 0.15, 110);
  },

  // ────────────────────────────────────────
  // Game events
  // ────────────────────────────────────────
  lineClear(lines: number) {
    if (lines >= 4) {
      // TETRIS! — 4 nốt ascending, fanfare
      [523, 659, 784, 1047].forEach((f, i) =>
        tone(f, 0.2, 'sine', 0.3, undefined, i * 0.07)
      );
    } else {
      // 1-3 lines: pop + shimmer
      const baseFreqs: Record<number, number> = { 1: 440, 2: 554, 3: 659 };
      const f = baseFreqs[lines] ?? 440;
      tone(f, 0.12, 'sine', 0.25);
      tone(f * 1.5, 0.09, 'sine', 0.12, undefined, 0.07);
    }
  },

  levelUp() {
    // Ascending arpeggio
    [523, 659, 784, 1047].forEach((f, i) =>
      tone(f, 0.13, 'sine', 0.22, undefined, i * 0.08)
    );
  },

  gameOver() {
    // Descending dramatic
    [380, 280, 190, 95].forEach((f, i) =>
      tone(f, 0.22, 'sawtooth', 0.28, undefined, i * 0.16)
    );
  },
};
