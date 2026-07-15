import type {
  CardCategory,
  CardVisibility,
  InvestigationCard,
} from "../card-content/types";

export type MatchPhase =
  | "match_intro"
  | "round_draw"
  | "card_selection"
  | "cards_locked"
  | "card_reveal"
  | "clue_review"
  | "diagnosis_window"
  | "next_round"
  | "match_complete";

export type PlayerKind = "human" | "bot";
export type BotStyle = "balanced";

export interface MatchPlayerSetup {
  id: string;
  displayName: string;
  kind: PlayerKind;
  botStyle?: BotStyle;
}

export interface CardInstance {
  instanceId: string;
  cardId: string;
}

export interface PlayerHand {
  cards: CardInstance[];
  selectedCardInstanceId: string | null;
  locked: boolean;
}

export interface PlayerDeckState {
  drawPile: CardInstance[];
  discardPile: CardInstance[];
}

export interface ClueReveal {
  clueId: string;
  round: number;
  sourceId: string;
}

export interface PublicClue extends ClueReveal {
  visibility: "public";
}

export interface PrivateClue extends ClueReveal {
  visibility: "private";
  playerId: string;
}

export interface CardPlay {
  playerId: string;
  round: number;
  cardId: string;
  cardInstanceId: string;
  displayName: string;
  category: CardCategory;
  visibility: CardVisibility;
  revealedNewClue: boolean;
  publicClueIds: string[];
}

export interface DiagnosisSubmission {
  conditionId: string;
  clueIds: [string, string];
  round: number;
  correct: boolean;
}

export interface PlayerScore {
  playerId: string;
  correctDiagnosis: number;
  supportingClues: number;
  timing: number;
  efficientInvestigation: number;
  achievement: number;
  achievementId: string | null;
  wrongAttemptPenalty: number;
  total: number;
}

export interface PlayerState {
  id: string;
  displayName: string;
  kind: PlayerKind;
  botStyle: BotStyle | null;
  hand: PlayerHand;
  deck: PlayerDeckState;
  privateClues: PrivateClue[];
  plays: CardPlay[];
  redrawAvailable: boolean;
  diagnosisAttemptsUsed: number;
  diagnosisLockedUntilRound: number | null;
  diagnosisSubmissions: DiagnosisSubmission[];
  correctDiagnosisRound: number | null;
  finalDiagnosisSubmitted: boolean;
  unhelpfulHandStreak: number;
  score: PlayerScore | null;
}

export interface SharedEvent {
  eventId: string;
  round: 2 | 3;
  revealed: boolean;
}

export interface SeededRandomState {
  initialSeed: string;
  state: number;
  draws: number;
}

export interface MatchResult {
  rankings: Array<{ playerId: string; placement: number; score: PlayerScore }>;
  winnerPlayerIds: string[];
  correctConditionId: string;
  winningTieBreak: RankingReason;
}

export type RankingReason =
  | "only_player"
  | "correct_diagnosis"
  | "total_score"
  | "evidence_score"
  | "earlier_correct_round"
  | "fewer_wrong_diagnoses"
  | "more_unique_discoveries"
  | "seeded_mystery_draw";

export interface MatchEvent {
  sequence: number;
  type:
    | "match_created"
    | "match_started"
    | "cards_dealt"
    | "card_selected"
    | "card_deselected"
    | "hand_redrawn"
    | "card_locked"
    | "all_cards_locked"
    | "card_revealed"
    | "private_clue_revealed"
    | "public_clue_revealed"
    | "shared_event_revealed"
    | "reveal_acknowledged"
    | "diagnosis_window_opened"
    | "diagnosis_submitted"
    | "diagnosis_passed"
    | "player_replaced_by_bot"
    | "diagnosis_incorrect"
    | "diagnosis_correct"
    | "next_round_ready"
    | "round_started"
    | "match_completed";
  round: number;
  relatedIds: string[];
  payload: Record<string, string | number | boolean | null>;
}

export interface MatchState {
  matchId: string;
  caseId: string;
  variantId: string;
  schemaVersion: "card-match-v1";
  caseSchemaVersion: "card-case-v1";
  contentVersion: string;
  seed: string;
  rng: SeededRandomState;
  phase: MatchPhase;
  currentRound: number;
  maximumRounds: 4;
  playerOrder: string[];
  players: Record<string, PlayerState>;
  publicClues: PublicClue[];
  sharedEvent: SharedEvent;
  acknowledgedRevealPlayerIds: string[];
  diagnosisPassedPlayerIds: string[];
  latestPlays: CardPlay[];
  result: MatchResult | null;
  eventLog: MatchEvent[];
  revision: number;
}

export interface CreateCardMatchOptions {
  seed: string | number;
  matchId?: string;
  players?: MatchPlayerSetup[];
  variantId?: string;
}

export type CardGameCommand =
  | { type: "START_MATCH" }
  | { type: "DRAW_CARDS" }
  | { type: "SELECT_CARD"; playerId: string; cardInstanceId: string }
  | { type: "DESELECT_CARD"; playerId: string }
  | { type: "USE_REDRAW"; playerId: string }
  | { type: "LOCK_CARD"; playerId: string }
  | { type: "RESOLVE_ROUND" }
  | { type: "ACKNOWLEDGE_REVEAL"; playerId: string }
  | { type: "OPEN_DIAGNOSIS_WINDOW" }
  | {
      type: "SUBMIT_DIAGNOSIS";
      playerId: string;
      conditionId: string;
      clueIds: [string, string];
    }
  | { type: "PASS_DIAGNOSIS"; playerId: string }
  | { type: "CONVERT_TO_BOT"; playerId: string }
  | { type: "CONTINUE_FROM_DIAGNOSIS" }
  | { type: "ADVANCE_ROUND" }
  | { type: "COMPLETE_MATCH" };

export type CardGameErrorCode =
  | "INVALID_COMMAND"
  | "INVALID_PHASE"
  | "INVALID_PLAYER_COUNT"
  | "UNKNOWN_PLAYER"
  | "UNKNOWN_CARD"
  | "CARD_NOT_IN_HAND"
  | "CARD_NOT_SELECTED"
  | "CARD_ALREADY_LOCKED"
  | "CARDS_NOT_LOCKED"
  | "REDRAW_ALREADY_USED"
  | "DIAGNOSIS_LOCKED"
  | "DIAGNOSIS_ATTEMPTS_EXHAUSTED"
  | "DIAGNOSIS_ALREADY_CORRECT"
  | "DIAGNOSIS_REQUIRED"
  | "UNKNOWN_CONDITION"
  | "INVALID_SUPPORTING_CLUES"
  | "UNKNOWN_CONTENT";

export interface CardGameError {
  code: CardGameErrorCode;
  message: string;
  relatedId?: string;
}

export interface CardGameTransitionResult {
  state: MatchState;
  events: MatchEvent[];
  errors: CardGameError[];
}

export interface PublicPlayerView {
  id: string;
  displayName: string;
  kind: PlayerKind;
  locked: boolean;
  handSize: number;
  playedCategory: CardCategory | null;
  diagnosisSubmitted: boolean;
  score: number | null;
}

export interface PlayerMatchView {
  matchId: string;
  phase: MatchPhase;
  currentRound: number;
  maximumRounds: number;
  publicClues: PublicClue[];
  sharedEvent: SharedEvent;
  latestPlays: CardPlay[];
  opponents: PublicPlayerView[];
  player: PlayerState;
  availableCards: InvestigationCard[];
  result: MatchResult | null;
}
