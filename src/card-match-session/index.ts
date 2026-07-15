import { getCardCaseById } from "../card-content";
import { transitionCardGame } from "../card-game-engine";
import type {
  CardMatchCommandEnvelope,
  CardMatchSession,
  CardMatchSessionError,
  CardMatchSessionTransition,
  CardMatchStorageAdapter,
} from "./types";
import { CARD_MATCH_SESSION_VERSION } from "./types";

export type * from "./types";
export { CARD_MATCH_SESSION_VERSION };

export const CARD_MATCH_STORAGE_KEY = "meducktion:card-match";
export const LEGACY_SOLO_STORAGE_KEY = "meducktion:solo-session";

export function createCardMatchSession(
  matchState: CardMatchSession["matchState"],
  sessionId: string,
): CardMatchSession {
  return {
    sessionVersion: CARD_MATCH_SESSION_VERSION,
    sessionId,
    caseId: matchState.caseId,
    variantId: matchState.variantId,
    contentVersion: matchState.contentVersion,
    seed: matchState.seed,
    commandSequence: 0,
    appliedCommandIds: [],
    matchState,
  };
}

export function applyCardMatchCommand(
  session: CardMatchSession,
  envelope: CardMatchCommandEnvelope,
): CardMatchSessionTransition {
  if (session.appliedCommandIds.includes(envelope.commandId)) {
    return { session, events: [], duplicate: true };
  }
  if (
    !Number.isInteger(envelope.commandSequence) ||
    envelope.commandSequence !== session.commandSequence + 1
  ) {
    return {
      session,
      events: [],
      duplicate: false,
      error: {
        code: "INVALID_SEQUENCE",
        message: `Expected command sequence ${session.commandSequence + 1}.`,
      },
    };
  }
  if (envelope.expectedRevision !== session.matchState.revision) {
    return {
      session,
      events: [],
      duplicate: false,
      error: {
        code: "REVISION_CONFLICT",
        message: `Expected match revision ${session.matchState.revision}.`,
      },
    };
  }
  const content = getCardCaseById(session.caseId);
  if (!content) {
    return {
      session,
      events: [],
      duplicate: false,
      error: { code: "UNKNOWN_CASE", message: "This card case is unavailable." },
    };
  }
  const result = transitionCardGame(content, session.matchState, envelope.command);
  if (result.errors.length) {
    return {
      session,
      events: [],
      duplicate: false,
      error: {
        code: "ENGINE_ERROR",
        message: result.errors[0]?.message ?? "The match command was rejected.",
        details: result.errors.map((item) => item.code).join(","),
      },
    };
  }
  return {
    session: {
      ...session,
      commandSequence: envelope.commandSequence,
      appliedCommandIds: [...session.appliedCommandIds, envelope.commandId],
      matchState: result.state,
    },
    events: result.events,
    duplicate: false,
  };
}

export function serializeCardMatch(session: CardMatchSession): string {
  return JSON.stringify(session);
}

