import type { IdentityMatchState } from "../identity-game-engine";

export const IDENTITY_MATCH_STORAGE_KEY = "meducktion:identity-match";
export const IDENTITY_MATCH_SESSION_VERSION = 1 as const;

export interface IdentityMatchSession {
  sessionVersion: typeof IDENTITY_MATCH_SESSION_VERSION;
  sessionId: string;
  matchState: IdentityMatchState;
}

export function serializeIdentitySession(session: IdentityMatchSession): string {
  return JSON.stringify(session);
}

export function parseIdentitySession(raw: string | null): IdentityMatchSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<IdentityMatchSession>;
    if (value.sessionVersion !== 1 || value.matchState?.schemaVersion !== "identity-match-v1") return null;
    return value as IdentityMatchSession;
  } catch {
    return null;
  }
}
