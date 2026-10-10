import { Chess } from 'chess.js';
import { CoachPayload, TacticalStep, VocabularyStyle } from '../../renderer/types/chess';

export class PromptBuilder {
  /**
   * Traduit la notation algébrique SAN anglaise en notation française standard :
   * K -> R (Roi), Q -> D (Dame), R -> T (Tour), B -> F (Fou), N -> C (Cavalier).
   * Ex: "Rxh6" -> "Txh6", "Bxh6" -> "Fxh6", "Nf3" -> "Cf3", "O-O" -> "O-O".
   */
  public static translateSanToFrench(san: string): string {
    if (!san) return '';
    if (san.startsWith('O-O')) return san;
    return san.replace(/^[KQBNR]/, (match) => {
      switch (match) {
        case 'K': return 'R'; // King -> Roi
        case 'Q': return 'D'; // Queen -> Dame
        case 'R': return 'T'; // Rook -> Tour
        case 'B': return 'F'; // Bishop -> Fou
        case 'N': return 'C'; // Knight -> Cavalier
        default: return match;
      }
    });
  }

  /**
   * Convertit un coup (UCI ou SAN) en description textuelle explicite en français
   * avec identification précise de la pièce qui bouge et de la pièce capturée.
   */
  public static describeMove(
    fen: string,
    moveStr: string,
    playerColor: 'white' | 'black' = 'white'
  ): { sanFr: string; description: string } {
    if (!moveStr) return { sanFr: '', description: '' };

    try {
      const chess = new Chess(fen);
      const moves = chess.moves({ verbose: true });
      let moveObj = moves.find((m) => m.san === moveStr);
      if (!moveObj && moveStr.length >= 4) {
        const from = moveStr.slice(0, 2);
        const to = moveStr.slice(2, 4);
        const promo = moveStr.length > 4 ? moveStr[4] : undefined;
        moveObj = moves.find(
          (m) => m.from === from && m.to === to && (!promo || m.promotion === promo)
        );
      }

      if (moveObj) {
        const pieceNamesFr: Record<string, string> = {
          p: 'Pion', n: 'Cavalier', b: 'Fou', r: 'Tour', q: 'Dame', k: 'Roi'
        };
        const capturedArticles: Record<string, string> = {
          p: 'le Pion', n: 'le Cavalier', b: 'le Fou', r: 'la Tour', q: 'la Dame', k: 'le Roi'
        };
        const pieceName = pieceNamesFr[moveObj.piece] || 'Pièce';
        const side = moveObj.color === 'w' ? 'blanc' : 'noir';
        const isCapture = moveObj.captured
          ? ` prend ${capturedArticles[moveObj.captured] || 'la pièce'} en ${moveObj.to}`
          : ` se déplace en ${moveObj.to}`;
        const isCheck = moveObj.san.includes('+') ? ' (avec échec au Roi)' : '';
        const isCheckmate = moveObj.san.includes('#') ? ' (Échec et Mat)' : '';
        const sanFr = PromptBuilder.translateSanToFrench(moveObj.san);
        return {
          sanFr,
          description: `${pieceName} ${side}${isCapture}${isCheck}${isCheckmate}`,
        };
      }
    } catch (_) {}

    return {
      sanFr: PromptBuilder.translateSanToFrench(moveStr),
      description: PromptBuilder.translateSanToFrench(moveStr),
    };
  }

