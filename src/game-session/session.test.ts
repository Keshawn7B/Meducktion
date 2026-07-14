import { describe, expect, it } from "vitest";
import { thePainThatMoved as def } from "../case-content";
import {
  applySessionCommand,
  createMemoryStorage,
  createSession,
  deserializeSession,
  loadSession,
  resetSession,
  saveSession,
  serializeSession,
  SOLO_SESSION_KEY,
  validateSnapshot,
} from ".";
import type { GameCommand, GameState } from "../game-engine";

const envelope = (
  session: ReturnType<typeof createSession>,
  command: GameCommand,
  id = "cmd-1",
  sequence = session.commandSequence + 1,
  revision = session.gameState.revision,
) => ({
  commandId: id,
  expectedRevision: revision,
  commandSequence: sequence,
  command,
});
const clone = (s: ReturnType<typeof createSession>) =>
  JSON.parse(JSON.stringify(s)) as Record<string, unknown>;
describe("game session", () => {
  it("creates a version-pinned session", () => {
    const s = createSession(def, "solo-1");
    expect(s).toMatchObject({
      sessionVersion: 1,
      sessionId: "solo-1",
      caseId: def.caseId,
      variantId: def.variantId,
      schemaVersion: def.schemaVersion,
      contentVersion: def.contentVersion,
      commandSequence: 0,
    });
  });
  it("applies a successful command", () => {
    const s = createSession(def, "solo-1");
    const r = applySessionCommand(def, s, envelope(s, { type: "START_CASE" }));
    expect(r.error).toBeUndefined();
    expect(r.session.gameState.phase).toBe("planning");
    expect(r.session.commandSequence).toBe(1);
  });
  it("makes duplicate command IDs idempotent", () => {
    const s = createSession(def, "solo-1");
    const first = applySessionCommand(
      def,
      s,
      envelope(s, { type: "START_CASE" }),
    );
    const duplicate = applySessionCommand(
      def,
      first.session,
      envelope(first.session, { type: "START_CASE" }, "cmd-1", 2),
    );
    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.session).toBe(first.session);
  });
  it("rejects revision conflicts", () => {
    const s = createSession(def, "solo-1");
    const r = applySessionCommand(
      def,
      s,
      envelope(s, { type: "START_CASE" }, "cmd-x", 1, 9),
    );
    expect(r.error?.code).toBe("REVISION_CONFLICT");
    expect(r.session).toBe(s);
  });
  it.each([-1, 0, 2, 4])("rejects invalid initial sequence %s", (sequence) => {
    const s = createSession(def, "solo-1");
    expect(
      applySessionCommand(
        def,
        s,
        envelope(s, { type: "START_CASE" }, `c${sequence}`, sequence),
      ).error?.code,
    ).toBe("INVALID_SEQUENCE");
  });
  it("serializes and deserializes exact engine state without UI state", () => {
    const s = createSession(def, "solo-1");
    const raw = serializeSession(s);
    expect(deserializeSession(raw).session).toEqual(s);
    expect(raw).not.toContain("mobileTab");
    expect(raw).not.toContain("modal");
  });
  it("rejects malformed JSON and missing fields", () => {
    expect(deserializeSession("{bad").error?.code).toBe("MALFORMED_JSON");
    expect(validateSnapshot({ sessionVersion: 1 }).error?.code).toBe(
      "INVALID_SNAPSHOT",
    );
  });
  it("rejects unsupported session versions", () => {
    const v = clone(createSession(def, "s"));
    v.sessionVersion = 9;
    expect(validateSnapshot(v).error?.code).toBe("UNSUPPORTED_SESSION_VERSION");
  });
  it("rejects unknown case and variant", () => {
    const c = clone(createSession(def, "s"));
    c.caseId = "case.unknown";
    expect(validateSnapshot(c).error?.code).toBe("UNKNOWN_CASE");
    const v = clone(createSession(def, "s"));
    v.variantId = "variant.unknown";
    expect(validateSnapshot(v).error?.code).toBe("UNKNOWN_VARIANT");
  });
  it("rejects schema and content version mismatches", () => {
    const a = clone(createSession(def, "s"));
    a.schemaVersion = 88;
    expect(validateSnapshot(a).error?.code).toBe("SCHEMA_VERSION_MISMATCH");
    const b = clone(createSession(def, "s"));
    b.contentVersion = "old";
    expect(validateSnapshot(b).error?.code).toBe("CONTENT_VERSION_MISMATCH");
  });
  it("rejects conflicting engine pins", () => {
    const v = clone(createSession(def, "s"));
    (v.gameState as GameState).contentVersion = "other";
    expect(validateSnapshot(v).error?.code).toBe("INVALID_SNAPSHOT");
  });
  it("saves, loads, and resets in-memory storage", () => {
    const store = createMemoryStorage(),
      s = createSession(def, "s");
    expect(saveSession(store, s)).toBeUndefined();
    expect(store.load(SOLO_SESSION_KEY)).not.toBeNull();
    expect(loadSession(store).session).toEqual(s);
    resetSession(store);
    expect(loadSession(store).session).toBeUndefined();
  });
  it("migrates a valid legacy prototype save to the Meducktion namespace", () => {
    const store = createMemoryStorage();
    const session = createSession(def, "legacy-session");
    store.save("case-signal:solo-session", serializeSession(session));
    expect(loadSession(store).session).toEqual(session);
    expect(store.load(SOLO_SESSION_KEY)).not.toBeNull();
    expect(store.load("case-signal:solo-session")).toBeNull();
  });
  it("replays the same command sequence to the same engine state", () => {
    const commands: GameCommand[] = [
      { type: "START_CASE" },
      { type: "SELECT_ACTION", actionId: "action.history.pain-movement" },
      { type: "LOCK_ACTIONS" },
      { type: "RESOLVE_INTERVAL" },
    ];
    const run = () =>
      commands.reduce(
        (s, c, i) =>
          applySessionCommand(def, s, envelope(s, c, `c${i + 1}`)).session,
        createSession(def, "same"),
      );
    expect(run().gameState).toEqual(run().gameState);
  });
});