export function validateCardMatchSnapshot(value: unknown): {
  session?: CardMatchSession;
  error?: CardMatchSessionError;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { error: { code: "INVALID_SNAPSHOT", message: "Saved match is invalid." } };
  }
  const snapshot = value as Record<string, unknown>;
  for (const key of [
    "sessionVersion",
    "sessionId",
    "caseId",
    "variantId",
    "contentVersion",
    "seed",
    "commandSequence",
    "appliedCommandIds",
    "matchState",
  ]) {
    if (!(key in snapshot)) {
      return {
        error: { code: "INVALID_SNAPSHOT", message: `Saved match is missing ${key}.` },
      };
    }
  }
  if (snapshot.sessionVersion !== CARD_MATCH_SESSION_VERSION) {
    return {
      error: {
        code: "UNSUPPORTED_SESSION_VERSION",
        message: "Saved match version is unsupported.",
      },
    };
  }
  const content =
    typeof snapshot.caseId === "string"
      ? getCardCaseById(snapshot.caseId)
      : undefined;
  if (!content) {
    return { error: { code: "UNKNOWN_CASE", message: "Saved card case is unavailable." } };
  }
  if (snapshot.contentVersion !== content.contentVersion) {
    return {
      error: {
        code: "CONTENT_VERSION_MISMATCH",
        message: "The saved match uses different case content.",
      },
    };
  }
  const match = snapshot.matchState;
  if (typeof match !== "object" || match === null || Array.isArray(match)) {
    return { error: { code: "INVALID_SNAPSHOT", message: "Saved match state is invalid." } };
  }
  const state = match as Record<string, unknown>;
  if (
    state.caseId !== snapshot.caseId ||
    state.variantId !== snapshot.variantId ||
    state.contentVersion !== snapshot.contentVersion ||
    state.seed !== snapshot.seed ||
    state.schemaVersion !== "card-match-v1" ||
    typeof state.revision !== "number" ||
    !Array.isArray(state.eventLog) ||
    typeof state.players !== "object" ||
    state.players === null
  ) {
    return {
      error: { code: "INVALID_SNAPSHOT", message: "Saved match pins or state are invalid." },
    };
  }
  if (
    typeof snapshot.sessionId !== "string" ||
    !Number.isInteger(snapshot.commandSequence) ||
    !Array.isArray(snapshot.appliedCommandIds)
  ) {
    return { error: { code: "INVALID_SNAPSHOT", message: "Saved session fields are invalid." } };
  }
  return { session: value as CardMatchSession };
}

export function deserializeCardMatch(raw: string): {
  session?: CardMatchSession;
  error?: CardMatchSessionError;
} {
  try {
    return validateCardMatchSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return { error: { code: "MALFORMED_JSON", message: "Saved match could not be read." } };
  }
}

export function createMemoryCardMatchStorage(): CardMatchStorageAdapter {
  const records = new Map<string, string>();
  return {
    load: (key) => records.get(key) ?? null,
    save: (key, value) => void records.set(key, value),
    remove: (key) => void records.delete(key),
  };
}

export function createBrowserCardMatchStorage(storage: Storage): CardMatchStorageAdapter {
  return {
    load: (key) => storage.getItem(key),
    save: (key, value) => storage.setItem(key, value),
    remove: (key) => storage.removeItem(key),
  };
}

export function saveCardMatch(
  storage: CardMatchStorageAdapter,
  session: CardMatchSession,
): CardMatchSessionError | undefined {
  try {
    storage.save(CARD_MATCH_STORAGE_KEY, serializeCardMatch(session));
    return undefined;
  } catch {
    return { code: "STORAGE_ERROR", message: "The card match could not be saved." };
  }
}

export function loadCardMatch(storage: CardMatchStorageAdapter): {
  session?: CardMatchSession;
  error?: CardMatchSessionError;
  legacySaveFound?: boolean;
} {
  try {
    const current = storage.load(CARD_MATCH_STORAGE_KEY);
    if (current) {
      const loaded = deserializeCardMatch(current);
      if (
        loaded.error?.code === "CONTENT_VERSION_MISMATCH" ||
        loaded.error?.code === "UNKNOWN_CASE" ||
        loaded.error?.code === "UNSUPPORTED_SESSION_VERSION"
      ) {
        storage.remove(CARD_MATCH_STORAGE_KEY);
        return {
          error: {
            code: "LEGACY_RULES_CHANGED",
            message: "The card catalog changed, so the incompatible saved match was cleared. Start a new match to use the complete symptom deck.",
          },
        };
      }
      return loaded;
    }
    if (storage.load(LEGACY_SOLO_STORAGE_KEY)) {
      return {
        legacySaveFound: true,
        error: {
          code: "LEGACY_RULES_CHANGED",
          message:
            "Meducktion's rules changed. Start a new card match; the former clinical save was not loaded.",
        },
      };
    }
    return {};
  } catch {
    return { error: { code: "STORAGE_ERROR", message: "Saved match could not be loaded." } };
  }
}

export function resetCardMatch(storage: CardMatchStorageAdapter): void {
  storage.remove(CARD_MATCH_STORAGE_KEY);
}
