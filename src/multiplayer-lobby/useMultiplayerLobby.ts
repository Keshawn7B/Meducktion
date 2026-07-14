import { useEffect, useMemo, useRef, useState } from "react";
import { thePainThatMovedCardCase } from "../card-content";
import { ensureAnonymousPlayer, getFirebaseServices } from "../firebase/client";
import {
  FirestoreMultiplayerRoomRepository,
  generateRoomCode,
  type MultiplayerRoom,
  type MultiplayerRoomRepository,
} from "../multiplayer-room";
import type { MultiplayerLobbyActions, MultiplayerLobbyModel } from "./types";

const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
type LobbyOperation = NonNullable<MultiplayerLobbyModel["operation"]>;

export interface MultiplayerLobbyController {
  readonly model: MultiplayerLobbyModel;
  readonly actions: MultiplayerLobbyActions;
}

function messageFrom(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error
    ? String((error as { code: unknown }).code)
    : "";
  if (code.includes("permission-denied")) return "Firebase blocked that lobby action. Refresh and try again.";
  if (code.includes("not-found")) return "That room code was not found.";
  if (code.includes("unavailable")) return "The lobby service is temporarily unavailable. Check your connection.";
  if (code.includes("unauthenticated")) return "Your guest session expired. Refresh and reconnect.";
  if (error instanceof Error && error.message) return error.message;
  return "The lobby could not be updated. Please try again.";
}

export function useMultiplayerLobby(): MultiplayerLobbyController {
  const repositoryRef = useRef<MultiplayerRoomRepository | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [operation, setOperation] = useState<LobbyOperation | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => () => unsubscribeRef.current?.(), []);

  function repository(): MultiplayerRoomRepository {
    if (!repositoryRef.current) {
      repositoryRef.current = new FirestoreMultiplayerRoomRepository(
        getFirebaseServices().firestore,
      );
    }
    return repositoryRef.current;
  }

  function watchRoom(roomCode: string): void {
    unsubscribeRef.current?.();
    unsubscribeRef.current = repository().subscribe(roomCode, (nextRoom) => {
      if (!nextRoom) {
        setRoom(null);
        setErrorMessage("This room is no longer available.");
        return;
      }
      setRoom(nextRoom);
    });
  }

  async function run(currentOperation: LobbyOperation, task: () => Promise<void>): Promise<void> {
    setBusy(true);
    setOperation(currentOperation);
    setErrorMessage("");
    try {
      await task();
    } catch (error) {
      setErrorMessage(messageFrom(error));
    } finally {
      setBusy(false);
      setOperation(null);
    }
  }

  const actions = useMemo<MultiplayerLobbyActions>(() => ({
    createRoom: async (displayName, maximumPlayers) => run("create", async () => {
      const user = await ensureAnonymousPlayer();
      const roomCode = generateRoomCode();
      const created = await repository().createRoom({
        roomId: roomCode,
        hostUid: user.uid,
        hostDisplayName: displayName,
        maximumPlayers,
        caseId: thePainThatMovedCardCase.caseId,
        contentVersion: thePainThatMovedCardCase.contentVersion,
        seed: `room-${roomCode}-${Date.now().toString(36)}`,
        now: Date.now(),
      });
      setUid(user.uid);
      setRoom(created);
      watchRoom(created.roomId);
    }),
    joinRoom: async (displayName, rawRoomCode) => run("join", async () => {
      const roomCode = rawRoomCode.trim().toUpperCase();
      if (!ROOM_CODE_PATTERN.test(roomCode)) {
        throw new Error("Enter a six-character room code.");
      }
      const user = await ensureAnonymousPlayer();
      const joined = await repository().joinRoom(roomCode, user.uid, displayName);
      setUid(user.uid);
      setRoom(joined);
      watchRoom(joined.roomId);
    }),
    toggleReady: async () => run("ready", async () => {
      if (!room || !uid) return;
      const current = room.members[uid];
      if (!current || uid === room.hostUid) return;
      setRoom(await repository().setReady(room.roomId, uid, !current.ready));
    }),
    startLobby: async () => run("start", async () => {
      if (!room || !uid) return;
      setRoom(await repository().markReadyToStart(room.roomId, uid));
    }),
    leaveRoom: async () => {
      if (!room || !uid || room.status !== "lobby") return true;
      setBusy(true);
      setOperation("leave");
      setErrorMessage("");
      try {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      await repository().leaveRoom(room.roomId, uid);
      setRoom(null);
      setUid("");
        return true;
      } catch (error) {
        setErrorMessage(messageFrom(error));
        watchRoom(room.roomId);
        return false;
      } finally {
        setBusy(false);
        setOperation(null);
      }
    },
    clearError: () => setErrorMessage(""),
  // Room and identity intentionally refresh action closures after snapshots.
  }), [room, uid]);

  const members = room?.memberUids.map((memberUid) => {
    const member = room.members[memberUid];
    return {
      uid: memberUid,
      displayName: member?.displayName ?? "Player",
      isHost: memberUid === room.hostUid,
      isCurrentPlayer: memberUid === uid,
      ready: member?.ready ?? false,
    };
  }) ?? [];
  const isHost = Boolean(room && uid === room.hostUid);
  const allReady = members.length >= 2 && members.every((member) => member.ready);

  return {
    model: {
      screen: room?.status === "ready" ? "ready" : room ? "room" : "entry",
      busy,
      operation,
      ...(errorMessage ? { errorMessage } : {}),
      ...(room ? { roomCode: room.roomId } : {}),
      maximumPlayers: room?.maximumPlayers ?? 4,
      isHost,
      currentPlayerReady: room?.members[uid]?.ready ?? false,
      canStart: isHost && room?.status === "lobby" && allReady,
      members,
    },
    actions,
  };
}
