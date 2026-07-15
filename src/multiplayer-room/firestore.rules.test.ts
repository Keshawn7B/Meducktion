import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, serverTimestamp, setDoc, Timestamp, type Firestore } from "firebase/firestore";
import { cardCaseRegistry, thePainThatMovedCardCase } from "../card-content";
import { createCardMatch } from "../card-game-engine";
import { createCardMatchSession } from "../card-match-session";
import { applyRoomCommand, createRoomRecord, joinRoomRecord, leaveRoomRecord, markRoomReadyToStart, resetCompletedRoom, setMemberReady, startRoomRecord } from "./protocol";
import { FirestoreMultiplayerRoomRepository } from "./firestoreRepository";

let environment: RulesTestEnvironment;
const room = createRoomRecord({ roomId: "RULES1", hostUid: "host", hostDisplayName: "Host", maximumPlayers: 4, caseId: "case.the-pain-that-moved", contentVersion: "1.0.0", seed: "rules", now: 1_000 });
const rematchCase = cardCaseRegistry.find((cardCase) => cardCase.caseId !== thePainThatMovedCardCase.caseId)!;

beforeAll(async () => {
  environment = await initializeTestEnvironment({ projectId: "demo-meducktion", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
});
beforeEach(async () => {
  await environment.clearFirestore();
  await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "rooms", room.roomId), room));
});
afterAll(async () => environment.cleanup());

