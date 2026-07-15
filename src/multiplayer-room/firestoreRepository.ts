import { collection, deleteDoc, doc, getDocs, onSnapshot, runTransaction, serverTimestamp, setDoc, Timestamp, type Firestore } from "firebase/firestore";
import { applyRoomCommand, createRoomRecord, joinRoomRecord, leaveRoomRecord, markRoomReadyToStart, resetCompletedRoom, setMemberReady, startRoomRecord } from "./protocol";
import type { CreateMultiplayerRoomInput, MultiplayerMysterySelection, MultiplayerRoom, MultiplayerRoomRepository } from "./types";
import type { CardMatchCommandEnvelope, CardMatchSession } from "../card-match-session";

export class FirestoreMultiplayerRoomRepository implements MultiplayerRoomRepository {
  constructor(private readonly firestore: Firestore, private readonly now: () => number = Date.now) {}
  private reference(roomId: string) { return doc(this.firestore, "rooms", roomId.toUpperCase()); }
  private presenceReference(roomId: string, uid: string) { return doc(this.firestore, "rooms", roomId.toUpperCase(), "presence", uid); }

  async createRoom(input: CreateMultiplayerRoomInput): Promise<MultiplayerRoom> {
    const room = createRoomRecord(input);
    await setDoc(this.reference(room.roomId), room);
    return room;
  }
  private async update(roomId: string, mutate: (room: MultiplayerRoom) => MultiplayerRoom): Promise<MultiplayerRoom> {
    return runTransaction(this.firestore, async (transaction) => {
      const reference = this.reference(roomId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) throw new Error("Room not found.");
      const next = mutate(snapshot.data() as MultiplayerRoom);
      transaction.set(reference, next);
      return next;
    });
  }
  joinRoom(roomId: string, uid: string, displayName: string) { return this.update(roomId, (room) => joinRoomRecord(room, uid, displayName, this.now())); }
  setReady(roomId: string, uid: string, ready: boolean) { return this.update(roomId, (room) => setMemberReady(room, uid, ready)); }
  markReadyToStart(roomId: string, uid: string) { return this.update(roomId, (room) => markRoomReadyToStart(room, uid)); }
  async leaveRoom(roomId: string, uid: string): Promise<void> {
    await runTransaction(this.firestore, async (transaction) => {
      const reference = this.reference(roomId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) return;
      const room = snapshot.data() as MultiplayerRoom;
      if (room.hostUid === uid && room.memberUids.length === 1) transaction.delete(reference);
      else transaction.set(reference, leaveRoomRecord(room, uid));
    });
  }
  async closeRoom(roomId: string, uid: string): Promise<void> {
    const presence = await getDocs(collection(this.reference(roomId), "presence"));
    await runTransaction(this.firestore, async (transaction) => {
      const reference = this.reference(roomId);
      const snapshot = await transaction.get(reference);
      if (!snapshot.exists()) return;
      const room = snapshot.data() as MultiplayerRoom;
      if (room.hostUid !== uid) throw new Error("Only the room host can close this room.");
      presence.docs.forEach((presenceDocument) => transaction.delete(presenceDocument.ref));
      transaction.delete(reference);
    });
  }
  resetRoom(roomId: string, uid: string, mystery: MultiplayerMysterySelection) {
    return this.update(roomId, (room) => resetCompletedRoom(room, uid, mystery, this.now()));
  }
  async heartbeatPresence(roomId: string, uid: string): Promise<void> {
    await setDoc(this.presenceReference(roomId, uid), { uid, lastSeenAt: serverTimestamp() });
  }
  async removePresence(roomId: string, uid: string): Promise<void> {
    await deleteDoc(this.presenceReference(roomId, uid));
  }
  subscribePresence(roomId: string, listener: (presence: Readonly<Record<string, number>>) => void) {
    return onSnapshot(collection(this.reference(roomId), "presence"), (snapshot) => {
      const presence: Record<string, number> = {};
      snapshot.docs.forEach((presenceDocument) => {
        const lastSeenAt = presenceDocument.data().lastSeenAt;
        if (lastSeenAt instanceof Timestamp) presence[presenceDocument.id] = lastSeenAt.toMillis();
      });
      listener(presence);
    });
  }
  async replaceStalePlayer(
    roomId: string,
    actorUid: string,
    staleUid: string,
    envelope: CardMatchCommandEnvelope,
    timeoutMs: number,
  ): Promise<MultiplayerRoom> {
    return runTransaction(this.firestore, async (transaction) => {
      const roomReference = this.reference(roomId);
      const presenceReference = this.presenceReference(roomId, staleUid);
      const [roomSnapshot, presenceSnapshot] = await Promise.all([
        transaction.get(roomReference),
        transaction.get(presenceReference),
      ]);
      if (!roomSnapshot.exists()) throw new Error("Room not found.");
      const room = roomSnapshot.data() as MultiplayerRoom;
      if (!room.memberUids.includes(actorUid)) throw new Error("Only a room member can replace a disconnected player.");
      const lastSeenAt = presenceSnapshot.data()?.lastSeenAt;
      if (lastSeenAt instanceof Timestamp && this.now() - lastSeenAt.toMillis() < timeoutMs) {
        throw new Error("That player is reconnecting.");
      }
      const normalized = room.session && !room.session.appliedCommandIds.includes(envelope.commandId)
        ? {
            ...envelope,
            commandSequence: room.session.commandSequence + 1,
            expectedRevision: room.session.matchState.revision,
          }
        : envelope;
      const next = applyRoomCommand(room, staleUid, normalized, this.now());
      transaction.set(roomReference, next);
      transaction.delete(presenceReference);
      return next;
    });
  }
  startRoom(roomId: string, uid: string, session: CardMatchSession) { return this.update(roomId, (room) => startRoomRecord(room, uid, session, this.now())); }
  submitCommand(roomId: string, uid: string, envelope: CardMatchCommandEnvelope) {
    return this.update(roomId, (room) => {
      const normalized = room.session && !room.session.appliedCommandIds.includes(envelope.commandId)
        ? {
            ...envelope,
            commandSequence: room.session.commandSequence + 1,
            expectedRevision: room.session.matchState.revision,
          }
        : envelope;
      return applyRoomCommand(room, uid, normalized, this.now());
    });
  }
  subscribe(roomId: string, listener: (room: MultiplayerRoom | null) => void) {
    return onSnapshot(this.reference(roomId), (snapshot) => listener(snapshot.exists() ? snapshot.data() as MultiplayerRoom : null));
  }
}
