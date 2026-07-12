import { useCallback, useMemo, useState } from "react";
import { thePainThatMoved } from "../case-content";
import type { GameCommand, GameEvent } from "../game-engine";
import {
  applySessionCommand,
  createBrowserStorage,
  createSession,
  loadSession,
  resetSession,
  saveSession,
} from "../game-session";
import type {
  GameSession,
  SessionError,
  SessionStorageAdapter,
} from "../game-session";

const browserStore = (): SessionStorageAdapter =>
  createBrowserStorage(window.localStorage);
export function useGameSession(store: SessionStorageAdapter = browserStore()) {
  const loaded = useMemo(() => loadSession(store), [store]);
  const [session, setSession] = useState<GameSession | undefined>();
  const [resumeAvailable, setResumeAvailable] = useState(
    Boolean(loaded.session),
  );
  const [error, setError] = useState<SessionError | undefined>(loaded.error);
  const [latestEvents, setLatestEvents] = useState<GameEvent[]>([]);
  const startNew = useCallback(() => {
    const transportId = globalThis.crypto?.randomUUID?.() ?? String(Date.now());
    const id = `meducktion-solo-${transportId}`;
    const next = createSession(thePainThatMoved, id);
    setSession(next);
    setLatestEvents([]);
    setError(undefined);
    saveSession(store, next);
    setResumeAvailable(true);
  }, [store]);
  const resume = useCallback(() => {
    const found = loadSession(store);
    if (found.session) {
      setSession(found.session);
      setError(undefined);
    } else {
      setError(
        found.error ?? {
          code: "INVALID_SNAPSHOT",
          message: "No valid saved case was found.",
        },
      );
      if (found.error) resetSession(store);
    }
  }, [store]);
  const dispatch = useCallback(
    (command: GameCommand) => {
      if (!session) return;
      const seq = session.commandSequence + 1;
      const result = applySessionCommand(thePainThatMoved, session, {
        commandId: `${session.sessionId}:${seq}`,
        expectedRevision: session.gameState.revision,
        commandSequence: seq,
        command,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      setSession(result.session);
      setLatestEvents(result.events);
      setError(undefined);
      saveSession(store, result.session);
    },
    [session, store],
  );
  const reset = useCallback(() => {
    resetSession(store);
    setSession(undefined);
    setResumeAvailable(false);
    setLatestEvents([]);
    setError(undefined);
  }, [store]);
  return {
    session,
    state: session?.gameState,
    caseDefinition: thePainThatMoved,
    dispatch,
    error,
    latestEvents,
    resumeAvailable,
    startNew,
    resume,
    reset,
  };
}
