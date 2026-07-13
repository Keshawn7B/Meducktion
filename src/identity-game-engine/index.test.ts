import { describe, expect, it } from "vitest";
import { abdominalMysteryPack as pack } from "../identity-content";
import { candidatesForKnowledge, createIdentityMatch, transitionIdentityGame, type IdentityMatchState } from ".";

const players = [
  { id: "one", displayName: "One", kind: "human" as const },
  { id: "two", displayName: "Two", kind: "human" as const },
];
const run = (state: IdentityMatchState, command: Parameters<typeof transitionIdentityGame>[2]) => {
  const result = transitionIdentityGame(pack, state, command);
  expect(result.errors).toEqual([]);
  return result.state;
};
const revealRound = (state: IdentityMatchState) => {
  for (const id of state.playerOrder) state = run(state, { type: "REVEAL_CARD", playerId: id });
  return state;
};
const continueRound = (state: IdentityMatchState) => {
  for (const id of state.playerOrder) state = run(state, { type: "SUBMIT_CONTINUE", playerId: id });
  return state;
};

describe("identity casual engine", () => {
  it("reproduces identity assignment and decks from the seed", () => {
    const first = createIdentityMatch(pack, { seed: "same", players });
    const second = createIdentityMatch(pack, { seed: "same", players });
    expect(first.players).toEqual(second.players);
    expect(first.players.one?.hiddenIdentityId).not.toBe(first.players.two?.hiddenIdentityId);
    for (const player of Object.values(first.players)) {
      expect(player.revealDeck.slice(0, 3).every((id) => pack.cards.find((card) => card.id === id)?.informationStrength !== "strong")).toBe(true);
    }
  });

  it("automatically moves every reveal to exactly one YES or NO pile", () => {
    let state = createIdentityMatch(pack, { seed: "piles", players });
    state = run(state, { type: "REVEAL_CARD", playerId: "one" });
    const player = state.players.one!;
    expect(player.revealedCardIds).toHaveLength(1);
    expect(player.yesCardIds.length + player.noCardIds.length).toBe(1);
  });

  it("starts with three guesses and eliminates only after the third wrong guess", () => {
    let state = createIdentityMatch(pack, { seed: "attempts", players });
    for (let round = 0; round < 2; round += 1) { state = revealRound(state); state = continueRound(state); }
    for (let round = 1; round <= 3; round += 1) {
      state = revealRound(state);
      const player = state.players.one!;
      const wrong = pack.identities.find((identity) => identity.id !== player.hiddenIdentityId)!.id;
      state = run(state, { type: "SUBMIT_GUESS", playerId: "one", identityId: wrong });
      state = run(state, { type: "SUBMIT_CONTINUE", playerId: "two" });
      expect(state.players.one?.remainingGuesses).toBe(3 - round);
      expect(state.players.one?.status).toBe(round === 3 ? "eliminated" : "active");
    }
    expect(transitionIdentityGame(pack, state, { type: "REVEAL_CARD", playerId: "one" }).errors[0]?.code).toBe("PLAYER_INACTIVE");
  });

  it("locks guesses until three cards have been revealed", () => {
    let state = createIdentityMatch(pack, { seed: "locked", players });
    state = revealRound(state);
    const result = transitionIdentityGame(pack, state, { type: "SUBMIT_GUESS", playerId: "one", identityId: state.players.one!.hiddenIdentityId });
    expect(result.errors[0]?.code).toBe("GUESS_LOCKED");
  });

  it("resolves same-round guesses together and declares co-winners independent of order", () => {
    let state = createIdentityMatch(pack, { seed: "co-winners", players });
    for (let round = 0; round < 3; round += 1) { state = revealRound(state); if (round < 2) state = continueRound(state); }
    state = run(state, { type: "SUBMIT_GUESS", playerId: "two", identityId: state.players.two!.hiddenIdentityId });
    expect(state.phase).toBe("decision");
    state = run(state, { type: "SUBMIT_GUESS", playerId: "one", identityId: state.players.one!.hiddenIdentityId });
    expect(state.phase).toBe("match_complete");
    expect(new Set(state.result?.winnerPlayerIds)).toEqual(new Set(["one", "two"]));
  });

  it("returns no winner when all players are eliminated", () => {
    let state = createIdentityMatch(pack, { seed: "no-winner", players });
    for (let round = 0; round < 2; round += 1) { state = revealRound(state); state = continueRound(state); }
    for (let round = 0; round < 3; round += 1) {
      state = revealRound(state);
      for (const id of state.playerOrder) {
        const player = state.players[id]!;
        const wrong = pack.identities.find((identity) => identity.id !== player.hiddenIdentityId)!.id;
        state = run(state, { type: "SUBMIT_GUESS", playerId: id, identityId: wrong });
      }
    }
    expect(state.result).toEqual({ winnerPlayerIds: [], winningRound: null, noWinner: true });
  });

  it("derives bot candidates only from YES and NO knowledge", () => {
    const identityIds = pack.identities.map((identity) => identity.id);
    const candidates = candidatesForKnowledge(pack, { identityIds, yesCardIds: ["card.blood-urine"], noCardIds: ["card.infection-urine"], remainingGuesses: 3, round: 4 });
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.every((id) => pack.identities.find((identity) => identity.id === id)?.cardResults["card.blood-urine"])).toBe(true);
  });
});
