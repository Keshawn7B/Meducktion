import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createRoomRecord, joinRoomRecord, markRoomReadyToStart, setMemberReady } from "./protocol";

let environment: RulesTestEnvironment;
const room = createRoomRecord({ roomId: "RULES1", hostUid: "host", hostDisplayName: "Host", maximumPlayers: 4, caseId: "case.the-pain-that-moved", contentVersion: "1.0.0", seed: "rules", now: 1_000 });

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
});