describe("Firestore multiplayer room rules", () => {
  it("allows an authenticated guest to read and join a lobby", async () => {
    const firestore = environment.authenticatedContext("guest").firestore();
    await assertSucceeds(getDoc(doc(firestore, "rooms", room.roomId)));
    await assertSucceeds(setDoc(doc(firestore, "rooms", room.roomId), joinRoomRecord(room, "guest", "Guest", 2_000)));
  });

  it("denies unauthenticated room reads", async () => {
    await assertFails(getDoc(doc(environment.unauthenticatedContext().firestore(), "rooms", room.roomId)));
  });

  it("denies nonmember reads after a room becomes active", async () => {
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "rooms", room.roomId), { ...room, status: "active" }));
    await assertFails(getDoc(doc(environment.authenticatedContext("outsider").firestore(), "rooms", room.roomId)));
  });

  it("allows a member to change only their own ready state", async () => {
    const joined = joinRoomRecord(room, "guest", "Guest", 2_000);
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "rooms", room.roomId), joined));
    const guest = environment.authenticatedContext("guest").firestore();
    await assertSucceeds(setDoc(doc(guest, "rooms", room.roomId), setMemberReady(joined, "guest", true)));
    await assertFails(setDoc(doc(guest, "rooms", room.roomId), {
      ...joined,
      members: { ...joined.members, host: { ...joined.members.host!, ready: false } },
      revision: joined.revision + 1,
    }));
  });

  it("allows only the host to lock a fully-ready lobby", async () => {
    const joined = setMemberReady(joinRoomRecord(room, "guest", "Guest", 2_000), "guest", true);
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "rooms", room.roomId), joined));
    await assertFails(setDoc(doc(environment.authenticatedContext("guest").firestore(), "rooms", room.roomId), markRoomReadyToStart(joined, "host")));
    await assertSucceeds(setDoc(doc(environment.authenticatedContext("host").firestore(), "rooms", room.roomId), markRoomReadyToStart(joined, "host")));
  });

  it("allows the host to transfer a lobby by leaving", async () => {
    const joined = joinRoomRecord(room, "guest", "Guest", 2_000);
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "rooms", room.roomId), joined));
    const transferred = leaveRoomRecord(joined, "host");
    await assertSucceeds(setDoc(doc(environment.authenticatedContext("host").firestore(), "rooms", room.roomId), transferred));
    expect(transferred.hostUid).toBe("guest");
  });

  it("allows only the host to close a room", async () => {
    await assertFails(deleteDoc(doc(environment.authenticatedContext("guest").firestore(), "rooms", room.roomId)));
    await assertSucceeds(deleteDoc(doc(environment.authenticatedContext("host").firestore(), "rooms", room.roomId)));
  });

  it("keeps presence readable by members and writable only by its owner", async () => {
    const joined = joinRoomRecord(room, "guest", "Guest", 2_000);
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "rooms", room.roomId), joined));
    const host = environment.authenticatedContext("host").firestore();
    const guest = environment.authenticatedContext("guest").firestore();
    const outsider = environment.authenticatedContext("outsider").firestore();
    const guestPresence = doc(guest, "rooms", room.roomId, "presence", "guest");

    await assertSucceeds(setDoc(guestPresence, { uid: "guest", lastSeenAt: serverTimestamp() }));
    await assertSucceeds(getDoc(doc(host, "rooms", room.roomId, "presence", "guest")));
    await assertFails(getDoc(doc(outsider, "rooms", room.roomId, "presence", "guest")));
    await assertFails(setDoc(doc(host, "rooms", room.roomId, "presence", "guest"), { uid: "guest", lastSeenAt: serverTimestamp() }));
    await assertSucceeds(deleteDoc(guestPresence));
  });

  it("replaces a timed-out active player through the transactional repository", async () => {
    const joined = setMemberReady(joinRoomRecord(room, "guest", "Guest", 2_000), "guest", true);
    const match = createCardMatch(thePainThatMovedCardCase, { seed: joined.seed, players: [
      { id: "host", displayName: "Host", kind: "human" },
      { id: "guest", displayName: "Guest", kind: "human" },
    ] });
    const active = startRoomRecord(joined, "host", createCardMatchSession(match, room.roomId), 3_000);
    await environment.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "rooms", room.roomId), active);
      await setDoc(doc(context.firestore(), "rooms", room.roomId, "presence", "host"), {
        uid: "host",
        lastSeenAt: Timestamp.fromMillis(1_000),
      });
    });

    const repository = new FirestoreMultiplayerRoomRepository(
      environment.authenticatedContext("guest").firestore() as unknown as Firestore,
      () => 100_000,
    );
    const updated = await repository.replaceStalePlayer(room.roomId, "guest", "host", {
      commandId: "presence-timeout-host",
      commandSequence: 1,
      expectedRevision: 0,
      command: { type: "CONVERT_TO_BOT", playerId: "host" },
    }, 90_000);
    expect(updated.session?.matchState.players.host?.kind).toBe("bot");
  });

  it("allows the host to start and members to advance a transactional match", async () => {
    const joined = setMemberReady(joinRoomRecord(room, "guest", "Guest", 2_000), "guest", true);
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "rooms", room.roomId), joined));
    const match = createCardMatch(thePainThatMovedCardCase, { seed: joined.seed, players: [
      { id: "host", displayName: "Host", kind: "human" },
      { id: "guest", displayName: "Guest", kind: "human" },
    ] });
    const active = startRoomRecord(joined, "host", createCardMatchSession(match, room.roomId), 3_000);
    await assertSucceeds(setDoc(doc(environment.authenticatedContext("host").firestore(), "rooms", room.roomId), active));

    const advanced = applyRoomCommand(active, "guest", {
      commandId: "start",
      commandSequence: 1,
      expectedRevision: 0,
      command: { type: "START_MATCH" },
    }, 4_000);
    await assertSucceeds(setDoc(doc(environment.authenticatedContext("guest").firestore(), "rooms", room.roomId), advanced));
    await assertFails(setDoc(doc(environment.authenticatedContext("outsider").firestore(), "rooms", room.roomId), advanced));
  });

  it("allows members to return a completed match to its lobby with a new mystery", async () => {
    const joined = setMemberReady(joinRoomRecord(room, "guest", "Guest", 2_000), "guest", true);
    const complete = {
      ...joined,
      status: "complete" as const,
      session: createCardMatchSession(createCardMatch(thePainThatMovedCardCase, { seed: joined.seed }), room.roomId),
    };
    await environment.withSecurityRulesDisabled(async (context) => setDoc(doc(context.firestore(), "rooms", room.roomId), complete));
    const reset = resetCompletedRoom(complete, "guest", {
      caseId: rematchCase.caseId,
      contentVersion: rematchCase.contentVersion,
      seed: "rules-rematch",
    }, 5_000);
    await assertSucceeds(setDoc(doc(environment.authenticatedContext("guest").firestore(), "rooms", room.roomId), reset));
    await assertFails(setDoc(doc(environment.authenticatedContext("outsider").firestore(), "rooms", room.roomId), reset));
    await assertFails(setDoc(doc(environment.authenticatedContext("guest").firestore(), "rooms", room.roomId), {
      ...reset,
      members: { ...reset.members, host: { ...reset.members.host!, displayName: "Changed" } },
    }));
  });
});
