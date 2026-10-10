import { describe, it, expect } from 'vitest';
import { Chess } from 'chess.js';

describe('Chess Rules & PGN Processing', () => {
  it('correctly manages legal moves from starting position', () => {
    const chess = new Chess();
    const legalMoves = chess.moves({ verbose: true });
    // Standard starting position has 20 legal moves (16 pawn pushes + 4 knight jumps)
    expect(legalMoves.length).toBe(20);
  });

  it('correctly executes moves and outputs standard PGN', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('e5');
    chess.move('Nf3');
    chess.move('Nc6');

    const pgn = chess.pgn();
    expect(pgn).toContain('1. e4 e5 2. Nf3 Nc6');
    expect(chess.turn()).toBe('w');
  });

  it('loads PGN and restores position correctly', () => {
    const pgn = '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6';
    const chess = new Chess();
    chess.loadPgn(pgn);

    expect(chess.history().length).toBe(6);
    expect(chess.fen()).toContain('r1bqkbnr/1ppp1ppp/p1n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 4');
  });

  it('correctly detects check and checkmate (Fool\'s mate)', () => {
    const chess = new Chess();
    chess.move('f3');
    chess.move('e5');
    chess.move('g4');
    chess.move('Qh4#');

    expect(chess.inCheck()).toBe(true);
    expect(chess.isCheckmate()).toBe(true);
    expect(chess.isGameOver()).toBe(true);
  });

  it('supports undoing moves cleanly', () => {
    const chess = new Chess();
    chess.move('e4');
    chess.move('e5');
    expect(chess.history().length).toBe(2);

    const undone = chess.undo();
    expect(undone?.san).toBe('e5');
    expect(chess.history().length).toBe(1);
    expect(chess.turn()).toBe('b');
  });

  it('correctly executes kingside castling (petit roque)', () => {
    const chess = new Chess();
    chess.move('e4'); chess.move('e5');
    chess.move('Nf3'); chess.move('Nc6');
    chess.move('Bc4'); chess.move('Bc5');
    
    // White kingside castle
    const moveRes = chess.move({ from: 'e1', to: 'g1' });
    expect(moveRes?.san).toBe('O-O');
    expect(chess.get('g1')?.type).toBe('k');
    expect(chess.get('f1')?.type).toBe('r');
    expect(chess.get('e1')).toBeFalsy();
    expect(chess.get('h1')).toBeFalsy();
  });

  it('correctly executes queenside castling (grand roque)', () => {
    const chess = new Chess();
    chess.move('d4'); chess.move('d5');
    chess.move('Nc3'); chess.move('Nc6');
    chess.move('Bf4'); chess.move('Bf5');
    chess.move('Qd2'); chess.move('Qd7');

    // White queenside castle
    const moveRes = chess.move({ from: 'e1', to: 'c1' });
    expect(moveRes?.san).toBe('O-O-O');
    expect(chess.get('c1')?.type).toBe('k');
    expect(chess.get('d1')?.type).toBe('r');
    expect(chess.get('e1')).toBeFalsy();
    expect(chess.get('a1')).toBeFalsy();
  });
});