  /**
   * Traduit une ligne UCI (ex: "e7e5 f1c4 g8f6") en une suite d'explications en français clair
   * avec identification précise des pièces prises et extraction des étapes tactiques individuelles.
   */
  public static translatePvToFrench(
    fen: string,
    uciLine: string,
    playerColor: 'white' | 'black' = 'white'
  ): { readableText: string; steps: TacticalStep[] } {
    if (!uciLine || !uciLine.trim()) {
      return { readableText: 'Aucune suite tactique directe calculée.', steps: [] };
    }

    try {
      const chess = new Chess(fen);
      const moves = uciLine.trim().split(/\s+/).slice(0, 4); // Limiter à 4 demi-coups pour la lisibilité
      const descriptions: string[] = [];
      const steps: TacticalStep[] = [];

      const pieceNamesFr: Record<string, string> = {
        p: 'Pion',
        n: 'Cavalier',
        b: 'Fou',
        r: 'Tour',
        q: 'Dame',
        k: 'Roi',
      };

      const capturedArticles: Record<string, string> = {
        p: 'le Pion',
        n: 'le Cavalier',
        b: 'le Fou',
        r: 'la Tour',
        q: 'la Dame',
        k: 'le Roi',
      };

      for (let i = 0; i < moves.length; i++) {
        const uci = moves[i];
        const from = uci.slice(0, 2);
        const to = uci.slice(2, 4);
        const promotion = uci.length > 4 ? uci[4] : undefined;

        const legalMoves = chess.moves({ verbose: true });
        const moveObj = legalMoves.find(
          (m) => m.from === from && m.to === to && (!promotion || m.promotion === promotion)
        );

        if (!moveObj) {
          break;
        }

        const pieceName = pieceNamesFr[moveObj.piece] || 'Pièce';
        const side = moveObj.color === 'w' ? 'blanc' : 'noir';
        const isCapture = moveObj.captured
          ? ` prend ${capturedArticles[moveObj.captured] || 'la pièce'} en ${to}`
          : ` se déplace en ${to}`;
        const isCheck = moveObj.san.includes('+') ? ' (avec échec au Roi)' : '';
        const isCheckmate = moveObj.san.includes('#') ? ' (Échec et Mat)' : '';

        const fullDesc = `${pieceName} ${side}${isCapture}${isCheck}${isCheckmate}`;
        descriptions.push(fullDesc);

        const moveColor: 'white' | 'black' = moveObj.color === 'w' ? 'white' : 'black';
        const sanFr = PromptBuilder.translateSanToFrench(moveObj.san);
        steps.push({
          step: i + 1,
          uci,
          from,
          to,
          piece: moveObj.piece,
          color: moveColor,
          san: sanFr,
          description: fullDesc,
          isPupilMove: moveColor === playerColor,
        });

        chess.move(moveObj);
      }

      const readableText = descriptions.length > 0 ? descriptions.join(', puis ') + '.' : uciLine;
      return { readableText, steps };
    } catch (e) {
      return { readableText: uciLine, steps: [] };
    }
  }

