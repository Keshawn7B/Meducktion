import { useEffect, useMemo, useRef, useState } from "react";
import { getCardCaseById, thePainThatMovedCardCase } from "../card-content";
import { createCardMatch, type CardGameCommand } from "../card-game-engine";
import { applyCardMatchCommand, createCardMatchSession } from "../card-match-session";
import { buildCardAppModel, type CardMatchController } from "../card-hooks/useCardMatch";
import type { CardAppActions, CardAppModel, DiagnosisInput } from "../card-app/types";
import { ensureAnonymousPlayer, getFirebaseServices } from "../firebase/client";
import {
  FirestoreMultiplayerRoomRepository,
  generateRoomCode,
  type MultiplayerRoom,
  type MultiplayerRoomRepository,
} from "../multiplayer-room";
import type { MultiplayerLobbyActions, MultiplayerLobbyModel } from "./types";
import { selectMultiplayerCase } from "./caseSelection";

const ROOM_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{6}$/;
const ACTIVE_ROOM_STORAGE_KEY = "meducktion:multiplayer-room";
const PRESENCE_HEARTBEAT_MS = 15_000;
export const PRESENCE_TIMEOUT_MS = 90_000;
type LobbyOperation = NonNullable<MultiplayerLobbyModel["operation"]>;

function savedRoomCode(): string {
  try { return localStorage.getItem(ACTIVE_ROOM_STORAGE_KEY) ?? ""; } catch { return ""; }
}

function rememberRoomCode(roomCode?: string): void {
  try {
    if (roomCode) localStorage.setItem(ACTIVE_ROOM_STORAGE_KEY, roomCode);
    else localStorage.removeItem(ACTIVE_ROOM_STORAGE_KEY);
  } catch { /* Reconnect persistence is optional. */ }
}

function roomUsesCurrentCardContent(room: MultiplayerRoom): boolean {
  const content = getCardCaseById(room.caseId);
  return content !== undefined &&
    room.contentVersion === content.contentVersion &&
    (room.session == null ||
      (room.session.contentVersion === content.contentVersion &&
        room.session.matchState.contentVersion === content.contentVersion));
}

