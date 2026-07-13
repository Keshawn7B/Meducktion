import type { CardMatchCommandEnvelope, CardMatchSession } from "../card-match-session";

export type MultiplayerRoomStatus = "lobby" | "active" | "complete";

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
  startRoom(roomId: string, uid: string, session: CardMatchSession): Promise<MultiplayerRoom>;
  submitCommand(roomId: string, uid: string, envelope: CardMatchCommandEnvelope): Promise<MultiplayerRoom>;
  subscribe(roomId: string, listener: (room: MultiplayerRoom | null) => void): () => void;
}
