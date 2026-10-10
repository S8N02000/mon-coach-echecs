import { EvalResult } from '../../renderer/types/chess';

export function parseUciOutput(lines: string[], targetDepth: number, fen?: string): EvalResult {
  let bestMove = '';
  let lastPv = '';
  let cpScore: number | null = null;
  let mateScore: number | null = null;
  let actualDepth = targetDepth;

  // Determine whose turn it is from FEN ('w' or 'b')
  const isBlackTurn = fen ? fen.split(' ')[1] === 'b' : false;

  for (const line of lines) {
    if (line.startsWith('bestmove')) {
      const parts = line.split(' ');
      const rawMove = parts[1] || '';
      bestMove = rawMove === '(none)' ? '' : rawMove;
    } else if (line.startsWith('info') && line.includes('score')) {
      const depthMatch = line.match(/depth\s+(\d+)/);
      if (depthMatch) {
        actualDepth = parseInt(depthMatch[1], 10);
      }

      const cpMatch = line.match(/score\s+cp\s+(-?\d+)/);
      if (cpMatch) {
        cpScore = parseInt(cpMatch[1], 10);
        mateScore = null;
      }

      const mateMatch = line.match(/score\s+mate\s+(-?\d+)/);
      if (mateMatch) {
        mateScore = parseInt(mateMatch[1], 10);
        cpScore = null;
      }

      const pvMatch = line.match(/\spv\s+(.+)$/);
      if (pvMatch) {
        lastPv = pvMatch[1].trim();
      }
    }
  }

  // Convert to relative/absolute score
  // In Stockfish, positive cp is good for the side to move.
  // Normalized numericScore will be from WHITE's perspective:
  let whiteRelativeNumeric = 0;
  let displayScore: string | number = 0;

  if (mateScore !== null) {
    // In UCI protocol:
    // mateScore > 0 : side to move will mate in X turns (advantage side to move)
    // mateScore < 0 : side to move is mated in Math.abs(mateScore) turns (advantage opponent)
    // mateScore === 0 : side to move is ALREADY checkmated (advantage opponent)
    const advantageSideToMove = mateScore > 0;
    const isWhiteWinning = isBlackTurn ? !advantageSideToMove : advantageSideToMove;
    const mateTurns = Math.abs(mateScore);

    whiteRelativeNumeric = isWhiteWinning ? 100 : -100;
    displayScore = isWhiteWinning ? `+M${mateTurns}` : `-M${mateTurns}`;
  } else if (cpScore !== null) {
    const pawnScore = cpScore / 100;
    whiteRelativeNumeric = isBlackTurn ? -pawnScore : pawnScore;
    displayScore = (whiteRelativeNumeric > 0 ? '+' : '') + whiteRelativeNumeric.toFixed(2);
  }

  return {
    score: displayScore,
    numericScore: Math.max(-10, Math.min(10, whiteRelativeNumeric)),
    bestMove,
    refutationLineUci: lastPv,
    depth: actualDepth,
  };
}
