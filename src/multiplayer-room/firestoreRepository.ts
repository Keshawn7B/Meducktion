import { doc, onSnapshot, runTransaction, setDoc, type Firestore } from "firebase/firestore";
import { applyRoomCommand, createRoomRecord, joinRoomRecord, leaveRoomRecord, markRoomReadyToStart, setMemberReady, startRoomRecord } from "./protocol";
import type { CreateMultiplayerRoomInput, MultiplayerRoom, MultiplayerRoomRepository } from "./types";
import type { CardMatchCommandEnvelope, CardMatchSession } from "../card-match-session";

export class FirestoreMultiplayerRoomRepository implements MultiplayerRoomRepository {
  constructor(private readonly firestore: Firestore, private readonly now: () => number = Date.now) {}
  private reference(roomId: string) { return doc(this.firestore, "rooms", roomId.toUpperCase()); }

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
      if (room.hostUid === uid) transaction.delete(reference);
      else transaction.set(reference, leaveRoomRecord(room, uid));
    });
  }
  startRoom(roomId: string, uid: string, session: CardMatchSession) { return this.update(roomId, (room) => startRoomRecord(room, uid, session, this.now())); }
  submitCommand(roomId: string, uid: string, envelope: CardMatchCommandEnvelope) { return this.update(roomId, (room) => applyRoomCommand(room, uid, envelope, this.now())); }
  subscribe(roomId: string, listener: (room: MultiplayerRoom | null) => void) {
    return onSnapshot(this.reference(roomId), (snapshot) => listener(snapshot.exists() ? snapshot.data() as MultiplayerRoom : null));
  }
}
