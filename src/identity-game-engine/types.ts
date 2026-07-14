import type { SeededRandomState } from "../card-game-engine/types";

export type IdentityGamePhase = "reveal" | "decision" | "match_complete";
export type IdentityPlayerStatus = "active" | "correct" | "eliminated";
export type IdentityPlayerKind = "human" | "bot";
export type AssistMode = "off" | "light" | "full";

export interface IdentityPlayerSetup {
  id: string;
  displayName: string;
  kind: IdentityPlayerKind;
}

export interface IdentityGuess {
  identityId: string;
  round: number;
  correct: boolean;
}

export interface IdentityPlayerState {
  id: string;
  displayName: string;
  kind: IdentityPlayerKind;
  hiddenIdentityId: string;
  revealDeck: string[];
  revealedCardIds: string[];
  yesCardIds: string[];
  noCardIds: string[];
  remainingGuesses: number;
  status: IdentityPlayerStatus;
  correctRound: number | null;
  guesses: IdentityGuess[];
  pendingDecision: { type: "continue" } | { type: "guess"; identityId: string } | null;
  markings: Record<string, "possible" | "unlikely" | "eliminated">;
}

export interface IdentityMatchResult {
  winnerPlayerIds: string[];
  winningRound: number | null;
  noWinner: boolean;
}

export interface IdentityMatchState {
  schemaVersion: "identity-match-v1";
  mode: "identity-casual";
  matchId: string;
  packId: string;
  contentVersion: string;
  seed: string;
  rng: SeededRandomState;
  phase: IdentityGamePhase;
  round: number;
  playerOrder: string[];
  players: Record<string, IdentityPlayerState>;
  revealedThisRoundPlayerIds: string[];
  assistMode: AssistMode;
  allowDuplicateIdentities: boolean;
  result: IdentityMatchResult | null;
  revision: number;
}

export interface CreateIdentityMatchOptions {
  seed: string | number;
  matchId?: string;
  players?: IdentityPlayerSetup[];
  assistMode?: AssistMode;
  allowDuplicateIdentities?: boolean;
}

export type IdentityGameCommand =
  | { type: "REVEAL_CARD"; playerId: string }
  | { type: "SUBMIT_CONTINUE"; playerId: string }
  | { type: "SUBMIT_GUESS"; playerId: string; identityId: string }
  | { type: "MARK_IDENTITY"; playerId: string; identityId: string; marking: "possible" | "unlikely" | "eliminated" | null };

export type IdentityGameErrorCode =
  | "INVALID_PHASE"
  | "INVALID_PLAYER_COUNT"
  | "UNKNOWN_PLAYER"
  | "PLAYER_INACTIVE"
  | "DECK_EMPTY"
  | "ALREADY_REVEALED"
  | "GUESS_LOCKED"
  | "UNKNOWN_IDENTITY"
  | "DECISION_ALREADY_SUBMITTED";

export interface IdentityGameError {
  code: IdentityGameErrorCode;
  message: string;
}

export interface IdentityTransitionResult {
  state: IdentityMatchState;
  errors: IdentityGameError[];
}

export interface BotKnowledge {
  identityIds: string[];
  yesCardIds: string[];
  noCardIds: string[];
  remainingGuesses: number;
  round: number;
}
