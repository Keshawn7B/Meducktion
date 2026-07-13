import type { IdentityCasePack } from "../identity-content";
import { createSeededRandomState, seededShuffle } from "../card-game-engine/random";
import type {
  BotKnowledge,
  CreateIdentityMatchOptions,
  IdentityGameCommand,
  IdentityMatchState,
  IdentityPlayerSetup,
  IdentityPlayerState,
  IdentityTransitionResult,
} from "./types";

export type * from "./types";

const defaultPlayers: IdentityPlayerSetup[] = [
  { id: "player.you", displayName: "You", kind: "human" },
  { id: "player.bot", displayName: "Dr. Beak", kind: "bot" },
];

function constrainedDeck(pack: IdentityCasePack, identityId: string, seed: string): string[] {
  const identity = pack.identities.find((item) => item.id === identityId);
  if (!identity) return [];
  let rng = createSeededRandomState(seed);
  const early = seededShuffle(pack.cards.filter((card) => card.informationStrength !== "strong"), rng);
  rng = early.state;
  const strong = seededShuffle(pack.cards.filter((card) => card.informationStrength === "strong"), rng);
  const earlyPool = [...early.values];
  const strongPool = [...strong.values];
  const deck: string[] = [];
  let desired = Boolean(Math.floor(early.state.state % 2));
  const take = (pool: typeof earlyPool) => {
    let index = pool.findIndex((card) => identity.cardResults[card.id] === desired);
    if (index < 0) index = 0;
    const [card] = pool.splice(index, 1);
    if (card) deck.push(card.id);
    desired = !desired;
  };
  while (deck.length < 3 && earlyPool.length > 0) take(earlyPool);
  while (earlyPool.length > 0 || strongPool.length > 0) {
    const useStrong = strongPool.length > 0 && (deck.length === 3 || deck.length === 5 || earlyPool.length === 0);
    take(useStrong ? strongPool : earlyPool);
  }
  return deck;
}

export function createIdentityMatch(pack: IdentityCasePack, options: CreateIdentityMatchOptions): IdentityMatchState {
  const players = options.players ?? defaultPlayers;
  if (players.length < 2 || players.length > 4) throw new Error("Identity matches require 2-4 players.");
  const seed = String(options.seed);
  let rng = createSeededRandomState(seed);
  const shuffled = seededShuffle(pack.identities.map((identity) => identity.id), rng);
  rng = shuffled.state;
  const statePlayers: Record<string, IdentityPlayerState> = {};
  players.forEach((player, index) => {
    const hiddenIdentityId = options.allowDuplicateIdentities
      ? shuffled.values[index % shuffled.values.length]!
      : shuffled.values[index]!;
    statePlayers[player.id] = {
      ...player,
      hiddenIdentityId,
      revealDeck: constrainedDeck(pack, hiddenIdentityId, `${seed}:${player.id}:deck`),
      revealedCardIds: [], yesCardIds: [], noCardIds: [], remainingGuesses: 3,
      status: "active", correctRound: null, guesses: [], pendingDecision: null, markings: {},
    };
  });
  return {
    schemaVersion: "identity-match-v1", mode: "identity-casual",
    matchId: options.matchId ?? `identity-${seed}`, packId: pack.id,
    contentVersion: pack.contentVersion, seed, rng, phase: "reveal", round: 1,
    playerOrder: players.map((player) => player.id), players: statePlayers,
    revealedThisRoundPlayerIds: [], assistMode: options.assistMode ?? "light",
    allowDuplicateIdentities: options.allowDuplicateIdentities ?? false,
    result: null, revision: 0,
  };
}

function activePlayers(state: IdentityMatchState): IdentityPlayerState[] {
  return state.playerOrder.map((id) => state.players[id]).filter((player): player is IdentityPlayerState => player?.status === "active");
}

