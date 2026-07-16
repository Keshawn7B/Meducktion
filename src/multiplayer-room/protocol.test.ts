import { describe, expect, it } from "vitest";
import { cardCaseRegistry, thePainThatMovedCardCase } from "../card-content";
import { createCardMatch } from "../card-game-engine";
import { createCardMatchSession } from "../card-match-session";
import { applyRoomCommand, createRoomRecord, generateRoomCode, joinRoomRecord, leaveRoomRecord, markRoomReadyToStart, resetCompletedRoom, setMemberReady, startRoomRecord } from ".";

const created = () => createRoomRecord({ roomId: "abc123", hostUid: "host", hostDisplayName: "Host", maximumPlayers: 4, maximumRounds: 10, caseId: thePainThatMovedCardCase.caseId, contentVersion: thePainThatMovedCardCase.contentVersion, seed: "room-seed", now: 1_000 });
const rematchCase = cardCaseRegistry.find((cardCase) => cardCase.caseId !== thePainThatMovedCardCase.caseId)!;
const rematchMystery = { caseId: rematchCase.caseId, contentVersion: rematchCase.contentVersion, seed: "rematch-seed" };

describe("multiplayer room protocol", () => {
  it("pins the host's round limit for the whole room", () => {
    const unlimited = createRoomRecord({
      roomId: "forever",
      hostUid: "host",
      hostDisplayName: "Host",
      maximumPlayers: 4,
      maximumRounds: null,
      caseId: thePainThatMovedCardCase.caseId,
      contentVersion: thePainThatMovedCardCase.contentVersion,
      seed: "unlimited-room",
      now: 1_000,
    });
    expect(unlimited.maximumRounds).toBeNull();
  });

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
    expect(joinRoomRecord(room, "guest", "Guest", 4_000)).toBe(room);
    expect(() => joinRoomRecord(room, "late", "Late player", 4_000)).toThrow(/already started/);
  });

  it("locks a fully-ready lobby without publishing private match state", () => {
    let room = joinRoomRecord(created(), "guest", "Guest", 2_000);
    expect(() => markRoomReadyToStart(room, "host")).toThrow(/Every player/);
    room = setMemberReady(room, "guest", true);
    expect(() => markRoomReadyToStart(room, "guest")).toThrow(/Only the host/);
    room = markRoomReadyToStart(room, "host");
    expect(room.status).toBe("ready");
    expect(room.session).toBeNull();
  });

  it("removes a guest cleanly when they leave the lobby", () => {
    const room = leaveRoomRecord(joinRoomRecord(created(), "guest", "Guest", 2_000), "guest");
    expect(room.memberUids).toEqual(["host"]);
    expect(room.members.guest).toBeUndefined();
    expect(room.revision).toBe(2);
  });

  it("hands lobby ownership to the next player when the host leaves", () => {
    const room = leaveRoomRecord(joinRoomRecord(created(), "guest", "Guest", 2_000), "host");
    expect(room.memberUids).toEqual(["guest"]);
    expect(room.hostUid).toBe("guest");
    expect(room.members.guest?.ready).toBe(true);
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

  it("keeps player commands scoped to their seat and waits for every round decision", () => {
    let room = joinRoomRecord(created(), "guest", "Guest", 2_000);
    room = setMemberReady(room, "guest", true);
    const state = createCardMatch(thePainThatMovedCardCase, { seed: room.seed, players: [
      { id: "host", displayName: "Host", kind: "human" },
      { id: "guest", displayName: "Guest", kind: "human" },
    ] });
    state.phase = "diagnosis_window";
    state.currentRound = 2;
    room = startRoomRecord(room, "host", createCardMatchSession(state, room.roomId), 3_000);

    expect(() => applyRoomCommand(room, "guest", {
      commandId: "wrong-seat",
      commandSequence: 1,
      expectedRevision: 0,
      command: { type: "PASS_DIAGNOSIS", playerId: "host" },
    }, 4_000)).toThrow(/own player seat/);

    room = applyRoomCommand(room, "host", {
      commandId: "host-pass",
      commandSequence: 1,
      expectedRevision: 0,
      command: { type: "PASS_DIAGNOSIS", playerId: "host" },
    }, 4_000);
    expect(() => applyRoomCommand(room, "host", {
      commandId: "too-soon",
      commandSequence: 2,
      expectedRevision: 1,
      command: { type: "CONTINUE_FROM_DIAGNOSIS" },
    }, 4_100)).toThrow(/Every player/);

    room = applyRoomCommand(room, "guest", {
      commandId: "guest-pass",
      commandSequence: 2,
      expectedRevision: 1,
      command: { type: "PASS_DIAGNOSIS", playerId: "guest" },
    }, 4_200);
    room = applyRoomCommand(room, "host", {
      commandId: "continue",
      commandSequence: 3,
      expectedRevision: 2,
      command: { type: "CONTINUE_FROM_DIAGNOSIS" },
    }, 4_300);
    expect(room.session?.matchState.phase).toBe("next_round");
  });

  it("marks an online room complete when one player remains after elimination", () => {
    let room = setMemberReady(joinRoomRecord(created(), "guest", "Guest", 2_000), "guest", true);
    const state = createCardMatch(thePainThatMovedCardCase, { seed: room.seed, players: [
      { id: "host", displayName: "Host", kind: "human" },
      { id: "guest", displayName: "Guest", kind: "human" },
    ] });
    state.phase = "diagnosis_window";
    state.currentRound = 4;
    const host = state.players.host;
    if (!host) throw new Error("Missing online elimination fixture.");
    host.diagnosisAttemptsUsed = 2;
    host.hiddenClueAnswers = ["yes", "no"];
    const wrongConditions = thePainThatMovedCardCase.conditions.filter(
      (condition) => condition.id !== thePainThatMovedCardCase.correctConditionId,
    );
    room = startRoomRecord(room, "host", createCardMatchSession(state, room.roomId), 3_000);
    room = applyRoomCommand(room, "host", {
      commandId: "host-third-miss",
      commandSequence: 1,
      expectedRevision: 0,
      command: { type: "SUBMIT_DIAGNOSIS", playerId: "host", conditionId: wrongConditions[0]!.id, clueIds: [] },
    }, 4_000);
    expect(room.status).toBe("complete");
    expect(room.session?.matchState.result?.winnerPlayerIds).toEqual(["guest"]);
    expect(room.session?.matchState.result?.winningTieBreak).toBe("only_player");
  });

  it("replaces a departing active player with a deterministic bot", () => {
    let room = joinRoomRecord(created(), "guest", "Guest", 2_000);
    room = setMemberReady(room, "guest", true);
    const state = createCardMatch(thePainThatMovedCardCase, { seed: room.seed, players: [
      { id: "host", displayName: "Host", kind: "human" },
      { id: "guest", displayName: "Guest", kind: "human" },
    ] });
    room = startRoomRecord(room, "host", createCardMatchSession(state, room.roomId), 3_000);
    room = applyRoomCommand(room, "guest", {
      commandId: "leave-active",
      commandSequence: 1,
      expectedRevision: 0,
      command: { type: "CONVERT_TO_BOT", playerId: "guest" },
    }, 4_000);
    expect(room.session?.matchState.players.guest?.kind).toBe("bot");
    expect(() => applyRoomCommand(room, "guest", {
      commandId: "act-after-leaving",
      commandSequence: 2,
      expectedRevision: 1,
      command: { type: "PASS_DIAGNOSIS", playerId: "guest" },
    }, 4_100)).toThrow(/controlled by a bot/);
  });

  it("returns a completed match to the same lobby with a new seeded mystery", () => {
    const joined = setMemberReady(joinRoomRecord(created(), "guest", "Guest", 2_000), "guest", true);
    const completed = { ...joined, status: "complete" as const, session: createCardMatchSession(
      createCardMatch(thePainThatMovedCardCase, { seed: joined.seed }),
      joined.roomId,
    ) };
    const reset = resetCompletedRoom(completed, "guest", rematchMystery, 5_000);
    expect(reset.status).toBe("lobby");
    expect(reset.session).toBeNull();
    expect(reset.roomId).toBe(completed.roomId);
    expect(reset.members).toEqual(completed.members);
    expect(reset.caseId).toBe(rematchCase.caseId);
    expect(reset.seed).toBe("rematch-seed");
    expect(() => resetCompletedRoom(completed, "outsider", rematchMystery, 5_000)).toThrow(/not a member/i);
  });

  it("generates readable six-character room codes", () => {
    expect(generateRoomCode(() => 0)).toBe("AAAAAA");
    expect(generateRoomCode(() => 0.999)).toMatch(/^[A-Z2-9]{6}$/);
  });
});
