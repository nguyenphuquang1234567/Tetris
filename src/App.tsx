// ============================================
// NEXUS TETRIS — Main App Component
// ============================================
import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import './App.css';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  CELL_SIZE,
  TETROMINOES,
  LINES_PER_LEVEL,
} from './constants';
import { useTetris } from './useTetris';

// DAS / ARR timings (ms) — chuẩn Tetris
const DAS_DELAY = 120;   // delay trước khi auto-repeat bắt đầu
const ARR_INTERVAL = 50; // tốc độ repeat sau đó

// ============ Helper: Render piece preview ============
function PiecePreview({ type, inactive }: { type: string | null; inactive?: boolean }) {
  if (!type) {
    return (
      <div className="preview-grid">
        {[0, 1].map(r => (
          <div className="preview-row" key={r}>
            {[0, 1, 2, 3].map(c => (
              <div className="preview-cell empty" key={c} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  const shape = TETROMINOES[type].shape[0];
  const color = TETROMINOES[type].color;
  const glow = TETROMINOES[type].glow;

  return (
    <div className={`preview-grid ${inactive ? 'hold-inactive' : ''}`}>
      {shape.map((row, r) => (
        <div className="preview-row" key={r}>
          {row.map((cell, c) => (
            <div
              className={`preview-cell ${cell ? 'filled' : 'empty'}`}
              key={c}
              style={
                cell
                  ? {
                    background: color,
                    '--cell-glow': glow,
                    boxShadow: `inset 0 0 4px rgba(255,255,255,0.25), 0 0 8px ${glow}`,
                  } as React.CSSProperties
                  : undefined
              }
            />
          ))}
        </div>
      ))}
    </div>
  );
}

// ============ Main App ============
function App() {
  const { state, actions } = useTetris();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [startLevel, setStartLevel] = useState(1);
  const [particles, setParticles] = useState<
    { id: number; x: number; y: number; color: string; drift: number }[]
  >([]);
  const dasTimerRef = useRef<number | null>(null);
  const arrTimerRef = useRef<number | null>(null);
  const [highScore, setHighScore] = useState(() => {
    try {
      return parseInt(localStorage.getItem('nexus-tetris-highscore') || '0', 10);
    } catch {
      return 0;
    }
  });

  // Save high score
  useEffect(() => {
    if (state.score > highScore) {
      setHighScore(state.score);
      try {
        localStorage.setItem('nexus-tetris-highscore', String(state.score));
      } catch {
        // ignore
      }
    }
  }, [state.score, highScore]);

  // ============ Canvas Rendering ============
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = BOARD_WIDTH * CELL_SIZE;
    const h = BOARD_HEIGHT * CELL_SIZE;
    canvas.width = w;
    canvas.height = h;

    // Clear
    ctx.fillStyle = 'rgba(5, 5, 20, 0.95)';
    ctx.fillRect(0, 0, w, h);

    // Draw grid dots
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        ctx.fillRect(col * CELL_SIZE + CELL_SIZE / 2 - 1, row * CELL_SIZE + CELL_SIZE / 2 - 1, 2, 2);
      }
    }

    // Draw locked cells
    for (let row = 0; row < BOARD_HEIGHT; row++) {
      for (let col = 0; col < BOARD_WIDTH; col++) {
        const cell = state.board[row][col];
        if (cell) {
          drawCell(ctx, col, row, cell, 1);
        }
      }
    }

    // Draw ghost piece
    if (state.currentPiece && state.status === 'playing') {
      const shape = TETROMINOES[state.currentPiece.type].shape[state.currentPiece.rotation];
      const color = TETROMINOES[state.currentPiece.type].color;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const gx = state.currentPiece.pos.x + c;
            const gy = state.ghostY + r;
            if (gy >= 0 && gy < BOARD_HEIGHT) {
              drawCell(ctx, gx, gy, color, 0.15);
            }
          }
        }
      }
    }

    // Draw current piece
    if (state.currentPiece && (state.status === 'playing' || state.status === 'paused')) {
      const shape = TETROMINOES[state.currentPiece.type].shape[state.currentPiece.rotation];
      const color = TETROMINOES[state.currentPiece.type].color;
      const glow = TETROMINOES[state.currentPiece.type].glow;
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            const px = state.currentPiece.pos.x + c;
            const py = state.currentPiece.pos.y + r;
            if (py >= 0 && py < BOARD_HEIGHT) {
              drawCell(ctx, px, py, color, 1, glow);
            }
          }
        }
      }
    }
  }, [state.board, state.currentPiece, state.ghostY, state.status]);

  function drawCell(
    ctx: CanvasRenderingContext2D,
    col: number,
    row: number,
    color: string,
    opacity: number,
    glow?: string
  ) {
    const x = col * CELL_SIZE;
    const y = row * CELL_SIZE;
    const pad = 1;
    const size = CELL_SIZE - pad * 2;
    const radius = 4;

    ctx.globalAlpha = opacity;

    // Glow
    if (glow && opacity >= 1) {
      ctx.shadowColor = glow;
      ctx.shadowBlur = 12;
    }

    // Fill
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x + pad, y + pad, size, size, radius);
    ctx.fill();

    // Inner highlight
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.roundRect(x + pad + 2, y + pad + 2, size - 4, size / 3, [radius, radius, 0, 0]);
    ctx.fill();

    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  // ============ Line Clear Particles ============
  useEffect(() => {
    if (state.lineClearEvent && state.lineClearEvent.rows.length > 0) {
      // Shake board
      if (boardRef.current) {
        boardRef.current.classList.remove('board-shake');
        void boardRef.current.offsetWidth; // trigger reflow
        boardRef.current.classList.add('board-shake');
      }

      // Spawn particles
      const newParticles: typeof particles = [];
      const colors = ['#00f0ff', '#b026ff', '#ff2d95', '#39ff14', '#ffe14d', '#fff'];
      for (const row of state.lineClearEvent.rows) {
        for (let col = 0; col < BOARD_WIDTH; col++) {
          for (let i = 0; i < 3; i++) {
            newParticles.push({
              id: Date.now() + row * 100 + col * 10 + i,
              x: col * CELL_SIZE + CELL_SIZE / 2 + (Math.random() - 0.5) * 10,
              y: row * CELL_SIZE + CELL_SIZE / 2,
              color: colors[Math.floor(Math.random() * colors.length)],
              drift: (Math.random() - 0.5) * 60,
            });
          }
        }
      }
      setParticles(newParticles);

      // Clear particles after animation
      const timer = setTimeout(() => setParticles([]), 900);
      return () => clearTimeout(timer);
    }
  }, [state.lineClearEvent]);

  // ============ DAS / ARR ============
  const clearDASARR = useCallback(() => {
    if (dasTimerRef.current !== null) {
      clearTimeout(dasTimerRef.current);
      dasTimerRef.current = null;
    }
    if (arrTimerRef.current !== null) {
      clearInterval(arrTimerRef.current);
      arrTimerRef.current = null;
    }
  }, []);

  const startDASARR = useCallback(
    (action: () => void) => {
      clearDASARR();
      dasTimerRef.current = window.setTimeout(() => {
        action();
        arrTimerRef.current = window.setInterval(action, ARR_INTERVAL);
      }, DAS_DELAY);
    },
    [clearDASARR]
  );

  // ============ Keyboard Controls ============
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Block native key repeat — DAS/ARR xử lý thay
      if (e.repeat) {
        e.preventDefault();
        return;
      }

      if (state.status === 'idle' || state.status === 'gameover') {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          actions.startGame(startLevel);
        }
        return;
      }

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        actions.togglePause();
        return;
      }

      if (state.status !== 'playing') return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          actions.moveLeft();
          startDASARR(actions.moveLeft);
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          e.preventDefault();
          actions.moveRight();
          startDASARR(actions.moveRight);
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          e.preventDefault();
          actions.softDrop();
          startDASARR(actions.softDrop);
          break;
        case 'ArrowUp':
        case 'w':
        case 'W':
          e.preventDefault();
          actions.rotate();
          break;
        case ' ':
          e.preventDefault();
          actions.hardDrop();
          break;
        case 'c':
        case 'C':
        case 'Shift':
          e.preventDefault();
          actions.holdPiece();
          break;
      }
    },
    [state.status, actions, startLevel, startDASARR]
  );

  const handleKeyUp = useCallback(
    (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
        case 'ArrowRight':
        case 'd':
        case 'D':
        case 'ArrowDown':
        case 's':
        case 'S':
          clearDASARR();
          break;
      }
    },
    [clearDASARR]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      clearDASARR();
    };
  }, [handleKeyDown, handleKeyUp, clearDASARR]);


  // ============ Level progress ============
  const levelProgress = useMemo(() => {
    const linesInLevel = state.lines % LINES_PER_LEVEL;
    return (linesInLevel / LINES_PER_LEVEL) * 100;
  }, [state.lines]);

  // ============ Render ============

  // Start Screen
  if (state.status === 'idle') {
    return (
      <div className="start-screen">
        <h1 className="game-title">NEXUS TETRIS</h1>
        <p className="game-subtitle">A Modern Block-Stacking Experience</p>

        <div className="start-features">
          <div className="feature-card">
            <div className="feature-icon">⚡</div>
            <div className="feature-name">Fast-Paced</div>
            <div className="feature-desc">Speed increases every level</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <div className="feature-name">Hold Piece</div>
            <div className="feature-desc">Save a piece for later</div>
          </div>
          <div className="feature-card">
            <div className="feature-icon">👻</div>
            <div className="feature-name">Ghost Piece</div>
            <div className="feature-desc">See where blocks land</div>
          </div>
        </div>

        {highScore > 0 && (
          <div style={{ marginBottom: 20, textAlign: 'center' }}>
            <div className="high-score-label">HIGH SCORE</div>
            <div className="high-score-value">{highScore.toLocaleString()}</div>
          </div>
        )}

        <button id="start-button" className="btn btn-primary" onClick={() => actions.startGame(startLevel)}>
          PRESS ENTER TO PLAY
        </button>

        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="panel-label" style={{ marginBottom: 12 }}>STARTING LEVEL: {startLevel}</div>
          <div style={{ display: 'flex', gap: 10 }}>
            {[1, 3, 5, 8, 10].map(lvl => (
              <button
                key={lvl}
                className={`btn ${startLevel === lvl ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '8px 16px', fontSize: '0.6rem' }}
                onClick={() => setStartLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <p style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', marginTop: 12 }}>
          or press <strong style={{ color: 'var(--neon-cyan)' }}>SPACE</strong> to start
        </p>
      </div>
    );
  }

  // Game Screen
  return (
    <div className="game-screen">
      <h1 className="game-title" style={{ fontSize: '1.4rem', marginBottom: 12 }}>
        NEXUS TETRIS
      </h1>

      <div className="game-container">
        {/* Left Panel */}
        <div className="side-panel left">
          <div className="panel-card">
            <div className="panel-label">Hold</div>
            <PiecePreview type={state.heldPiece} inactive={!state.canHold} />
          </div>

          <div className="panel-card">
            <div className="panel-label">Score</div>
            <div className="panel-value score">{state.score.toLocaleString()}</div>
            {highScore > 0 && (
              <>
                <div className="high-score-label">BEST</div>
                <div className="high-score-value">{highScore.toLocaleString()}</div>
              </>
            )}
          </div>

          <div className="panel-card">
            <div className="panel-label">Level</div>
            <div className="panel-value">{state.level}</div>
            <div className="level-progress">
              <div className="level-progress-fill" style={{ width: `${levelProgress}%` }} />
            </div>
          </div>

          <div className="panel-card">
            <div className="panel-label">Lines</div>
            <div className="panel-value">{state.lines}</div>
          </div>
        </div>

        {/* Board */}
        <div className="board-wrapper" ref={boardRef}>
          <div className="board-container">
            <canvas
              ref={canvasRef}
              className="board-canvas"
              width={BOARD_WIDTH * CELL_SIZE}
              height={BOARD_HEIGHT * CELL_SIZE}
              style={{ width: BOARD_WIDTH * CELL_SIZE, height: BOARD_HEIGHT * CELL_SIZE }}
            />

            {/* Particles */}
            {particles.length > 0 && (
              <div className="particles-container">
                {particles.map(p => (
                  <div
                    key={p.id}
                    className="particle"
                    style={{
                      left: p.x,
                      top: p.y,
                      background: p.color,
                      boxShadow: `0 0 6px ${p.color}`,
                      '--drift': `${p.drift}px`,
                    } as React.CSSProperties}
                  />
                ))}
              </div>
            )}

            {/* Game Over Overlay */}
            {state.status === 'gameover' && (
              <div className="overlay">
                <div className="overlay-title gameover">GAME OVER</div>
                <div className="overlay-score">
                  SCORE: {state.score.toLocaleString()} | LINES: {state.lines}
                </div>
                <button id="restart-button" className="btn btn-primary" onClick={() => actions.startGame(startLevel)}>
                  PLAY AGAIN
                </button>
                <div style={{ marginTop: 12 }}>
                  <button className="btn btn-secondary" onClick={actions.exitToMenu}>
                    EXIT TO HOME
                  </button>
                </div>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', marginTop: 10 }}>
                  Press ENTER to restart
                </p>
              </div>
            )}

            {/* Paused Overlay */}
            {state.status === 'paused' && (
              <div className="overlay">
                <div className="overlay-title paused">PAUSED</div>
                <div className="overlay-score">Press ESC or P to resume</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button className="btn btn-primary" onClick={actions.togglePause}>
                    RESUME
                  </button>
                  <button className="btn btn-secondary" onClick={actions.exitToMenu}>
                    QUIT
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="side-panel right">
          <div className="panel-card">
            <div className="panel-label">Next</div>
            <PiecePreview type={state.nextPiece?.type ?? null} />
          </div>

          <div className="panel-card controls-card">
            <div className="panel-label">Controls</div>
            <div className="controls-grid">
              <span className="control-key">← →</span>
              <span className="control-desc">Move</span>
              <span className="control-key">↑</span>
              <span className="control-desc">Rotate</span>
              <span className="control-key">↓</span>
              <span className="control-desc">Soft Drop</span>
              <span className="control-key">SPACE</span>
              <span className="control-desc">Hard Drop</span>
              <span className="control-key">C / SHIFT</span>
              <span className="control-desc">Hold</span>
              <span className="control-key">ESC</span>
              <span className="control-desc">Pause</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Controls */}
      <div className="mobile-controls">
        <button className="mobile-btn" onTouchStart={(e) => { e.preventDefault(); actions.moveLeft(); }}>◀</button>
        <button className="mobile-btn" onTouchStart={(e) => { e.preventDefault(); actions.rotate(); }}>⟳</button>
        <button className="mobile-btn" onTouchStart={(e) => { e.preventDefault(); actions.moveRight(); }}>▶</button>
        <button className="mobile-btn" onTouchStart={(e) => { e.preventDefault(); actions.softDrop(); }}>▼</button>
        <button className="mobile-btn wide" onTouchStart={(e) => { e.preventDefault(); actions.hardDrop(); }}>DROP</button>
        <button className="mobile-btn wide" onTouchStart={(e) => { e.preventDefault(); actions.holdPiece(); }}>HOLD</button>
      </div>
    </div>
  );
}

export default App;
