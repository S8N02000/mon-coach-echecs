import { describe, it, expect } from 'vitest';
import { PromptBuilder } from '../main/ai/prompt-builder';

describe('PromptBuilder & AI Post-processing', () => {
  it('strips <think>...</think> tags cleanly from DeepSeek-R1 responses', () => {
    const raw = `<think>
L'utilisateur a fait une erreur en déplaçant son cavalier.
Je dois expliquer sans jargon technique.
</think>
Attention, ton cavalier n'était plus protégé ! L'adversaire a pu le capturer immédiatement avec son fou. Prends le temps de vérifier que tes pièces sont toujours défendues.`;

    const cleaned = PromptBuilder.cleanCoachResponse(raw);
    expect(cleaned).not.toContain('<think>');
    expect(cleaned).not.toContain('</think>');
    expect(cleaned).toContain('Attention, ton cavalier');
  });

  it('handles unclosed <think> tag if output was truncated', () => {
    const raw = `<think>
Analyse de la position en cours...`;

    const cleaned = PromptBuilder.cleanCoachResponse(raw);
    expect(cleaned).toBe('');
  });

  it('translates UCI sequence to clear French descriptions and extracts tactical steps', () => {
    // Starting position: 1. e4 e5 2. Nf3
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const uciLine = 'e2e4 e7e5 g1f3';

    const { readableText, steps } = PromptBuilder.translatePvToFrench(fen, uciLine, 'white');
    expect(readableText).toContain('Pion blanc se déplace en e4');
    expect(readableText).toContain('Pion noir se déplace en e5');
    expect(readableText).toContain('Cavalier blanc se déplace en f3');

    expect(steps).toHaveLength(3);
    expect(steps[0]).toMatchObject({
      step: 1,
      uci: 'e2e4',
      from: 'e2',
      to: 'e4',
      piece: 'p',
      color: 'white',
      isPupilMove: true,
    });
    expect(steps[1]).toMatchObject({
      step: 2,
      uci: 'e7e5',
      from: 'e7',
      to: 'e5',
      color: 'black',
      isPupilMove: false,
    });
  });

  it('identifies captures, captured piece types and checkmate in French translation', () => {
    // Scholar's mate setup: White queen attacks f7 with checkmate
    const fen = 'r1bqkb1r/pppp1ppp/2n5/4p3/2B1n3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 0 1';
    const uciLine = 'f3f7';

    const { readableText, steps } = PromptBuilder.translatePvToFrench(fen, uciLine, 'white');
    expect(readableText).toContain('Dame blanc prend le Pion en f7');
    expect(readableText).toContain('Échec et Mat');
    expect(steps[0].description).toContain('Dame blanc prend le Pion en f7');
  });

  it('correctly names captured Queen in tactical refutation', () => {
    // Setup where Black's pawn on g6 takes White's Queen on h5
    const fen = 'rnb1kbnr/pppp1p1p/6p1/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 3';
    const uciLine = 'g6h5';

    const { readableText, steps } = PromptBuilder.translatePvToFrench(fen, uciLine, 'white');
    expect(readableText).toContain('Pion noir prend la Dame en h5');
    expect(steps[0].isPupilMove).toBe(false);
  });

  it('extracts exact king positions from FEN with extractBoardFacts', () => {
    // Starting position: White king on e1, Black king on e8
    const startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const factsStart = PromptBuilder.extractBoardFacts(startingFen);
    expect(factsStart.whiteKingSq).toBe('e1');
    expect(factsStart.blackKingSq).toBe('e8');

    // Position from user screenshot: White king roqued in g1, Black king in e8
    const screenshotFen = 'r1b1kb1r/pp1n1ppp/4p3/3nN3/2Bp2B1/2Pp4/PP3PPP/RN1R2K1 w kq - 0 12';
    const factsScreen = PromptBuilder.extractBoardFacts(screenshotFen);
    expect(factsScreen.whiteKingSq).toBe('g1');
    expect(factsScreen.blackKingSq).toBe('e8');
  });

  it('builds adapted prompts with strict color awareness and king positions for White and Black pupils', () => {
    // Pupil is White
    const whitePupilMessages = PromptBuilder.buildMessages({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playerColor: 'white',
      coupJoue: 'f3',
      deltaScore: '-2.1 pions',
      refutationLisible: 'Pion noir e5...',
      meilleurCoup: 'e4',
      styleVocabulaire: 'debutant',
    });

    expect(whitePupilMessages[0].content).toContain('BLANCS');
    expect(whitePupilMessages[0].content).toContain('Le Roi des BLANCS est en e1');
    expect(whitePupilMessages[0].content).toContain('Le Roi des NOIRS est en e8');
    expect(whitePupilMessages[0].content).toContain('INTERDICTION');

    // Pupil is Black
    const blackPupilMessages = PromptBuilder.buildMessages({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playerColor: 'black',
      coupJoue: 'e5',
      deltaScore: '-0.3 pions',
      refutationLisible: 'Cavalier blanc f3...',
      meilleurCoup: 'e5',
      styleVocabulaire: 'club',
    });

    expect(blackPupilMessages[0].content).toContain('NOIRS');
    expect(blackPupilMessages[0].content).toContain('fourchette');
  });

  it('formats distinct prompts for Blunder vs Opponent Move scenarios', () => {
    // Blunder scenario
    const blunderMessages = PromptBuilder.buildMessages({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playerColor: 'white',
      coupJoue: 'f3',
      isBlunder: true,
      deltaScore: '-2.5 pions',
      refutationLisible: 'Pion noir e5',
      meilleurCoup: 'e4',
      styleVocabulaire: 'debutant',
    });

    expect(blunderMessages[1].content).toContain('ERREUR GRAVE');
    expect(blunderMessages[1].content).toContain('Riposte calculée');

    // Opponent move scenario
    const opponentMoveMessages = PromptBuilder.buildMessages({
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      playerColor: 'black',
      coupJoue: 'e4',
      whoPlayedLastMove: 'opponent',
      deltaScore: '+0.2 pions',
      refutationLisible: 'e7e5',
      meilleurCoup: 'e5',
      styleVocabulaire: 'debutant',
    });

    expect(opponentMoveMessages[1].content).toContain('ce n\'est PAS l\'élève qui a joué e4, c\'est l\'ADVERSAIRE');
    expect(opponentMoveMessages[1].content).toContain('Le Roi adverse est en');
  });

  it('translates English SAN into French SAN faithfully', () => {
    expect(PromptBuilder.translateSanToFrench('Rxh6')).toBe('Txh6');
    expect(PromptBuilder.translateSanToFrench('Bxh6')).toBe('Fxh6');
    expect(PromptBuilder.translateSanToFrench('Nf3')).toBe('Cf3');
    expect(PromptBuilder.translateSanToFrench('Qxd4')).toBe('Dxd4');
    expect(PromptBuilder.translateSanToFrench('Kg1')).toBe('Rg1');
    expect(PromptBuilder.translateSanToFrench('O-O')).toBe('O-O');
    expect(PromptBuilder.translateSanToFrench('O-O-O')).toBe('O-O-O');
    expect(PromptBuilder.translateSanToFrench('e4')).toBe('e4');
  });

  it('describes a move in plain French given a board position', () => {
    // Starting position: 1. e4
    const fen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const desc = PromptBuilder.describeMove(fen, 'e2e4');
    expect(desc.description).toContain('Pion blanc se déplace en e4');
    expect(desc.sanFr).toBe('e4');
  });

  it('enforces piece disambiguation instructions (Rook vs King) in system prompts', () => {
    const messages = PromptBuilder.buildMessages({
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      playerColor: 'white',
      coupJoue: 'Bxh6',
      coupJoueLisible: 'Fou blanc prend le Pion en h6',
      isBlunder: true,
      deltaScore: '-8.8 pions',
      refutationLisible: 'Tour noir prend le Fou en h6',
      meilleurCoup: 'g4',
      meilleurCoupLisible: 'Pion blanc se déplace en g4',
      styleVocabulaire: 'debutant',
    });

    // Check system prompt piece disambiguation
    expect(messages[0].content).toContain('DISTINCTION CRITIQUE DES PIÈCES');
    expect(messages[0].content).toContain('Ne confonds JAMAIS le Roi et la Tour');
    expect(messages[0].content).toContain('T = Tour');
    expect(messages[0].content).toContain('R = Roi');

    // Check user prompt has French description
    expect(messages[1].content).toContain('Fou blanc prend le Pion en h6');
    expect(messages[1].content).toContain('Pion blanc se déplace en g4');
    expect(messages[1].content).toContain('interdiction absolue d\'écrire que c\'est le Roi');
  });
});