function resolveDecisions(state: IdentityMatchState): void {
  const active = activePlayers(state);
  if (!active.every((player) => player.pendingDecision !== null)) return;
  const correctThisRound: string[] = [];
  for (const player of active) {
    const decision = player.pendingDecision;
    if (decision?.type === "guess") {
      const correct = decision.identityId === player.hiddenIdentityId;
      player.guesses.push({ identityId: decision.identityId, round: state.round, correct });
      if (correct) {
        player.status = "correct";
        player.correctRound = state.round;
        correctThisRound.push(player.id);
      } else {
        player.remainingGuesses -= 1;
        if (player.remainingGuesses === 0) player.status = "eliminated";
      }
    }
    player.pendingDecision = null;
  }
  if (correctThisRound.length > 0) {
    state.result = { winnerPlayerIds: correctThisRound, winningRound: state.round, noWinner: false };
    state.phase = "match_complete";
    return;
  }
  if (activePlayers(state).length === 0) {
    state.result = { winnerPlayerIds: [], winningRound: null, noWinner: true };
    state.phase = "match_complete";
    return;
  }
  state.round += 1;
  state.revealedThisRoundPlayerIds = [];
  state.phase = "reveal";
}

export function transitionIdentityGame(pack: IdentityCasePack, source: IdentityMatchState, command: IdentityGameCommand): IdentityTransitionResult {
  const state = structuredClone(source);
  const fail = (code: IdentityTransitionResult["errors"][number]["code"], message: string): IdentityTransitionResult => ({ state: source, errors: [{ code, message }] });
  const player = state.players[command.playerId];
  if (!player) return fail("UNKNOWN_PLAYER", "That player is not in this match.");
  if (command.type === "MARK_IDENTITY") {
    if (!pack.identities.some((identity) => identity.id === command.identityId)) return fail("UNKNOWN_IDENTITY", "That identity is not in this pack.");
    if (command.marking === null) delete player.markings[command.identityId];
    else player.markings[command.identityId] = command.marking;
    state.revision += 1;
    return { state, errors: [] };
  }
  if (player.status !== "active") return fail("PLAYER_INACTIVE", "This player is no longer active.");
  if (command.type === "REVEAL_CARD") {
    if (state.phase !== "reveal") return fail("INVALID_PHASE", "Cards can only be revealed at the start of a round.");
    if (state.revealedThisRoundPlayerIds.includes(player.id)) return fail("ALREADY_REVEALED", "This player already revealed this round.");
    const cardId = player.revealDeck.shift();
    if (!cardId) return fail("DECK_EMPTY", "No reveal cards remain.");
    const identity = pack.identities.find((item) => item.id === player.hiddenIdentityId)!;
    player.revealedCardIds.push(cardId);
    (identity.cardResults[cardId] ? player.yesCardIds : player.noCardIds).push(cardId);
    state.revealedThisRoundPlayerIds.push(player.id);
    if (activePlayers(state).every((candidate) => state.revealedThisRoundPlayerIds.includes(candidate.id))) state.phase = "decision";
  } else {
    if (state.phase !== "decision") return fail("INVALID_PHASE", "Decisions are only accepted after every active player reveals.");
    if (player.pendingDecision) return fail("DECISION_ALREADY_SUBMITTED", "A decision was already submitted this round.");
    if (command.type === "SUBMIT_GUESS") {
      if (player.revealedCardIds.length < pack.minimumRevealsBeforeGuess) return fail("GUESS_LOCKED", `Reveal ${pack.minimumRevealsBeforeGuess} cards before guessing.`);
      if (!pack.identities.some((identity) => identity.id === command.identityId)) return fail("UNKNOWN_IDENTITY", "That identity is not in this pack.");
      player.pendingDecision = { type: "guess", identityId: command.identityId };
    } else player.pendingDecision = { type: "continue" };
    resolveDecisions(state);
  }
  state.revision += 1;
  return { state, errors: [] };
}

export function candidatesForKnowledge(pack: IdentityCasePack, knowledge: BotKnowledge): string[] {
  return knowledge.identityIds.filter((identityId) => {
    const identity = pack.identities.find((item) => item.id === identityId)!;
    return knowledge.yesCardIds.every((id) => identity.cardResults[id]) && knowledge.noCardIds.every((id) => !identity.cardResults[id]);
  });
}

export function chooseBalancedBotDecision(pack: IdentityCasePack, knowledge: BotKnowledge): { type: "continue" } | { type: "guess"; identityId: string } {
  const candidates = candidatesForKnowledge(pack, knowledge);
  if (candidates.length === 1 || (candidates.length <= 2 && knowledge.round >= 5) || (knowledge.remainingGuesses === 1 && candidates.length <= 3)) {
    return { type: "guess", identityId: candidates[0]! };
  }
  return { type: "continue" };
}
