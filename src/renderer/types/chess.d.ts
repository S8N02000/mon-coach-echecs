import { Key } from 'chessground/types';

export type BotLevel = '1100' | '1300' | '1500' | '1700' | '1900' | '2100' | 'stockfish';
export type VocabularyStyle = 'debutant' | 'club';
export type PlayerColor = 'white' | 'black' | 'random';

export interface EvalResult {
  score: number | string;
  numericScore: number;
  bestMove: string;
  refutationLineUci: string;
  depth: number;
}

export interface MoveHistoryItem {
  san: string;
  fen: string;
  from?: Key;
  to?: Key;
  eval?: EvalResult;
  scoreDisplay?: string;
  numericScore?: number;
  delta?: number;
  quality?: 'blunder' | 'mistake' | 'inaccuracy' | 'good' | 'normal';
}

export interface TacticalStep {
  step: number;
  uci: string;
  from: string;
  to: string;
  piece: string;
  color: 'white' | 'black';
  san: string;
  description: string;
  isPupilMove: boolean;
}

export interface GameOverState {
  isGameOver: boolean;
  reason: 'checkmate' | 'stalemate' | 'threefold' | 'insufficient' | 'draw' | null;
  winner: 'white' | 'black' | 'draw' | null;
  userResult: 'win' | 'loss' | 'draw' | null;
  title: string;
  subtitle: string;
  scoreDisplay: string;
  isOpen: boolean;
}

export interface CoachPayload {
  fen: string;
  baseFen?: string;
  playerColor?: 'white' | 'black';
  coupJoue: string;
  coupJoueLisible?: string;
  whoPlayedLastMove?: 'player' | 'opponent' | 'none';
  isBlunder?: boolean;
  deltaScore: string;
  refutationLisible: string;
  refutationUci?: string;
  meilleurCoup: string;
  meilleurCoupLisible?: string;
  styleVocabulaire: VocabularyStyle;
  tacticalSteps?: TacticalStep[];
}

export interface CoachResponse {
  message: string;
  steps: TacticalStep[];
}

export interface ModelInfo {
  name: string;
  displayName: string;
  sizeFormatted: string;
  parameterSize: string;
  isInstalled: boolean;
  isRecommended: boolean;
  minVramGb: number;
  fitsVram: boolean;
  badge: string;
}

export interface GpuInfo {
  name: string;
  totalVramGb: number;
  freeVramGb: number;
  hasDedicatedGpu: boolean;
}

export type MaiaModelId = '5m' | '23m' | '79m';

export interface MaiaModelProfile {
  id: MaiaModelId;
  name: string;
  subName: string;
  badge: string;
  sizeMb: number;
  description: string;
  recommendedFor: string;
  isDownloaded: boolean;
  isActive: boolean;
  isRecommended: boolean;
}

export interface MaiaDownloadProgress {
  model: MaiaModelId;
  progress: number;
  downloadedMb: number;
  totalMb: number;
  status: 'downloading' | 'completed' | 'error';
  error?: string;
}

export interface SystemStatus {
  gpu: GpuInfo;
  ollama: {
    online: boolean;
    models: string[];
    installedModelDetails: ModelInfo[];
    recommendedCatalog: ModelInfo[];
    selectedModel: string;
  };
  engines: {
    stockfish: boolean;
    lc0: boolean;
    maia3?: boolean;
    activeEngineType?: 'maia3' | 'lc0' | 'stockfish';
    maiaWeights: Record<string, boolean>;
  };
  maia3Info?: {
    available: boolean;
    activeModel: MaiaModelId;
    recommendedModel: MaiaModelId;
    profiles: MaiaModelProfile[];
  };
}

export interface ProgressiveCoachMove {
  uci: string;
  san: string;
  fen: string;
  from: string;
  to: string;
  color: 'w' | 'b';
}

export interface TargetPieceInfo {
  type: string;
  square: string;
  nameFr: string;
}

export interface ProgressiveCoachResult {
  status: 'ATTACK' | 'DEFENSE';
  evalRefCp: number;
  evalNullCp: number;
  deltaCp: number;
  issueType: 'MATE' | 'MATERIAL' | 'POSITION';
  issueDelta: number;
  issueLabelFr: string;
  targetPiece: TargetPieceInfo | null;
  targetDescriptionFr: string;
  simulationMoves: ProgressiveCoachMove[];
}

export interface ProgressiveCoachState {
  enabled: boolean;
  currentLevel: 0 | 1 | 2 | 3;
  status: 'ATTACK' | 'DEFENSE';
  issueType: 'MATE' | 'MATERIAL' | 'POSITION';
  issueDelta: number;
  issueLabelFr: string;
  targetPiece: TargetPieceInfo | null;
  targetDescriptionFr: string;
  simulation: {
    active: boolean;
    stepIndex: number;
    moves: ProgressiveCoachMove[];
  };
  isLoading: boolean;
}

export interface ChessAPI {
  platform: string;
  setBotLevel(level: BotLevel): Promise<{ success: boolean }>;
  getBotMove(fen: string): Promise<string>;
  evaluatePosition(fen: string, depth?: number): Promise<EvalResult>;
  askCoach(payload: CoachPayload): Promise<CoachResponse | string>;
  getSystemStatus(): Promise<SystemStatus>;
  setOllamaModel(model: string): Promise<{ success: boolean }>;
  exportPgnFile(pgn: string, defaultName?: string): Promise<{ success: boolean; filePath?: string }>;
  getProgressiveCoachData(fen: string, playerColor: 'white' | 'black'): Promise<ProgressiveCoachResult>;
  setMaiaModel?(model: MaiaModelId): Promise<{ success: boolean; error?: string }>;
  downloadMaiaModel?(model: MaiaModelId): Promise<{ success: boolean; error?: string }>;
  onMaiaDownloadProgress?(callback: (data: MaiaDownloadProgress) => void): () => void;
}

declare global {
  interface Window {
    chessAPI: ChessAPI;
  }
}
