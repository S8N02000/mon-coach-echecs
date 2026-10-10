import { describe, it, expect } from 'vitest';

function calculateScoreDelta(
  playerColor: 'white' | 'black',
  prevWhiteScore: number,
  afterWhiteScore: number
): { delta: number; isBlunder: boolean } {
  const prevPlayerScore = playerColor === 'white' ? prevWhiteScore : -prevWhiteScore;
  const newPlayerScore = playerColor === 'white' ? afterWhiteScore : -afterWhiteScore;
  const delta = newPlayerScore - prevPlayerScore;
  return {
    delta: Math.round(delta * 100) / 100,
    isBlunder: delta <= -2.0,
  };
}

describe('Blunder Detector Logic', () => {
  it('detects a blunder when White loses a minor piece (-3.0 pawns)', () => {
    // White was slightly ahead (+0.4) and blundered a piece -> now -2.8
    const { delta, isBlunder } = calculateScoreDelta('white', 0.4, -2.8);
    expect(delta).toBe(-3.2);
    expect(isBlunder).toBe(true);
  });

  it('detects a blunder when Black drops evaluation from +0.5 to -2.0', () => {
    // For Black: prevWhiteScore = -0.5 (Black is +0.5).
    // After blunder: afterWhiteScore = +2.0 (White is +2.0, so Black is -2.0).
    const { delta, isBlunder } = calculateScoreDelta('black', -0.5, 2.0);
    expect(delta).toBe(-2.5);
    expect(isBlunder).toBe(true);
  });

  it('ignores minor inaccuracies (delta = -0.6 pawns)', () => {
    const { delta, isBlunder } = calculateScoreDelta('white', 1.0, 0.4);
    expect(delta).toBe(-0.6);
    expect(isBlunder).toBe(false);
  });

  it('detects conceding forced checkmate', () => {
    // White was +1.0, now Black has forced mate (afterWhiteScore = -100)
    const { delta, isBlunder } = calculateScoreDelta('white', 1.0, -100);
    expect(delta).toBe(-101);
    expect(isBlunder).toBe(true);
  });
});
