// ============================================
// NEXUS TETRIS — Game Engine (Custom Hook)
// ============================================
import { useState, useCallback, useRef, useEffect } from 'react';
import {
  BOARD_WIDTH,
  BOARD_HEIGHT,
  TETROMINOES,
  PIECE_TYPES,
  POINTS_PER_LINE,
  LINES_PER_LEVEL,
  getDropInterval,
  createEmptyBoard,
  type Board,
  type Piece,
  type CellValue,
} from './constants';

export type GameStatus = 'idle' | 'playing' | 'paused' | 'gameover';

export interface LineClearEvent {
  rows: number[];
  timestamp: number;
}

export interface GameState {
  board: Board;
  currentPiece: Piece | null;
  nextPiece: Piece | null;
  heldPiece: string | null;
  canHold: boolean;
  score: number;
  level: number;
  lines: number;
  status: GameStatus;
  lineClearEvent: LineClearEvent | null;
  ghostY: number;
}

// Generates a shuffled bag of all 7 pieces (7-bag randomizer)
function generateBag(): string[] {
  const bag = [...PIECE_TYPES];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

function getShape(piece: Piece): number[][] {
  return TETROMINOES[piece.type].shape[piece.rotation];
}

function isValidPosition(board: Board, piece: Piece, offsetX = 0, offsetY = 0): boolean {
  const shape = getShape(piece);
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const newX = piece.pos.x + col + offsetX;
        const newY = piece.pos.y + row + offsetY;
        if (newX < 0 || newX >= BOARD_WIDTH || newY >= BOARD_HEIGHT) return false;
        if (newY >= 0 && board[newY][newX] !== null) return false;
      }
    }
  }
  return true;
}

function getGhostY(board: Board, piece: Piece): number {
  let ghostOffset = 0;
  while (isValidPosition(board, piece, 0, ghostOffset + 1)) {
    ghostOffset++;
  }
  return piece.pos.y + ghostOffset;
}

function lockPiece(board: Board, piece: Piece): Board {
  const newBoard = board.map(row => [...row]);
  const shape = getShape(piece);
  const color = TETROMINOES[piece.type].color;
  for (let row = 0; row < shape.length; row++) {
    for (let col = 0; col < shape[row].length; col++) {
      if (shape[row][col]) {
        const x = piece.pos.x + col;
        const y = piece.pos.y + row;
        if (y >= 0 && y < BOARD_HEIGHT && x >= 0 && x < BOARD_WIDTH) {
          newBoard[y][x] = color;
        }
      }
    }
  }
  return newBoard;
}

function clearLines(board: Board): { newBoard: Board; clearedRows: number[] } {
  const clearedRows: number[] = [];
  const newBoard: CellValue[][] = [];

  for (let row = 0; row < BOARD_HEIGHT; row++) {
    if (board[row].every(cell => cell !== null)) {
      clearedRows.push(row);
    } else {
      newBoard.push([...board[row]]);
    }
  }

  while (newBoard.length < BOARD_HEIGHT) {
    newBoard.unshift(Array.from({ length: BOARD_WIDTH }, () => null));
  }

  return { newBoard, clearedRows };
}