  /**
   * Extrait avec certitude les positions réelles des pièces depuis le FEN
   * pour interdire à l'IA d'halluciner l'emplacement des rois et des pièces.
   */
  public static extractBoardFacts(fen: string): {
    whiteKingSq: string;
    blackKingSq: string;
  } {
    try {
      const chess = new Chess(fen);
      let whiteKingSq = 'g1';
      let blackKingSq = 'e8';

      const board = chess.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const piece = board[r][c];
          if (piece && piece.type === 'k') {
            const sq = `${String.fromCharCode(97 + c)}${8 - r}`;
            if (piece.color === 'w') whiteKingSq = sq;
            if (piece.color === 'b') blackKingSq = sq;
          }
        }
      }
      return { whiteKingSq, blackKingSq };
    } catch {
      return { whiteKingSq: 'g1', blackKingSq: 'e8' };
    }
  }

  public static buildMessages(payload: CoachPayload): { role: 'system' | 'user'; content: string }[] {
    const isDebutant = payload.styleVocabulaire === 'debutant';
    const playerCol = payload.playerColor || 'white';
    const isWhite = playerCol === 'white';
    const couleurEleve = isWhite ? 'BLANCS' : 'NOIRS';
    const couleurAdversaire = isWhite ? 'NOIRS' : 'BLANCS';

    const facts = PromptBuilder.extractBoardFacts(payload.fen);
    const roiEleve = isWhite ? facts.whiteKingSq : facts.blackKingSq;
    const roiAdversaire = isWhite ? facts.blackKingSq : facts.whiteKingSq;

    const systemPrompt = isDebutant
      ? `Tu es un grand maître et coach d'échecs bienveillant, chaleureux et très pédagogue pour un joueur grand débutant.
RÈGLES STRICTES ET ABSOLUES :
1. LANGUE OBLIGATOIRE : Rédige l'intégralité de ta réponse EXCLUSIVEMENT en langue française. Il est STRICTEMENT INTERDIT d'écrire en anglais.
2. DISTINCTION CRITIQUE DES PIÈCES :
   - Ne confonds JAMAIS le Roi et la Tour !
   - En notation française, T = Tour (R en anglais pour Rook) et R = Roi (K en anglais pour King).
   - Fais scrupuleusement attention à ne JAMAIS attribuer une capture de Tour au Roi !
3. L'élève auquel tu t'adresses joue TOUJOURS avec les ${couleurEleve}. L'adversaire joue avec les ${couleurAdversaire}.
4. Le Roi des ${couleurEleve} est en ${roiEleve}. Le Roi des ${couleurAdversaire} est en ${roiAdversaire}. Ne prétends JAMAIS qu'un Roi se trouve sur une autre case !
5. Ne confonds JAMAIS les pièces des ${couleurEleve} avec celles des ${couleurAdversaire}.
6. INTERDICTION FORMELLE d'inventer des pièces, des cases ou des attaques inexistantes. Base tes explications UNIQUEMENT sur la suite tactique et les faits réels fournis par le moteur.
7. INTERDICTION d'utiliser du jargon technique abstrait ou intimidant (pas de "zugzwang", "enfilade", "avant-poste").
8. Utilise des explications concrètes et visuelles (ex: "ta pièce n'est pas protégée", "l'adversaire peut capturer ton cavalier", "replie ton fou en sécurité").
9. Sois très concis : explique la situation en 2 phrases maximum.
10. Reste toujours encourageant et positif.`
      : `Tu es un entraîneur d'échecs de haut niveau pour un joueur de club (niveau intermédiaire).
RÈGLES STRICTES :
1. LANGUE OBLIGATOIRE : Rédige l'intégralité de ta réponse EXCLUSIVEMENT en langue française. Il est STRICTEMENT INTERDIT d'écrire en anglais.
2. DISTINCTION CRITIQUE DES PIÈCES :
   - Ne confonds JAMAIS le Roi et la Tour ! En notation française, T = Tour et R = Roi.
   - Respecte fidèlement les pièces identifiées dans les étapes fournies.
3. L'élève joue avec les ${couleurEleve} (Roi en ${roiEleve}), l'adversaire joue avec les ${couleurAdversaire} (Roi en ${roiAdversaire}).
4. Base-toi STRICTEMENT sur les faits fournis par le moteur Stockfish. Ne déplace jamais les rois sur des cases imaginaires.
5. Identifie précisément les motifs tactiques (fourchette, clouage, pièce non défendue, tempo, case faible).
6. Sois concis et percutant : 2 phrases maximum.
7. Donne un conseil concret pour progresser.`;

    const formatSteps = () => {
      if (payload.tacticalSteps && payload.tacticalSteps.length > 0) {
        return payload.tacticalSteps
          .map((s) => {
            const pieceFr = s.piece === 'r' ? 'la TOUR' : s.piece === 'k' ? 'le ROI' : s.piece === 'b' ? 'le FOU' : s.piece === 'n' ? 'le CAVALIER' : s.piece === 'q' ? 'la DAME' : 'le PION';
            return `  - Coup ${s.step} (${s.color === 'white' ? 'Blancs' : 'Noirs'}) : ${s.description} [${s.san}]. (C'est bien ${pieceFr} qui effectue ce coup, ne confonds pas avec une autre pièce !)`;
          })
          .join('\n');
      }
      return `  - ${payload.refutationLisible}`;
    };

    const coupJoueTexte = payload.coupJoueLisible
      ? `${payload.coupJoueLisible} (${PromptBuilder.translateSanToFrench(payload.coupJoue)})`
      : `${PromptBuilder.translateSanToFrench(payload.coupJoue)}`;

    const meilleurCoupTexte = payload.meilleurCoupLisible && payload.meilleurCoupLisible !== payload.meilleurCoup
      ? `${payload.meilleurCoupLisible} (${PromptBuilder.translateSanToFrench(payload.meilleurCoup)})`
      : `${PromptBuilder.translateSanToFrench(payload.meilleurCoup || 'un coup plus solide')}`;

    let userPrompt = '';

    if (payload.isBlunder) {
      // Cas 1 : L'élève vient de commettre une gaffe (détectée par le garde-fou)
      userPrompt = `SITUATION RÉELLE SUR L'ÉCHIQUIER (Source officielle moteur Stockfish) :
- L'élève joue avec les ${couleurEleve} (son Roi est en ${roiEleve}).
- L'adversaire (${couleurAdversaire}) a son Roi en ${roiAdversaire}.
- L'élève a voulu jouer le coup : ${coupJoueTexte}.
- Ce coup est une ERREUR GRAVE (perte estimée : ${payload.deltaScore}).
- Riposte calculée par Stockfish pour les ${couleurAdversaire} :
${formatSteps()}
- Meilleur coup alternatif que l'élève (${couleurEleve}) aurait dû jouer à la place : ${meilleurCoupTexte}.

CONSIGNES STRICTES :
1. Explique directement à l'élève (${couleurEleve}) en 2 phrases simples et percutantes pourquoi son coup (${coupJoueTexte}) est dangereux ou perd du matériel face à la riposte des ${couleurAdversaire}.
2. Précise pourquoi le coup alternatif (${meilleurCoupTexte}) était bien plus solide.
3. RÈGLE CRUCIALE : Respecte scrupuleusement la pièce indiquée dans la riposte (si la Tour adverse prend, interdiction absolue d'écrire que c'est le Roi !).
CONSIGNE LINGUISTIQUE ABSOLUE : Rédige ta réponse EXCLUSIVEMENT en français.`;
    } else if (payload.whoPlayedLastMove === 'opponent') {
      // Cas 2 : L'adversaire vient de jouer, l'élève demande conseil avant de jouer son coup
      userPrompt = `SITUATION RÉELLE SUR L'ÉCHIQUIER (Source officielle moteur Stockfish) :
- L'élève joue avec les ${couleurEleve} (son Roi est en ${roiEleve}).
- L'adversaire (${couleurAdversaire}) a son Roi en ${roiAdversaire}.
- L'adversaire (${couleurAdversaire}) vient de jouer le coup : ${coupJoueTexte}.
- Évaluation de la position : ${payload.deltaScore}.
- Meilleur coup recommandé pour l'élève (${couleurEleve}) : ${meilleurCoupTexte}.
- Suite tactique optimale calculée par Stockfish :
${formatSteps()}

ATTENTION : ce n'est PAS l'élève qui a joué ${coupJoueTexte}, c'est l'ADVERSAIRE (${couleurAdversaire}).
Le Roi adverse est en ${roiAdversaire}, interdiction de dire qu'il est ailleurs.
Explique à l'élève (${couleurEleve}) en 2 phrases simples :
1. Pourquoi le coup recommandé (${meilleurCoupTexte}) est le meilleur choix pour son camp.
2. Comment réagir face au coup adverse (${coupJoueTexte}).
CONSIGNE LINGUISTIQUE ABSOLUE : Rédige ta réponse EXCLUSIVEMENT en français.`;
    } else {
      // Cas 3 : L'élève a joué un coup normal/bon
      userPrompt = `SITUATION RÉELLE SUR L'ÉCHIQUIER (Source officielle moteur Stockfish) :
- L'élève joue avec les ${couleurEleve} (Roi en ${roiEleve}, Roi adverse en ${roiAdversaire}).
- L'élève vient de jouer : ${coupJoueTexte}.
- Évaluation de la position : ${payload.deltaScore}.
- Suite conseillée par Stockfish :
${formatSteps()}

Donne un conseil pédagogique bienveillant en 2 phrases à l'élève (${couleurEleve}) sur l'intérêt de son coup (${coupJoueTexte}) et la stratégie à suivre.
CONSIGNE LINGUISTIQUE ABSOLUE : Rédige ta réponse EXCLUSIVEMENT en français.`;
    }

    return [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];
  }

  /**
   * Élimine les balises <think>...</think> générées par les modèles de raisonnement (DeepSeek-R1)
   * et nettoie le texte pour l'utilisateur final.
   */
  public static cleanCoachResponse(rawText: string): string {
    if (!rawText) return '';

    // Supprime les blocs complets <think>...</think> (insensible à la casse, multiline)
    let cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '');

    // Supprime une balise <think> orpheline non refermée
    cleaned = cleaned.replace(/<think>[\s\S]*$/gi, '');

    // Supprime d'éventuelles balises </think> résiduelles
    cleaned = cleaned.replace(/<\/think>/gi, '');

    return cleaned.trim();
  }
}
