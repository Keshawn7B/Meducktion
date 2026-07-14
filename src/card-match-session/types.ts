import type {
  CardGameCommand,
  MatchEvent,
  MatchState,
} from "../card-game-engine/types";

export const CARD_MATCH_SESSION_VERSION = 1 as const;

export interface CardMatchSession {
  sessionVersion: typeof CARD_MATCH_SESSION_VERSION;
  sessionId: string;
  caseId: string;
  variantId: string;
  contentVersion: string;
  seed: string;
  commandSequence: number;
  appliedCommandIds: string[];
  matchState: MatchState;
}

export interface CardMatchCommandEnvelope {
  commandId: string;
  commandSequence: number;
  expectedRevision: number;
  command: CardGameCommand;
}

export type CardMatchSessionErrorCode =
  | "INVALID_SEQUENCE"
  | "REVISION_CONFLICT"
  | "ENGINE_ERROR"
  | "MALFORMED_JSON"
  | "INVALID_SNAPSHOT"
  | "UNSUPPORTED_SESSION_VERSION"
  | "UNKNOWN_CASE"
  | "CONTENT_VERSION_MISMATCH"
  | "LEGACY_RULES_CHANGED"
  | "STORAGE_ERROR";

export interface CardMatchSessionError {
  code: CardMatchSessionErrorCode;
  message: string;
  details?: string;
}

export interface CardMatchSessionTransition {
  session: CardMatchSession;
  events: MatchEvent[];
  duplicate: boolean;
  error?: CardMatchSessionError;
}

export interface CardMatchStorageAdapter {
  load(key: string): string | null;
  save(key: string, value: string): void;
  remove(key: string): void;
}
