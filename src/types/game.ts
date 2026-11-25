export type PlayerRole = "civilian" | "undercover" | "mrwhite" | "spectator";

export type RoleDistribution = {
  undercovers: number;
  mrWhites: number;
};

export type Player = {
  id: string;
  name: string;
  word?: string;
  role?: PlayerRole;
  isEliminated?: boolean;
  score?: number;
  submittedDescription?: string;
};

// Snapshot of one round's comments, taken when voting starts
export type RoundRecord = {
  game: number;
  round: number;
  majorityWord: string;
  undercoverWord: string;
  entries: { playerId: string; name: string; role?: PlayerRole; text?: string }[];
  eliminatedId?: string;
};

export type GamePhase = "setup" | "wordReveal" | "discussion" | "voting" | "results" | "gameEnd";

export type GameState = {
  players: Player[];
  phase: GamePhase;
  currentRound: number;
  majorityWord: string;
  undercoverWord: string;
  votingResults?: Record<string, string>;
  speakingOrder?: string[];
  lastEliminatedId?: string;
  winner?: string;
  mrWhiteGuess?: string;
  roleDistribution: RoleDistribution;
  turnTimer?: number; // seconds per speaker turn, 0/undefined = no timer
  tieCandidates?: string[]; // set during a re-vote: only these players can be voted for
  gameNumber?: number; // increments every time a new game starts from setup
  history?: RoundRecord[];
};