export interface MultiplayerLobbyController {
  readonly model: MultiplayerLobbyModel;
  readonly actions: MultiplayerLobbyActions;
  readonly match: (CardMatchController & { readonly leaveMatch: () => void }) | null;
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

export function useMultiplayerLobby(onExit?: () => void): MultiplayerLobbyController {
  const repositoryRef = useRef<MultiplayerRoomRepository | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const presenceUnsubscribeRef = useRef<(() => void) | null>(null);
  const presenceMonitoringStartedRef = useRef(0);
  const takeoverInFlightRef = useRef(new Set<string>());
  const uidRef = useRef("");
  const [room, setRoom] = useState<MultiplayerRoom | null>(null);
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [presenceByUid, setPresenceByUid] = useState<Readonly<Record<string, number>>>({});
  const [operation, setOperation] = useState<LobbyOperation | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const commandCounter = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const roomCode = savedRoomCode();
    if (ROOM_CODE_PATTERN.test(roomCode)) {
      void ensureAnonymousPlayer().then((user) => {
        if (cancelled) return;
        uidRef.current = user.uid;
        setUid(user.uid);
        watchRoom(roomCode);
      }).catch((error) => {
        if (!cancelled) setErrorMessage(messageFrom(error));
      });
    }
    return () => {
      cancelled = true;
      unsubscribeRef.current?.();
      presenceUnsubscribeRef.current?.();
    };
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    presenceUnsubscribeRef.current?.();
    presenceUnsubscribeRef.current = null;
    setPresenceByUid({});
    if (!room || room.status !== "active" || !uid) return;

    const roomId = room.roomId;
    const activeRepository = repository();
    presenceMonitoringStartedRef.current = Date.now();
    presenceUnsubscribeRef.current = activeRepository.subscribePresence(roomId, setPresenceByUid);
    const heartbeat = () => {
      if (navigator.onLine) void activeRepository.heartbeatPresence(roomId, uid).catch(() => undefined);
    };
    heartbeat();
    const heartbeatInterval = window.setInterval(heartbeat, PRESENCE_HEARTBEAT_MS);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") heartbeat();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.clearInterval(heartbeatInterval);
      document.removeEventListener("visibilitychange", handleVisibility);
      presenceUnsubscribeRef.current?.();
      presenceUnsubscribeRef.current = null;
    };
  }, [room?.roomId, room?.status, uid]);

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
        rememberRoomCode();
        setErrorMessage("This room is no longer available.");
        return;
      }
      if (!roomUsesCurrentCardContent(nextRoom)) {
        setRoom(null);
        rememberRoomCode();
        setErrorMessage("That room uses an older card catalog and cannot be resumed. Create a new room to use the complete symptom deck.");
        return;
      }
      const currentUid = uidRef.current;
      if (currentUid && nextRoom.session?.matchState.players[currentUid]?.kind === "bot") {
        unsubscribeRef.current?.();
        unsubscribeRef.current = null;
        setRoom(null);
        rememberRoomCode();
        setErrorMessage("Your seat was replaced by a bot after the connection timeout. Start or join a new room to keep playing.");
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
    createRoom: async (displayName, maximumPlayers, maximumRounds) => run("create", async () => {
      const user = await ensureAnonymousPlayer();
      const roomCode = generateRoomCode();
      const seed = `room-${roomCode}-${Date.now().toString(36)}-${generateRoomCode()}`;
      const selectedCase = selectMultiplayerCase(seed);
      const created = await repository().createRoom({
        roomId: roomCode,
        hostUid: user.uid,
        hostDisplayName: displayName,
        maximumPlayers,
        maximumRounds,
        caseId: selectedCase.caseId,
        contentVersion: selectedCase.contentVersion,
        seed,
        now: Date.now(),
      });
      uidRef.current = user.uid;
      setUid(user.uid);
      setRoom(created);
      rememberRoomCode(created.roomId);
      watchRoom(created.roomId);
    }),
    joinRoom: async (displayName, rawRoomCode) => run("join", async () => {
      const roomCode = rawRoomCode.trim().toUpperCase();
      if (!ROOM_CODE_PATTERN.test(roomCode)) {
        throw new Error("Enter a six-character room code.");
      }
      const user = await ensureAnonymousPlayer();
      const joined = await repository().joinRoom(roomCode, user.uid, displayName);
      if (!roomUsesCurrentCardContent(joined)) {
        await repository().leaveRoom(roomCode, user.uid).catch(() => undefined);
        throw new Error("That room uses an older card catalog and cannot be resumed. Create a new room to use the complete symptom deck.");
      }
      uidRef.current = user.uid;
      setUid(user.uid);
      setRoom(joined);
      rememberRoomCode(joined.roomId);
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
      if (!roomUsesCurrentCardContent(room)) {
        throw new Error("This room uses an older card catalog. Create a new room before starting.");
      }
      const roomContent = getCardCaseById(room.caseId) ?? thePainThatMovedCardCase;
      const match = createCardMatch(roomContent, {
        seed: room.seed,
        matchId: `match.online.${room.roomId}`,
        maximumRounds: room.maximumRounds,
        players: room.memberUids.map((memberUid) => ({
          id: memberUid,
          displayName: room.members[memberUid]?.displayName ?? "Player",
          kind: "human" as const,
        })),
      });
      let session = createCardMatchSession(match, `session.online.${room.roomId}`);
      for (const command of [{ type: "START_MATCH" }, { type: "DRAW_CARDS" }] as const) {
        const transition = applyCardMatchCommand(session, {
          commandId: `${session.sessionId}:setup:${session.commandSequence + 1}`,
          commandSequence: session.commandSequence + 1,
          expectedRevision: session.matchState.revision,
          command,
        });
        if (transition.error) throw new Error(transition.error.message);
        session = transition.session;
      }
      setRoom(await repository().startRoom(room.roomId, uid, session));
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
        await repository().removePresence(room.roomId, uid).catch(() => undefined);
        rememberRoomCode();
        setRoom(null);
        uidRef.current = "";
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

  async function sendCommand(
    source: MultiplayerRoom,
    command: CardGameCommand,
  ): Promise<MultiplayerRoom> {
    if (!source.session || !uid) throw new Error("The online match is not ready.");
    commandCounter.current += 1;
    const updated = await repository().submitCommand(source.roomId, uid, {
      commandId: `${uid}:${Date.now().toString(36)}:${commandCounter.current}`,
      commandSequence: source.session.commandSequence + 1,
      expectedRevision: source.session.matchState.revision,
      command,
    });
    setRoom(updated);
    return updated;
  }

  async function performMatch(task: () => Promise<void>): Promise<void> {
    setBusy(true);
    setErrorMessage("");
    try {
      await task();
    } catch (error) {
      setErrorMessage(messageFrom(error));
    } finally {
      setBusy(false);
    }
  }

  function everyPlayerDecided(current: MultiplayerRoom): boolean {
    const state = current.session?.matchState;
    if (!state || state.phase !== "diagnosis_window") return false;
    return state.playerOrder.every((playerId) => {
      const player = state.players[playerId];
      return !player ||
        (!player.pendingCluePenaltyChoice && (
          player.finalDiagnosisSubmitted ||
          player.diagnosisSubmissions.some((submission) => submission.round === state.currentRound) ||
          (state.diagnosisPassedPlayerIds ?? []).includes(playerId)
        ));
    });
  }

  async function continueWhenReady(source: MultiplayerRoom): Promise<MultiplayerRoom> {
    let next = source;
    if (everyPlayerDecided(next)) {
      next = await sendCommand(next, { type: "CONTINUE_FROM_DIAGNOSIS" });
      if (next.session?.matchState.phase === "next_round") {
        next = await sendCommand(next, { type: "ADVANCE_ROUND" });
        next = await sendCommand(next, { type: "DRAW_CARDS" });
      }
    }
    return next;
  }

  useEffect(() => {
    const state = room?.session?.matchState;
    if (!room?.session || !state || room.status !== "active" || !uid || !isOnline || busy) return;
    const player = state.players[uid];
    const shouldAcknowledge = state.phase === "card_reveal" && !state.acknowledgedRevealPlayerIds.includes(uid);
    const shouldOpen = state.phase === "clue_review";
    const shouldPass = state.phase === "diagnosis_window"
      && player !== undefined
      && !player.finalDiagnosisSubmitted
      && !player.diagnosisSubmissions.some((submission) => submission.round === state.currentRound)
      && !(state.diagnosisPassedPlayerIds ?? []).includes(uid);
    if (!shouldAcknowledge && !shouldOpen && !shouldPass) return;

    void performMatch(async () => {
      let next = room;
      if (next.session?.matchState.phase === "card_reveal" && !next.session.matchState.acknowledgedRevealPlayerIds.includes(uid)) {
        next = await sendCommand(next, { type: "ACKNOWLEDGE_REVEAL", playerId: uid });
      }
      if (next.session?.matchState.phase === "clue_review") {
        next = await sendCommand(next, { type: "OPEN_DIAGNOSIS_WINDOW" });
      }
      if (next.session?.matchState.phase === "diagnosis_window") {
        const current = next.session.matchState.players[uid];
        const decided = current?.finalDiagnosisSubmitted
          || current?.diagnosisSubmissions.some((submission) => submission.round === next.session!.matchState.currentRound)
          || (next.session.matchState.diagnosisPassedPlayerIds ?? []).includes(uid);
        if (!decided) next = await sendCommand(next, { type: "PASS_DIAGNOSIS", playerId: uid });
        await continueWhenReady(next);
      }
    });
  }, [room?.revision, uid, isOnline, busy]);

  useEffect(() => {
    if (!room?.session || room.status !== "active" || !uid || !isOnline || busy) return;
    const checkForDisconnectedPlayer = () => {
      if (Date.now() - presenceMonitoringStartedRef.current < PRESENCE_TIMEOUT_MS) return;
      const staleUid = room.session?.matchState.playerOrder.find((playerId) => {
        if (playerId === uid || takeoverInFlightRef.current.has(playerId)) return false;
        const player = room.session?.matchState.players[playerId];
        if (!player || player.kind !== "human") return false;
        const lastSeenAt = presenceByUid[playerId];
        return lastSeenAt === undefined || Date.now() - lastSeenAt >= PRESENCE_TIMEOUT_MS;
      });
      if (!staleUid) return;
      takeoverInFlightRef.current.add(staleUid);
      commandCounter.current += 1;
      void performMatch(async () => {
        let next = await repository().replaceStalePlayer(room.roomId, uid, staleUid, {
          commandId: `${uid}:presence:${Date.now().toString(36)}:${commandCounter.current}`,
          commandSequence: room.session!.commandSequence + 1,
          expectedRevision: room.session!.matchState.revision,
          command: { type: "CONVERT_TO_BOT", playerId: staleUid },
        }, PRESENCE_TIMEOUT_MS);
        setRoom(next);
        if (next.session?.matchState.phase === "clue_review") {
          next = await sendCommand(next, { type: "OPEN_DIAGNOSIS_WINDOW" });
        }
        await continueWhenReady(next);
      }).finally(() => takeoverInFlightRef.current.delete(staleUid));
    };
    checkForDisconnectedPlayer();
    const staleCheckInterval = window.setInterval(checkForDisconnectedPlayer, 5_000);
    return () => window.clearInterval(staleCheckInterval);
  }, [room, uid, isOnline, busy, presenceByUid]);

  const matchActions: CardAppActions | null = room?.session && uid
    ? {
        goHome: () => onExit?.(),
        openSetup: () => undefined,
        resumeMatch: () => undefined,
        startMatch: () => undefined,
        dealCards: () => undefined,
        toggleCard: (cardInstanceId) => void performMatch(async () => {
          if (!room.session) return;
          const selected = room.session.matchState.players[uid]?.hand.selectedCardInstanceId;
          await sendCommand(room, selected === cardInstanceId
            ? { type: "DESELECT_CARD", playerId: uid }
            : { type: "SELECT_CARD", playerId: uid, cardInstanceId });
        }),
        useRedraw: () => void performMatch(async () => {
          await sendCommand(room, { type: "USE_REDRAW", playerId: uid });
        }),
        lockCard: () => void performMatch(async () => {
          let next = await sendCommand(room, { type: "LOCK_CARD", playerId: uid });
          if (next.session?.matchState.phase === "cards_locked") {
            next = await sendCommand(next, { type: "RESOLVE_ROUND" });
          }
        }),
        unlockCard: () => void performMatch(async () => {
          await sendCommand(room, { type: "UNLOCK_CARD", playerId: uid });
        }),
        revealCards: () => void performMatch(async () => {
          let next = room;
          if (next.session?.matchState.phase === "cards_locked") {
            next = await sendCommand(next, { type: "RESOLVE_ROUND" });
          }
          if (
            next.session?.matchState.phase === "card_reveal" &&
            !next.session.matchState.acknowledgedRevealPlayerIds.includes(uid)
          ) {
            next = await sendCommand(next, { type: "ACKNOWLEDGE_REVEAL", playerId: uid });
          }
          if (next.session?.matchState.phase === "clue_review") {
            await sendCommand(next, { type: "OPEN_DIAGNOSIS_WINDOW" });
          }
        }),
        advanceRound: () => void performMatch(async () => {
          const passed = await sendCommand(room, { type: "PASS_DIAGNOSIS", playerId: uid });
          await continueWhenReady(passed);
        }),
        submitDiagnosis: (input: DiagnosisInput) => void performMatch(async () => {
          const submitted = await sendCommand(room, {
            type: "SUBMIT_DIAGNOSIS",
            playerId: uid,
            conditionId: input.conditionId,
            clueIds: input.clueIds,
          });
          await continueWhenReady(submitted);
        }),
        chooseCluePilePenalty: (answer) => void performMatch(async () => {
          const chosen = await sendCommand(room, {
            type: "CHOOSE_CLUE_PILE_PENALTY",
            playerId: uid,
            answer,
          });
          await continueWhenReady(chosen);
        }),
        playAgain: () => void performMatch(async () => {
          const seed = `${room.seed}:rematch:${generateRoomCode()}`;
          const selectedCase = selectMultiplayerCase(seed, room.caseId);
          const reset = await repository().resetRoom(room.roomId, uid, {
            caseId: selectedCase.caseId,
            contentVersion: selectedCase.contentVersion,
            seed,
          });
          setRoom(reset);
          rememberRoomCode(reset.roomId);
        }),
      }
    : null;

  function addOnlineState(model: CardAppModel): CardAppModel {
    if (!room) return model;
    const interactionBlocked = busy || !isOnline;
    return {
      ...model,
      online: {
        roomCode: room.roomId,
        isSyncing: busy,
        isOffline: !isOnline,
      },
      match: {
        ...model.match,
        hand: model.match.hand.map((card) => ({
          ...card,
          disabled: card.disabled || interactionBlocked,
        })),
        canLock: model.match.canLock && !interactionBlocked,
        canReveal: model.match.canReveal && !interactionBlocked,
        canAdvance: model.match.canAdvance && !interactionBlocked,
        diagnosisUnlocked: model.match.diagnosisUnlocked && !interactionBlocked,
        opponents: model.match.opponents.map((opponent) => {
          const player = room.session?.matchState.players[opponent.id];
          const lastSeenAt = presenceByUid[opponent.id];
          const reconnecting = player?.kind === "human"
            && Date.now() - presenceMonitoringStartedRef.current >= PRESENCE_HEARTBEAT_MS * 2
            && (lastSeenAt === undefined || Date.now() - lastSeenAt >= PRESENCE_HEARTBEAT_MS * 2);
          return reconnecting ? { ...opponent, status: "reconnecting" as const } : opponent;
        }),
      },
    };
  }

  const match = room?.session && uid && matchActions && roomUsesCurrentCardContent(room)
    ? {
        model: addOnlineState(buildCardAppModel(
          getCardCaseById(room.caseId) ?? thePainThatMovedCardCase,
          room.session.matchState.phase === "match_complete" ? "results" : "match",
          room.session,
          busy ? "Syncing with the room…" : "",
          undefined,
          errorMessage || undefined,
          uid,
        )),
        actions: matchActions,
        leaveMatch: () => void performMatch(async () => {
          let next = await sendCommand(room, { type: "CONVERT_TO_BOT", playerId: uid });
          if (next.session?.matchState.phase === "clue_review") {
            next = await sendCommand(next, { type: "OPEN_DIAGNOSIS_WINDOW" });
          }
          await continueWhenReady(next);
          await repository().removePresence(room.roomId, uid).catch(() => undefined);
          rememberRoomCode();
          onExit?.();
        }),
      }
    : null;

  return {
    model: {
      screen: room?.status === "ready" ? "ready" : room ? "room" : "entry",
      busy,
      operation,
      ...(errorMessage ? { errorMessage } : {}),
      ...(room ? { roomCode: room.roomId } : {}),
      ...(room ? { caseTitle: room.status === "lobby" ? "Random mystery" : "Current mystery" } : {}),
      maximumPlayers: room?.maximumPlayers ?? 4,
      maximumRounds: room?.maximumRounds === undefined ? 10 : room.maximumRounds,
      isHost,
      currentPlayerReady: room?.members[uid]?.ready ?? false,
      canStart: isHost && room?.status === "lobby" && allReady,
      members,
    },
    actions,
    match,
  };
}
