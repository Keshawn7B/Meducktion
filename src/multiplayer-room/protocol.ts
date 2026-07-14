import { applyCardMatchCommand, type CardMatchCommandEnvelope, type CardMatchSession } from "../card-match-session";
import type { CreateMultiplayerRoomInput, MultiplayerRoom } from "./types";

export class MultiplayerRoomError extends Error {
  constructor(public readonly code: "ROOM_FULL" | "ROOM_ACTIVE" | "NOT_MEMBER" | "NOT_HOST" | "NOT_READY" | "SESSION_ERROR", message: string) {
    super(message);
  }
}

const DAY = 24 * 60 * 60 * 1_000;
const ACTIVE_EXTENSION = 2 * 60 * 60 * 1_000;

export function createRoomRecord(input: CreateMultiplayerRoomInput): MultiplayerRoom {
  const host = { uid: input.hostUid, displayName: input.hostDisplayName.trim() || "Host", joinedAt: input.now, ready: true };
  return {
    schemaVersion: "meducktion-room-v1", roomId: input.roomId.toUpperCase(), status: "lobby",
    hostUid: input.hostUid, memberUids: [input.hostUid], members: { [input.hostUid]: host },
    maximumPlayers: input.maximumPlayers, caseId: input.caseId, contentVersion: input.contentVersion,
    seed: input.seed, session: null, revision: 0, createdAt: input.now, expiresAt: input.now + DAY,
  };
}

export function joinRoomRecord(room: MultiplayerRoom, uid: string, displayName: string, now: number): MultiplayerRoom {
  if (room.status !== "lobby") throw new MultiplayerRoomError("ROOM_ACTIVE", "This match already started.");
  if (room.memberUids.includes(uid)) return room;
  if (room.memberUids.length >= room.maximumPlayers) throw new MultiplayerRoomError("ROOM_FULL", "This room is full.");
  return { ...room, memberUids: [...room.memberUids, uid], members: { ...room.members, [uid]: { uid, displayName: displayName.trim() || "Player", joinedAt: now, ready: false } }, revision: room.revision + 1 };
}

export function setMemberReady(room: MultiplayerRoom, uid: string, ready: boolean): MultiplayerRoom {
  const member = room.members[uid];
  if (!member) throw new MultiplayerRoomError("NOT_MEMBER", "You are not a member of this room.");
  if (room.status !== "lobby") throw new MultiplayerRoomError("ROOM_ACTIVE", "This match already started.");
  return { ...room, members: { ...room.members, [uid]: { ...member, ready } }, revision: room.revision + 1 };
}

export function leaveRoomRecord(room: MultiplayerRoom, uid: string): MultiplayerRoom {
  if (!room.memberUids.includes(uid)) throw new MultiplayerRoomError("NOT_MEMBER", "You are not a member of this room.");
  if (room.hostUid === uid) throw new MultiplayerRoomError("NOT_HOST", "The host closes the room instead of leaving it.");
  if (room.status !== "lobby") throw new MultiplayerRoomError("ROOM_ACTIVE", "This lobby already started.");
  const members = { ...room.members };
  delete members[uid];
  return {
    ...room,
    memberUids: room.memberUids.filter((memberUid) => memberUid !== uid),
    members,
    revision: room.revision + 1,
  };
}

export function markRoomReadyToStart(room: MultiplayerRoom, uid: string): MultiplayerRoom {
  if (room.hostUid !== uid) throw new MultiplayerRoomError("NOT_HOST", "Only the host can start the match.");
  if (room.status !== "lobby") throw new MultiplayerRoomError("ROOM_ACTIVE", "This lobby already started.");
  if (room.memberUids.length < 2 || !room.memberUids.every((id) => room.members[id]?.ready)) {
    throw new MultiplayerRoomError("NOT_READY", "Every player must be ready.");
  }
  return { ...room, status: "ready", revision: room.revision + 1 };
}

export function startRoomRecord(room: MultiplayerRoom, uid: string, session: CardMatchSession, now: number): MultiplayerRoom {
  if (room.hostUid !== uid) throw new MultiplayerRoomError("NOT_HOST", "Only the host can start the match.");
  if (room.status !== "lobby") throw new MultiplayerRoomError("ROOM_ACTIVE", "This match already started.");
  if (room.memberUids.length < 2 || !room.memberUids.every((id) => room.members[id]?.ready)) throw new MultiplayerRoomError("NOT_READY", "Every player must be ready.");
  return { ...room, status: "active", session, revision: room.revision + 1, expiresAt: Math.max(room.expiresAt, now + ACTIVE_EXTENSION) };
}

export function applyRoomCommand(room: MultiplayerRoom, uid: string, envelope: CardMatchCommandEnvelope, now: number): MultiplayerRoom {
  if (!room.memberUids.includes(uid)) throw new MultiplayerRoomError("NOT_MEMBER", "You are not a member of this room.");
  if (room.status !== "active" || !room.session) throw new MultiplayerRoomError("SESSION_ERROR", "This room has no active match.");
  const transition = applyCardMatchCommand(room.session, envelope);
  if (transition.error) throw new MultiplayerRoomError("SESSION_ERROR", transition.error.message);
  return { ...room, status: transition.session.matchState.phase === "match_complete" ? "complete" : "active", session: transition.session, revision: room.revision + (transition.duplicate ? 0 : 1), expiresAt: Math.max(room.expiresAt, now + ACTIVE_EXTENSION) };
}

export function generateRoomCode(random: () => number = Math.random): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(random() * alphabet.length)]).join("");
}
