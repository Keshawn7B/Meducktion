import { caseRegistry } from "../case-content";
import { createInitialState, transitionGame } from "../game-engine";
import type { CaseDefinition } from "../case-content";
import type {
  GameSession,
  SessionCommandEnvelope,
  SessionError,
  SessionStorageAdapter,
  SessionTransitionResult,
} from "./types";
import { CURRENT_SESSION_VERSION } from "./types";
export type * from "./types";
export { CURRENT_SESSION_VERSION };
export const SOLO_SESSION_KEY = "meducktion:solo-session";
const LEGACY_SOLO_SESSION_KEY = "case-signal:solo-session";

export function createSession(
  def: CaseDefinition,
  sessionId: string,
): GameSession {
  return {
    sessionVersion: CURRENT_SESSION_VERSION,
    sessionId,
    caseId: def.caseId,
    variantId: def.variantId,
    schemaVersion: def.schemaVersion,
    contentVersion: def.contentVersion,
    commandSequence: 0,
    appliedCommandIds: [],
    gameState: createInitialState(def),
  };
}
export function applySessionCommand(
  def: CaseDefinition,
  session: GameSession,
  envelope: SessionCommandEnvelope,
): SessionTransitionResult {
  if (session.appliedCommandIds.includes(envelope.commandId))
    return { session, events: [], duplicate: true };
  if (
    !Number.isInteger(envelope.commandSequence) ||
    envelope.commandSequence < 1 ||
    envelope.commandSequence !== session.commandSequence + 1
  )
    return {
      session,
      events: [],
      duplicate: false,
      error: {
        code: "INVALID_SEQUENCE",
        message: `Expected command sequence ${session.commandSequence + 1}.`,
      },
    };
  if (envelope.expectedRevision !== session.gameState.revision)
    return {
      session,
      events: [],
      duplicate: false,
      error: {
        code: "REVISION_CONFLICT",
        message: `Expected engine revision ${session.gameState.revision}.`,
      },
    };
  const result = transitionGame(def, session.gameState, envelope.command);
  if (result.errors.length) {
    return {
      session,
      events: [],
      duplicate: false,
      error: {
        code: "ENGINE_ERROR",
        message: result.errors[0]?.message ?? "Engine command failed.",
        details: result.errors.map((e) => e.code).join(","),
      },
    };
  }
  return {
    session: {
      ...session,
      commandSequence: envelope.commandSequence,
      appliedCommandIds: [...session.appliedCommandIds, envelope.commandId],
      gameState: result.state,
    },
    events: result.events,
    duplicate: false,
  };
}
export function serializeSession(session: GameSession): string {
  return JSON.stringify(session);
}
export function validateSnapshot(value: unknown): {
  session?: GameSession;
  error?: SessionError;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value))
    return {
      error: {
        code: "INVALID_SNAPSHOT",
        message: "Saved session is not an object.",
      },
    };
  const v = value as Record<string, unknown>;
  for (const key of [
    "sessionVersion",
    "sessionId",
    "caseId",
    "variantId",
    "schemaVersion",
    "contentVersion",
    "commandSequence",
    "appliedCommandIds",
    "gameState",
  ])
    if (!(key in v))
      return {
        error: {
          code: "INVALID_SNAPSHOT",
          message: `Saved session is missing ${key}.`,
        },
      };
  if (v.sessionVersion !== CURRENT_SESSION_VERSION)
    return {
      error: {
        code: "UNSUPPORTED_SESSION_VERSION",
        message: "Saved session version is unsupported.",
      },
    };
  const def = caseRegistry.find((c) => c.caseId === v.caseId);
  if (!def)
    return {
      error: { code: "UNKNOWN_CASE", message: "Saved case is not registered." },
    };
  if (v.variantId !== def.variantId)
    return {
      error: {
        code: "UNKNOWN_VARIANT",
        message: "Saved case variant is unknown.",
      },
    };
  if (v.schemaVersion !== def.schemaVersion)
    return {
      error: {
        code: "SCHEMA_VERSION_MISMATCH",
        message: "Saved schema version does not match.",
      },
    };
  if (v.contentVersion !== def.contentVersion)
    return {
      error: {
        code: "CONTENT_VERSION_MISMATCH",
        message: "Saved content version does not match.",
      },
    };
  const g = v.gameState;
  if (typeof g !== "object" || g === null || Array.isArray(g))
    return {
      error: {
        code: "INVALID_SNAPSHOT",
        message: "Saved engine state is invalid.",
      },
    };
  const gs = g as Record<string, unknown>;
  if (
    gs.caseId !== v.caseId ||
    gs.variantId !== v.variantId ||
    gs.schemaVersion !== v.schemaVersion ||
    gs.contentVersion !== v.contentVersion ||
    typeof gs.revision !== "number" ||
    !Array.isArray(gs.eventLog)
  )
    return {
      error: {
        code: "INVALID_SNAPSHOT",
        message: "Saved engine pins or structure are invalid.",
      },
    };
  if (
    typeof v.sessionId !== "string" ||
    typeof v.commandSequence !== "number" ||
    !Array.isArray(v.appliedCommandIds)
  )
    return {
      error: {
        code: "INVALID_SNAPSHOT",
        message: "Saved session fields are malformed.",
      },
    };
  return { session: value as GameSession };
}
export function deserializeSession(raw: string): {
  session?: GameSession;
  error?: SessionError;
} {
  try {
    return validateSnapshot(JSON.parse(raw) as unknown);
  } catch {
    return {
      error: {
        code: "MALFORMED_JSON",
        message: "Saved session could not be read.",
      },
    };
  }
}
export function createMemoryStorage(): SessionStorageAdapter {
  const data = new Map<string, string>();
  return {
    load: (k) => data.get(k) ?? null,
    save: (k, v) => {
      data.set(k, v);
    },
    remove: (k) => {
      data.delete(k);
    },
  };
}
export function createBrowserStorage(storage: Storage): SessionStorageAdapter {
  return {
    load: (k) => storage.getItem(k),
    save: (k, v) => storage.setItem(k, v),
    remove: (k) => storage.removeItem(k),
  };
}
export function saveSession(
  store: SessionStorageAdapter,
  session: GameSession,
): SessionError | undefined {
  try {
    store.save(SOLO_SESSION_KEY, serializeSession(session));
    store.remove(LEGACY_SOLO_SESSION_KEY);
    return undefined;
  } catch {
    return {
      code: "STORAGE_ERROR",
      message: "The session could not be saved.",
    };
  }
}
export function loadSession(store: SessionStorageAdapter): {
  session?: GameSession;
  error?: SessionError;
} {
  try {
    const current = store.load(SOLO_SESSION_KEY);
    if (current) return deserializeSession(current);
    const legacy = store.load(LEGACY_SOLO_SESSION_KEY);
    if (!legacy) return {};
    const result = deserializeSession(legacy);
    if (result.session) {
      store.save(SOLO_SESSION_KEY, serializeSession(result.session));
      store.remove(LEGACY_SOLO_SESSION_KEY);
    }
    return result;
  } catch {
    return {
      error: {
        code: "STORAGE_ERROR",
        message: "The saved session could not be loaded.",
      },
    };
  }
}
export function resetSession(store: SessionStorageAdapter): void {
  store.remove(SOLO_SESSION_KEY);
  store.remove(LEGACY_SOLO_SESSION_KEY);
}
