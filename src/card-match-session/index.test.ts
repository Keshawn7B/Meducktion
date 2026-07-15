import { describe, expect, it } from "vitest";
import { thePainThatMovedCardCase } from "../card-content";
import { createCardMatch } from "../card-game-engine";
import type { CardGameCommand } from "../card-game-engine";
import {
  CARD_MATCH_STORAGE_KEY,
  LEGACY_SOLO_STORAGE_KEY,
  applyCardMatchCommand,
  createCardMatchSession,
  createMemoryCardMatchStorage,
  deserializeCardMatch,
  loadCardMatch,
  resetCardMatch,
  saveCardMatch,
  serializeCardMatch,
} from ".";
import type { CardMatchSession } from ".";

function createSession(seed = "session-test-seed"): CardMatchSession {
  const match = createCardMatch(thePainThatMovedCardCase, {
    seed,
    matchId: `match.${seed}`,
    players: [
      { id: "player.human", displayName: "Player", kind: "human" },
      {
        id: "player.bot.1",
        displayName: "Dr. Beak",
        kind: "bot",
        botStyle: "balanced",
      },
    ],
  });
  return createCardMatchSession(match, `session.${seed}`);
}

function apply(
  session: CardMatchSession,
  command: CardGameCommand,
  commandId = `command.${session.commandSequence + 1}`,
) {
  return applyCardMatchCommand(session, {
    commandId,
    commandSequence: session.commandSequence + 1,
    expectedRevision: session.matchState.revision,
    command,
  });
}

describe("card match sessions", () => {
  it("pins the case, variant, content version, and seed", () => {
    const session = createSession("fixed-seed");

    expect(session.caseId).toBe("case.the-pain-that-moved");
    expect(session.variantId).toBe("variant.classic");
    expect(session.contentVersion).toBe(thePainThatMovedCardCase.contentVersion);
    expect(session.seed).toBe("fixed-seed");
    expect(session.matchState.seed).toBe("fixed-seed");
  });

  it("applies ordered commands and keeps rejected commands out of the journal", () => {
    const original = createSession();
    const started = apply(original, { type: "START_MATCH" });

    expect(started.error).toBeUndefined();
    expect(started.session.commandSequence).toBe(1);
    expect(started.session.appliedCommandIds).toEqual(["command.1"]);
    expect(started.session.matchState.phase).toBe("round_draw");
    expect(original.matchState.phase).toBe("match_intro");

    const rejected = applyCardMatchCommand(started.session, {
      commandId: "command.out-of-order",
      commandSequence: 3,
      expectedRevision: started.session.matchState.revision,
      command: { type: "DRAW_CARDS" },
    });
    expect(rejected.error?.code).toBe("INVALID_SEQUENCE");
    expect(rejected.session).toBe(started.session);
    expect(rejected.session.appliedCommandIds).not.toContain("command.out-of-order");
  });

  it("deduplicates command IDs and detects revision conflicts", () => {
    const original = createSession();
    const first = apply(original, { type: "START_MATCH" }, "stable-command");
    const duplicate = applyCardMatchCommand(first.session, {
      commandId: "stable-command",
      commandSequence: first.session.commandSequence + 1,
      expectedRevision: first.session.matchState.revision,
      command: { type: "DRAW_CARDS" },
    });

    expect(duplicate.duplicate).toBe(true);
    expect(duplicate.session).toBe(first.session);

    const conflict = applyCardMatchCommand(first.session, {
      commandId: "new-command",
      commandSequence: first.session.commandSequence + 1,
      expectedRevision: first.session.matchState.revision - 1,
      command: { type: "DRAW_CARDS" },
    });
    expect(conflict.error?.code).toBe("REVISION_CONFLICT");
  });

  it("round-trips an exact active match including decks and random state", () => {
    const started = apply(createSession("resume-seed"), { type: "START_MATCH" });
    const dealt = apply(started.session, { type: "DRAW_CARDS" });
    const restored = deserializeCardMatch(serializeCardMatch(dealt.session));

    expect(restored.error).toBeUndefined();
    expect(restored.session).toEqual(dealt.session);
    expect(restored.session?.matchState.rng).toEqual(dealt.session.matchState.rng);
    expect(restored.session?.matchState.players["player.human"]?.deck).toEqual(
      dealt.session.matchState.players["player.human"]?.deck,
    );
  });

  it("saves, loads, and resets only the card-match namespace", () => {
    const storage = createMemoryCardMatchStorage();
    const session = createSession("storage-seed");

    expect(saveCardMatch(storage, session)).toBeUndefined();
    expect(storage.load(CARD_MATCH_STORAGE_KEY)).toContain("storage-seed");
    expect(loadCardMatch(storage).session).toEqual(session);

    storage.save(LEGACY_SOLO_STORAGE_KEY, "preserve this historical snapshot");
    resetCardMatch(storage);
    expect(storage.load(CARD_MATCH_STORAGE_KEY)).toBeNull();
    expect(storage.load(LEGACY_SOLO_STORAGE_KEY)).toBe(
      "preserve this historical snapshot",
    );
  });

  it("handles legacy clinical saves without loading or deleting them", () => {
    const storage = createMemoryCardMatchStorage();
    storage.save(LEGACY_SOLO_STORAGE_KEY, JSON.stringify({ sessionVersion: 1 }));

    const loaded = loadCardMatch(storage);

    expect(loaded.session).toBeUndefined();
    expect(loaded.legacySaveFound).toBe(true);
    expect(loaded.error?.code).toBe("LEGACY_RULES_CHANGED");
    expect(loaded.error?.message).toContain("rules changed");
    expect(storage.load(LEGACY_SOLO_STORAGE_KEY)).not.toBeNull();
  });

  it("rejects malformed, mismatched, and unknown snapshots safely", () => {
    expect(deserializeCardMatch("not json").error?.code).toBe("MALFORMED_JSON");

    const session = createSession();
    const mismatched = JSON.parse(serializeCardMatch(session)) as Record<
      string,
      unknown
    >;
    mismatched.contentVersion = "older-content";
    expect(
      deserializeCardMatch(JSON.stringify(mismatched)).error?.code,
    ).toBe("CONTENT_VERSION_MISMATCH");

    const unknown = JSON.parse(serializeCardMatch(session)) as Record<
      string,
      unknown
    >;
    unknown.caseId = "case.unknown";
    expect(deserializeCardMatch(JSON.stringify(unknown)).error?.code).toBe(
      "UNKNOWN_CASE",
    );
  });

  it("clears a stored match whose pinned card catalog is outdated", () => {
    const storage = createMemoryCardMatchStorage();
    const stale = JSON.parse(serializeCardMatch(createSession())) as Record<string, unknown>;
    stale.contentVersion = "older-content";
    storage.save(CARD_MATCH_STORAGE_KEY, JSON.stringify(stale));

    const loaded = loadCardMatch(storage);

    expect(loaded.session).toBeUndefined();
    expect(loaded.error?.code).toBe("LEGACY_RULES_CHANGED");
    expect(storage.load(CARD_MATCH_STORAGE_KEY)).toBeNull();
  });

  it("does not persist temporary UI state", () => {
    const serialized = serializeCardMatch(createSession());

    expect(serialized).not.toContain("tutorialOpen");
    expect(serialized).not.toContain("diagnosisOpen");
    expect(serialized).not.toContain("selectedTutorialPanel");
  });
});
