import { describe, expect, it } from "vitest";
import { thePainThatMovedCardCase } from "../card-content";
import { createCardMatch } from "../card-game-engine";
import { createCardMatchSession } from "../card-match-session";
import { applyRoomCommand, createRoomRecord, generateRoomCode, joinRoomRecord, setMemberReady, startRoomRecord } from ".";

const created = () => createRoomRecord({ roomId: "abc123", hostUid: "host", hostDisplayName: "Host", maximumPlayers: 4, caseId: thePainThatMovedCardCase.caseId, contentVersion: thePainThatMovedCardCase.contentVersion, seed: "room-seed", now: 1_000 });

describe("multiplayer room protocol", () => {
  it("creates a private lobby and joins up to the configured capacity", () => {
    let room = created();
    room = joinRoomRecord(room, "guest", "Guest", 2_000);
    expect(room.roomId).toBe("ABC123");
    expect(room.memberUids).toEqual(["host", "guest"]);
    expect(room.members.guest?.ready).toBe(false);
    expect(room.revision).toBe(1);
  });

  it("requires all players to be ready and only lets the host start", () => {
    let room = joinRoomRecord(created(), "guest", "Guest", 2_000);
    room = setMemberReady(room, "guest", true);
    const match = createCardMatch(thePainThatMovedCardCase, { seed: room.seed, players: [
      { id: "host", displayName: "Host", kind: "human" },
      { id: "guest", displayName: "Guest", kind: "human" },
    ] });
    const session = createCardMatchSession(match, room.roomId);
    expect(() => startRoomRecord(room, "guest", session, 3_000)).toThrow(/Only the host/);
    room = startRoomRecord(room, "host", session, 3_000);
    expect(room.status).toBe("active");
    expect(room.session?.matchState.playerOrder).toEqual(["host", "guest"]);
  });

  it("applies existing idempotent command envelopes without duplicating rules", () => {
    let room = joinRoomRecord(created(), "guest", "Guest", 2_000);
    room = setMemberReady(room, "guest", true);
    const state = createCardMatch(thePainThatMovedCardCase, { seed: room.seed, players: [
      { id: "host", displayName: "Host", kind: "human" },
      { id: "guest", displayName: "Guest", kind: "human" },
    ] });
    room = startRoomRecord(room, "host", createCardMatchSession(state, room.roomId), 3_000);
    const envelope = { commandId: "start-1", commandSequence: 1, expectedRevision: 0, command: { type: "START_MATCH" as const } };
    room = applyRoomCommand(room, "host", envelope, 4_000);
    const revision = room.revision;
    room = applyRoomCommand(room, "guest", envelope, 5_000);
    expect(room.session?.commandSequence).toBe(1);
    expect(room.revision).toBe(revision);
  });

  it("generates readable six-character room codes", () => {
    expect(generateRoomCode(() => 0)).toBe("AAAAAA");
    expect(generateRoomCode(() => 0.999)).toMatch(/^[A-Z2-9]{6}$/);
  });
});