export function useTetris() {
  const [state, setState] = useState<GameState>({
    board: createEmptyBoard(),
    currentPiece: null,
    nextPiece: null,
    heldPiece: null,
    canHold: true,
    score: 0,
    level: 1,
    lines: 0,
    status: 'idle',
    lineClearEvent: null,
    ghostY: 0,
  });

  const bagRef = useRef<string[]>([]);
  const dropTimerRef = useRef<number | null>(null);

  // FIX 1: Store latest drop fn in a ref so the interval never goes stale
  const dropFnRef = useRef<() => void>(() => {});

  const clearDropTimer = useCallback(() => {
    if (dropTimerRef.current !== null) {
      clearInterval(dropTimerRef.current);
      dropTimerRef.current = null;
    }
  }, []);

  const getNextPieceType = useCallback((): string => {
    if (bagRef.current.length === 0) {
      bagRef.current = generateBag();
    }
    return bagRef.current.pop()!;
  }, []);

  const spawnPiece = useCallback((type: string): Piece => {
    const shape = TETROMINOES[type].shape[0];
    const startX = Math.floor((BOARD_WIDTH - shape[0].length) / 2);
    return { type, rotation: 0, pos: { x: startX, y: -1 } };
  }, []);

  // ============ Core Actions ============

  const drop = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'playing' || !prev.currentPiece || !prev.nextPiece) return prev; // FIX 3: null guard

      if (isValidPosition(prev.board, prev.currentPiece, 0, 1)) {
        const newPiece = {
          ...prev.currentPiece,
          pos: { ...prev.currentPiece.pos, y: prev.currentPiece.pos.y + 1 },
        };
        return {
          ...prev,
          currentPiece: newPiece,
          ghostY: getGhostY(prev.board, newPiece),
        };
      }

      // Lock the piece
      const lockedBoard = lockPiece(prev.board, prev.currentPiece);
      const { newBoard, clearedRows } = clearLines(lockedBoard);

      const linesCleared = clearedRows.length;
      const pointsEarned = linesCleared > 0 ? (POINTS_PER_LINE[linesCleared] || 0) * prev.level : 0;
      const newLines = prev.lines + linesCleared;
      const newLevel = Math.floor(newLines / LINES_PER_LEVEL) + 1;
      const newScore = prev.score + pointsEarned;

      const nextType = getNextPieceType();
      const newCurrent = spawnPiece(prev.nextPiece.type); // FIX 3: no more non-null assertion

      // Check game over
      if (!isValidPosition(newBoard, newCurrent)) {
        clearDropTimer();
        return {
          ...prev,
          board: newBoard, // FIX 1 (minor): return cleared board on game over too
          currentPiece: null,
          score: newScore,
          lines: newLines,
          level: newLevel,
          status: 'gameover' as GameStatus,
          lineClearEvent: null,
        };
      }

      return {
        ...prev,
        board: newBoard,
        currentPiece: newCurrent,
        nextPiece: spawnPiece(nextType),
        canHold: true,
        score: newScore,
        lines: newLines,
        level: newLevel,
        ghostY: getGhostY(newBoard, newCurrent),
        lineClearEvent: linesCleared > 0 ? { rows: clearedRows, timestamp: Date.now() } : null,
      };
    });
  }, [getNextPieceType, spawnPiece, clearDropTimer]);

  // FIX 1: Keep dropFnRef always up-to-date without recreating the interval
  useEffect(() => {
    dropFnRef.current = drop;
  }, [drop]);

  // FIX 1: Manage timer via a SINGLE stable interval that reads from dropFnRef
  // This avoids timer flicker on level changes and pause/resume
  useEffect(() => {
    if (state.status !== 'playing') {
      clearDropTimer();
      return;
    }

    // Always restart the timer when status becomes 'playing' or level changes
    clearDropTimer();
    const interval = getDropInterval(state.level);
    dropTimerRef.current = window.setInterval(() => {
      dropFnRef.current();
    }, interval);

    return () => clearDropTimer();
  }, [state.status, state.level, clearDropTimer]);

  const moveLeft = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'playing' || !prev.currentPiece) return prev;
      if (!isValidPosition(prev.board, prev.currentPiece, -1, 0)) return prev;
      const newPiece = {
        ...prev.currentPiece,
        pos: { ...prev.currentPiece.pos, x: prev.currentPiece.pos.x - 1 },
      };
      return { ...prev, currentPiece: newPiece, ghostY: getGhostY(prev.board, newPiece) };
    });
  }, []);

  const moveRight = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'playing' || !prev.currentPiece) return prev;
      if (!isValidPosition(prev.board, prev.currentPiece, 1, 0)) return prev;
      const newPiece = {
        ...prev.currentPiece,
        pos: { ...prev.currentPiece.pos, x: prev.currentPiece.pos.x + 1 },
      };
      return { ...prev, currentPiece: newPiece, ghostY: getGhostY(prev.board, newPiece) };
    });
  }, []);

  const rotate = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'playing' || !prev.currentPiece) return prev;
      const newRotation = (prev.currentPiece.rotation + 1) % 4;
      const rotated: Piece = { ...prev.currentPiece, rotation: newRotation };
      if (isValidPosition(prev.board, rotated)) {
        return { ...prev, currentPiece: rotated, ghostY: getGhostY(prev.board, rotated) };
      }
      const kicks = [[-1, 0], [1, 0], [-2, 0], [2, 0], [0, -1]];
      for (const [kx, ky] of kicks) {
        const kicked: Piece = { ...rotated, pos: { x: rotated.pos.x + kx, y: rotated.pos.y + ky } };
        if (isValidPosition(prev.board, kicked)) {
          return { ...prev, currentPiece: kicked, ghostY: getGhostY(prev.board, kicked) };
        }
      }
      return prev;
    });
  }, []);

  const hardDrop = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'playing' || !prev.currentPiece || !prev.nextPiece) return prev; // FIX 3: null guard

      let dropDist = 0;
      while (isValidPosition(prev.board, prev.currentPiece, 0, dropDist + 1)) {
        dropDist++;
      }
      const droppedPiece: Piece = {
        ...prev.currentPiece,
        pos: { ...prev.currentPiece.pos, y: prev.currentPiece.pos.y + dropDist },
      };
      const lockedBoard = lockPiece(prev.board, droppedPiece);
      const { newBoard, clearedRows } = clearLines(lockedBoard);
      const linesCleared = clearedRows.length;
      const pointsEarned = (linesCleared > 0 ? (POINTS_PER_LINE[linesCleared] || 0) * prev.level : 0) + (dropDist * 2);
      const newLines = prev.lines + linesCleared;
      const newLevel = Math.floor(newLines / LINES_PER_LEVEL) + 1;
      const newScore = prev.score + pointsEarned;
      const nextType = getNextPieceType();
      const newCurrent = spawnPiece(prev.nextPiece.type); // FIX 3: no more non-null assertion

      if (!isValidPosition(newBoard, newCurrent)) {
        clearDropTimer();
        return {
          ...prev,
          board: newBoard,
          currentPiece: null,
          score: newScore,
          lines: newLines,
          level: newLevel,
          status: 'gameover',
        };
      }

      return {
        ...prev,
        board: newBoard,
        currentPiece: newCurrent,
        nextPiece: spawnPiece(nextType),
        canHold: true,
        score: newScore,
        lines: newLines,
        level: newLevel,
        ghostY: getGhostY(newBoard, newCurrent),
        lineClearEvent: linesCleared > 0 ? { rows: clearedRows, timestamp: Date.now() } : null,
      };
    });
  }, [getNextPieceType, spawnPiece, clearDropTimer]);

  const holdPiece = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'playing' || !prev.currentPiece || !prev.canHold || !prev.nextPiece) return prev; // FIX 3
      const currentType = prev.currentPiece.type;
      if (prev.heldPiece === null) {
        const nextType = getNextPieceType();
        const newCurrent = spawnPiece(prev.nextPiece.type); // FIX 3
        return {
          ...prev,
          heldPiece: currentType,
          currentPiece: newCurrent,
          nextPiece: spawnPiece(nextType),
          canHold: false,
          ghostY: getGhostY(prev.board, newCurrent),
        };
      }
      const newCurrent = spawnPiece(prev.heldPiece);
      if (!isValidPosition(prev.board, newCurrent)) return prev;
      return { ...prev, heldPiece: currentType, currentPiece: newCurrent, canHold: false, ghostY: getGhostY(prev.board, newCurrent) };
    });
  }, [getNextPieceType, spawnPiece]);

  const softDrop = useCallback(() => {
    setState(prev => {
      if (prev.status !== 'playing' || !prev.currentPiece) return prev;
      if (!isValidPosition(prev.board, prev.currentPiece, 0, 1)) return prev;
      const newPiece = { ...prev.currentPiece, pos: { ...prev.currentPiece.pos, y: prev.currentPiece.pos.y + 1 } };
      return { ...prev, currentPiece: newPiece, score: prev.score + 1, ghostY: getGhostY(prev.board, newPiece) };
    });
  }, []);

  const startGame = useCallback((initialLevel: number = 1) => {
    // FIX 2: Build the full bag and extract pieces BEFORE calling setState
    bagRef.current = generateBag(); // fresh bag
    const firstType = bagRef.current.pop()!;
    const secondType = bagRef.current.pop()!;
    // third piece stays in the bag naturally — NO post-setState push needed

    clearDropTimer();

    const first = spawnPiece(firstType);
    const board = createEmptyBoard();

    setState({
      board,
      currentPiece: first,
      nextPiece: spawnPiece(secondType),
      heldPiece: null,
      canHold: true,
      score: 0,
      level: initialLevel,
      lines: (initialLevel - 1) * LINES_PER_LEVEL,
      status: 'playing',
      lineClearEvent: null,
      ghostY: getGhostY(board, first),
    });
  }, [spawnPiece, clearDropTimer]);

  const togglePause = useCallback(() => {
    setState(prev => {
      if (prev.status === 'playing') {
        return { ...prev, status: 'paused' };
        // FIX 1: Don't clear timer manually here — the useEffect will handle it
        // when status changes away from 'playing'
      }
      if (prev.status === 'paused') {
        return { ...prev, status: 'playing' };
        // FIX 1: useEffect will restart timer when status becomes 'playing'
      }
      return prev;
    });
  }, []);

  const exitToMenu = useCallback(() => {
    clearDropTimer();
    setState(prev => ({ ...prev, status: 'idle' }));
  }, [clearDropTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => clearDropTimer();
  }, [clearDropTimer]);

  return {
    state,
    actions: {
      startGame,
      togglePause,
      moveLeft,
      moveRight,
      rotate,
      softDrop,
      hardDrop,
      holdPiece,
      drop,
      exitToMenu,
    },
  };
}
