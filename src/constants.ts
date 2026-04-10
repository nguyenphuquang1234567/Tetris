// ============================================
// NEXUS TETRIS — Game Constants & Types
// ============================================

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const CELL_SIZE = 32;

// Tetromino shapes (each rotation state)
// Standard Tetris rotation system (SRS-like)
export const TETROMINOES: Record<string, { shape: number[][][]; color: string; glow: string }> = {
  I: {
    shape: [
      [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      [[0,0,1,0],[0,0,1,0],[0,0,1,0],[0,0,1,0]],
      [[0,0,0,0],[0,0,0,0],[1,1,1,1],[0,0,0,0]],
      [[0,1,0,0],[0,1,0,0],[0,1,0,0],[0,1,0,0]],
    ],
    color: '#00f0ff',
    glow: 'rgba(0, 240, 255, 0.5)',
  },
  O: {
    shape: [
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
      [[1,1],[1,1]],
    ],
    color: '#ffe14d',
    glow: 'rgba(255, 225, 77, 0.5)',
  },
  T: {
    shape: [
      [[0,1,0],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,1],[0,1,0]],
      [[0,1,0],[1,1,0],[0,1,0]],
    ],
    color: '#b026ff',
    glow: 'rgba(176, 38, 255, 0.5)',
  },
  S: {
    shape: [
      [[0,1,1],[1,1,0],[0,0,0]],
      [[0,1,0],[0,1,1],[0,0,1]],
      [[0,0,0],[0,1,1],[1,1,0]],
      [[1,0,0],[1,1,0],[0,1,0]],
    ],
    color: '#39ff14',
    glow: 'rgba(57, 255, 20, 0.5)',
  },
  Z: {
    shape: [
      [[1,1,0],[0,1,1],[0,0,0]],
      [[0,0,1],[0,1,1],[0,1,0]],
      [[0,0,0],[1,1,0],[0,1,1]],
      [[0,1,0],[1,1,0],[1,0,0]],
    ],
    color: '#ff3b3b',
    glow: 'rgba(255, 59, 59, 0.5)',
  },
  J: {
    shape: [
      [[1,0,0],[1,1,1],[0,0,0]],
      [[0,1,1],[0,1,0],[0,1,0]],
      [[0,0,0],[1,1,1],[0,0,1]],
      [[0,1,0],[0,1,0],[1,1,0]],
    ],
    color: '#4d7aff',
    glow: 'rgba(77, 122, 255, 0.5)',
  },
  L: {
    shape: [
      [[0,0,1],[1,1,1],[0,0,0]],
      [[0,1,0],[0,1,0],[0,1,1]],
      [[0,0,0],[1,1,1],[1,0,0]],
      [[1,1,0],[0,1,0],[0,1,0]],
    ],
    color: '#ff6b1a',
    glow: 'rgba(255, 107, 26, 0.5)',
  },
};

export const PIECE_TYPES = Object.keys(TETROMINOES);

// Scoring
export const POINTS_PER_LINE: Record<number, number> = {
  1: 100,
  2: 300,
  3: 500,
  4: 800, // Tetris!
};

export const LINES_PER_LEVEL = 10;

// Speed: milliseconds per drop (gets faster each level)
export function getDropInterval(level: number): number {
  // Rapid speed increase: starts at 800ms, decreases by 85ms per level, min 50ms
  return Math.max(50, 800 - (level - 1) * 85);
}

// Types
export interface Position {
  x: number;
  y: number;
}

export interface Piece {
  type: string;
  rotation: number;
  pos: Position;
}

export type CellValue = string | null; // null = empty, string = color

export type Board = CellValue[][];

export function createEmptyBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () =>
    Array.from({ length: BOARD_WIDTH }, () => null)
  );
}
