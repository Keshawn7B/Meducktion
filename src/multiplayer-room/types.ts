import type { CardMatchCommandEnvelope, CardMatchSession } from "../card-match-session";

export type MultiplayerRoomStatus = "lobby" | "ready" | "active" | "complete";

export interface MultiplayerMember {
  uid: string;
  displayName: string;
  joinedAt: number;
  ready: boolean;
}

export interface MultiplayerRoom {
  schemaVersion: "meducktion-room-v1";
  roomId: string;
  status: MultiplayerRoomStatus;
  hostUid: string;
  memberUids: string[];
  members: Record<string, MultiplayerMember>;
  maximumPlayers: 2 | 3 | 4;
  caseId: string;
  contentVersion: string;
  seed: string;
  session: CardMatchSession | null;
  revision: number;
  createdAt: number;
  expiresAt: number;
}

export interface CreateMultiplayerRoomInput {
  roomId: string;
  hostUid: string;
  hostDisplayName: string;
  maximumPlayers: 2 | 3 | 4;
  caseId: string;
  contentVersion: string;
  seed: string;
  now: number;
}

export interface MultiplayerRoomRepository {
  createRoom(input: CreateMultiplayerRoomInput): Promise<MultiplayerRoom>;
  joinRoom(roomId: string, uid: string, displayName: string): Promise<MultiplayerRoom>;
  setReady(roomId: string, uid: string, ready: boolean): Promise<MultiplayerRoom>;
  markReadyToStart(roomId: string, uid: string): Promise<MultiplayerRoom>;
  leaveRoom(roomId: string, uid: string): Promise<void>;
  closeRoom(roomId: string, uid: string): Promise<void>;
  resetRoom(roomId: string, uid: string): Promise<MultiplayerRoom>;
  heartbeatPresence(roomId: string, uid: string): Promise<void>;
  removePresence(roomId: string, uid: string): Promise<void>;
  subscribePresence(roomId: string, listener: (presence: Readonly<Record<string, number>>) => void): () => void;
  replaceStalePlayer(roomId: string, actorUid: string, staleUid: string, envelope: CardMatchCommandEnvelope, timeoutMs: number): Promise<MultiplayerRoom>;
  startRoom(roomId: string, uid: string, session: CardMatchSession): Promise<MultiplayerRoom>;
  submitCommand(roomId: string, uid: string, envelope: CardMatchCommandEnvelope): Promise<MultiplayerRoom>;
  subscribe(roomId: string, listener: (room: MultiplayerRoom | null) => void): () => void;
}
