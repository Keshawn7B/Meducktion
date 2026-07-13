import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createRoomRecord, joinRoomRecord } from "./protocol";

let environment: RulesTestEnvironment;
const room = createRoomRecord({ roomId: "RULES1", hostUid: "host", hostDisplayName: "Host", maximumPlayers: 4, caseId: "case.the-pain-that-moved", contentVersion: "1.0.0", seed: "rules", now: 1_000 });

beforeAll(async () => {
  environment = await initializeTestEnvironment({ projectId: "demo-meducktion", firestore: { rules: readFileSync("firestore.rules", "utf8") } });
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
});
