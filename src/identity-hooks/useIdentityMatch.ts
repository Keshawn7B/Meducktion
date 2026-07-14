import { useCallback, useMemo, useState } from "react";
import { abdominalMysteryPack } from "../identity-content";
import {
  chooseBalancedBotDecision,
  createIdentityMatch,
  transitionIdentityGame,
  type AssistMode,
  type IdentityGameCommand,
  type IdentityMatchState,
} from "../identity-game-engine";
import {
  IDENTITY_MATCH_STORAGE_KEY,
  parseIdentitySession,
  serializeIdentitySession,
} from "../identity-match-session";

const load = () => typeof window === "undefined" ? null : parseIdentitySession(window.localStorage.getItem(IDENTITY_MATCH_STORAGE_KEY))?.matchState ?? null;

export function useIdentityMatch() {
  const [state, setState] = useState<IdentityMatchState | null>(load);
  const [screen, setScreen] = useState<"home" | "tutorial" | "setup" | "match" | "results">(state ? (state.phase === "match_complete" ? "results" : "home") : "home");
  const [error, setError] = useState("");

  const commit = useCallback((next: IdentityMatchState) => {
    setState(next);
    window.localStorage.setItem(IDENTITY_MATCH_STORAGE_KEY, serializeIdentitySession({ sessionVersion: 1, sessionId: next.matchId, matchState: next }));
    if (next.phase === "match_complete") setScreen("results");
  }, []);

  const apply = useCallback((source: IdentityMatchState, command: IdentityGameCommand) => {
    const result = transitionIdentityGame(abdominalMysteryPack, source, command);
    if (result.errors[0]) setError(result.errors[0].message);
    else setError("");
    return result.state;
  }, []);

  const start = useCallback((playerName: string, assistMode: AssistMode) => {
    const seed = `${Date.now()}-${playerName.trim() || "Player"}`;
    const next = createIdentityMatch(abdominalMysteryPack, {
      seed,
      assistMode,
      players: [
        { id: "player.you", displayName: playerName.trim() || "Player", kind: "human" },
        { id: "player.bot", displayName: "Dr. Beak", kind: "bot" },
      ],
    });
    commit(next);
    setScreen("match");
  }, [commit]);

  const reveal = useCallback(() => {
    if (!state) return;
    let next = state;
    for (const id of next.playerOrder) {
      if (next.players[id]?.status === "active") next = apply(next, { type: "REVEAL_CARD", playerId: id });
    }
    commit(next);
  }, [apply, commit, state]);

  const decide = useCallback((decision: { type: "continue" } | { type: "guess"; identityId: string }) => {
    if (!state) return;
    let next = state;
    if (state.players["player.you"]?.status === "active") {
      next = apply(state, decision.type === "continue"
        ? { type: "SUBMIT_CONTINUE", playerId: "player.you" }
        : { type: "SUBMIT_GUESS", playerId: "player.you", identityId: decision.identityId });
    }
    for (const id of next.playerOrder) {
      const bot = next.players[id];
      if (next.phase !== "decision" || bot?.kind !== "bot" || bot.status !== "active" || bot.pendingDecision) continue;
      const botDecision = chooseBalancedBotDecision(abdominalMysteryPack, {
        identityIds: abdominalMysteryPack.identities.map((identity) => identity.id),
        yesCardIds: bot.yesCardIds,
        noCardIds: bot.noCardIds,
        remainingGuesses: bot.remainingGuesses,
        round: next.round,
      });
      next = apply(next, botDecision.type === "continue"
        ? { type: "SUBMIT_CONTINUE", playerId: id }
        : { type: "SUBMIT_GUESS", playerId: id, identityId: botDecision.identityId });
    }
    commit(next);
  }, [apply, commit, state]);

  const mark = useCallback((identityId: string) => {
    if (!state) return;
    const current = state.players["player.you"]?.markings[identityId];
    const marking = current === undefined ? "possible" : current === "possible" ? "unlikely" : current === "unlikely" ? "eliminated" : null;
    commit(apply(state, { type: "MARK_IDENTITY", playerId: "player.you", identityId, marking }));
  }, [apply, commit, state]);

  return useMemo(() => ({
    pack: abdominalMysteryPack, state, screen, error,
    canResume: Boolean(state && state.phase !== "match_complete"),
    actions: {
      goHome: () => setScreen("home" as const), openTutorial: () => setScreen("tutorial" as const),
      openSetup: () => setScreen("setup" as const), resume: () => setScreen(state?.phase === "match_complete" ? "results" : "match"),
      start, reveal, continueRound: () => decide({ type: "continue" }),
      guess: (identityId: string) => decide({ type: "guess", identityId }), mark,
      playAgain: () => { window.localStorage.removeItem(IDENTITY_MATCH_STORAGE_KEY); setState(null); setScreen("setup"); },
    },
  }), [state, screen, error, start, reveal, decide, mark]);
}
