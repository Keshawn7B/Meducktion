import { describe, expect, it } from "vitest";
import {
  thePainThatMovedCardCase,
  type InvestigationCard,
} from "../card-content";
import {
  createCardMatch,
  getPlayerMatchView,
  isDiagnosisAvailable,
  knownClueIdsForPlayer,
  transitionCardGame,
  type CardGameCommand,
  type CardGameTransitionResult,
  type CardInstance,
  type MatchPlayerSetup,
  type MatchState,
  type PrivateClue,
} from "../card-game-engine";

const content = thePainThatMovedCardCase;
const twoHumans: MatchPlayerSetup[] = [
  { id: "player.one", displayName: "One", kind: "human" },
  { id: "player.two", displayName: "Two", kind: "human" },
];
const humanAndBot: MatchPlayerSetup[] = [
  { id: "player.you", displayName: "You", kind: "human" },
  {
    id: "player.bot-balanced",
    displayName: "Dr. Beak",
    kind: "bot",
    botStyle: "balanced",
  },
];

function succeed(result: CardGameTransitionResult): MatchState {
  expect(result.errors).toEqual([]);
  return result.state;
}

function run(state: MatchState, command: CardGameCommand): MatchState {
  return succeed(transitionCardGame(content, state, command));
}

function startAndDraw(
  seed: string,
  players: MatchPlayerSetup[] = twoHumans,
): MatchState {
  let state = createCardMatch(content, { seed, players });
  state = run(state, { type: "START_MATCH" });
  return run(state, { type: "DRAW_CARDS" });
}

function forceCard(
  state: MatchState,
  playerId: string,
  cardId: string,
): CardInstance {
  const player = state.players[playerId];
  if (player === undefined) {
    throw new Error("Missing test player.");
  }
  const inHand = player.hand.cards.find((card) => card.cardId === cardId);
  if (inHand !== undefined) {
    return inHand;
  }
  const deckIndex = player.deck.drawPile.findIndex(
    (card) => card.cardId === cardId,
  );
  const card = player.deck.drawPile[deckIndex];
  const replaced = player.hand.cards[0];
  if (deckIndex < 0 || card === undefined || replaced === undefined) {
    throw new Error(`Unable to force ${cardId} into the hand.`);
  }
  player.deck.drawPile.splice(deckIndex, 1, replaced);
  player.hand.cards[0] = card;
  return card;
}

function lockAllHumans(state: MatchState): MatchState {
  for (const playerId of state.playerOrder) {
    const player = state.players[playerId];
    if (player?.kind !== "human" || player.finalDiagnosisSubmitted) {
      continue;
    }
    const card = player.hand.cards[0];
    if (card === undefined) {
      throw new Error("Expected a card in hand.");
    }
    state = run(state, {
      type: "SELECT_CARD",
      playerId,
      cardInstanceId: card.instanceId,
    });
    state = run(state, { type: "LOCK_CARD", playerId });
  }
  return state;
}

function resolveAndOpenDiagnosis(state: MatchState): MatchState {
  state = lockAllHumans(state);
  state = run(state, { type: "RESOLVE_ROUND" });
  for (const playerId of state.playerOrder) {
    if (state.players[playerId]?.kind === "human") {
      state = run(state, { type: "ACKNOWLEDGE_REVEAL", playerId });
    }
  }
  expect(state.phase).toBe("clue_review");
  return run(state, { type: "OPEN_DIAGNOSIS_WINDOW" });
}

function advanceAndDraw(state: MatchState): MatchState {
  state = run(state, { type: "CONTINUE_FROM_DIAGNOSIS" });
  if (state.phase === "match_complete") {
    return state;
  }
  state = run(state, { type: "ADVANCE_ROUND" });
  return run(state, { type: "DRAW_CARDS" });
}

function diagnosisState(round = 2): MatchState {
  const state = createCardMatch(content, {
    seed: `diagnosis-${round}`,
    players: twoHumans,
  });
  state.phase = "diagnosis_window";
  state.currentRound = round;
  const player = state.players["player.one"];
  if (player === undefined) {
    throw new Error("Missing test player.");
  }
  const clue: PrivateClue = {
    clueId: "clue.pain-migrated-lower-right",
    round,
    sourceId: "card.ask.pain-movement",
    visibility: "private",
    playerId: player.id,
  };
  player.privateClues.push(clue);
  return state;
}

const supportClues: [string, string] = [
  "clue.pain-started-central",
  "clue.pain-migrated-lower-right",
];

describe("seeded match creation and decks", () => {
  it("reproduces decks and the shared event for the same seed", () => {
    const first = createCardMatch(content, { seed: "fixed-seed" });
    const second = createCardMatch(content, { seed: "fixed-seed" });
    expect(second).toEqual(first);
  });

  it("allows different seeds to produce different valid opening hands", () => {
    const openings = new Set(
      ["one", "two", "three", "four", "five"].map((seed) => {
        const state = startAndDraw(seed);
        return state.players["player.one"]?.hand.cards
          .map((card) => card.cardId)
          .join("|");
      }),
    );
    expect(openings.size).toBeGreaterThan(1);
  });

  it("guarantees Ask, Check, and Test-or-Special in every opening hand", () => {
    const state = startAndDraw("opening-guarantee", [
      ...twoHumans,
      { id: "player.three", displayName: "Three", kind: "human" },
      { id: "player.four", displayName: "Four", kind: "human" },
    ]);
    for (const playerId of state.playerOrder) {
      const categories = state.players[playerId]?.hand.cards.map(
        (instance) =>
          content.cards.find((card) => card.id === instance.cardId)?.category,
      );
      expect(categories).toHaveLength(3);
      expect(categories).toContain("ask");
      expect(categories).toContain("check");
      expect(categories?.some((value) => value === "test" || value === "special"))
        .toBe(true);
    }
  });

  it("supports two through four players and rejects other counts", () => {
    for (const count of [2, 3, 4]) {
      const players = Array.from({ length: count }, (_, index) => ({
        id: `p${index}`,
        displayName: `P${index}`,
        kind: "human" as const,
      }));
      expect(createCardMatch(content, { seed: count, players }).playerOrder)
        .toHaveLength(count);
    }
    expect(() =>
      createCardMatch(content, {
        seed: "too-many",
        players: Array.from({ length: 5 }, (_, index) => ({
          id: `p${index}`,
          displayName: `P${index}`,
          kind: "human" as const,
        })),
      }),
    ).toThrow(/2–4/);
  });

  it("uses a one-time redraw and preserves the opening safeguards", () => {
    let state = startAndDraw("redraw");
    const before = state.players["player.one"]?.hand.cards;
    state = run(state, { type: "USE_REDRAW", playerId: "player.one" });
    const after = state.players["player.one"]?.hand.cards ?? [];
    expect(after).toHaveLength(3);
    expect(after).not.toEqual(before);
    const categories = after.map(
      (instance) =>
        content.cards.find((card) => card.id === instance.cardId)?.category,
    );
    expect(categories).toContain("ask");
    expect(categories).toContain("check");
    expect(categories.some((value) => value === "test" || value === "special"))
      .toBe(true);
    const rejected = transitionCardGame(content, state, {
      type: "USE_REDRAW",
      playerId: "player.one",
    });
    expect(rejected.errors[0]?.code).toBe("REDRAW_ALREADY_USED");
    expect(rejected.state).toBe(state);
  });

  it("favors a useful card after two unhelpful hands", () => {
    const state = startAndDraw("bad-luck");
    const player = state.players["player.one"];
    if (player === undefined) {
      throw new Error("Missing test player.");
    }
    const removed = player.hand.cards.pop();
    if (removed !== undefined) {
      player.deck.discardPile.push(removed);
    }
    player.unhelpfulHandStreak = 2;
    state.phase = "round_draw";
    const knownBefore = new Set(knownClueIdsForPlayer(state, player.id));
    const next = run(state, { type: "DRAW_CARDS" });
    const drawn = next.players[player.id]?.hand.cards.find(
      (card) => !player.hand.cards.some((old) => old.instanceId === card.instanceId),
    );
    const definition = content.cards.find((card) => card.id === drawn?.cardId);
    const useful =
      definition?.caseValue === "meaningful" &&
      (definition.result.type === "special" ||
        !knownBefore.has(definition.result.clueId));
    expect(useful).toBe(true);
  });
});

describe("round state machine", () => {
  it("keeps selection, locking, and reveal as separate phases", () => {
    let state = startAndDraw("separate-phases");
    const beforeClues = knownClueIdsForPlayer(state, "player.one");
    const card = state.players["player.one"]?.hand.cards[0];
    if (card === undefined) {
      throw new Error("Missing card.");
    }
    state = run(state, {
      type: "SELECT_CARD",
      playerId: "player.one",
      cardInstanceId: card.instanceId,
    });
    expect(state.phase).toBe("card_selection");
    expect(knownClueIdsForPlayer(state, "player.one")).toEqual(beforeClues);
    state = run(state, { type: "LOCK_CARD", playerId: "player.one" });
    expect(state.phase).toBe("card_selection");
    expect(knownClueIdsForPlayer(state, "player.one")).toEqual(beforeClues);
    const second = state.players["player.two"]?.hand.cards[0];
    if (second === undefined) {
      throw new Error("Missing card.");
    }
    state = run(state, {
      type: "SELECT_CARD",
      playerId: "player.two",
      cardInstanceId: second.instanceId,
    });
    state = run(state, { type: "LOCK_CARD", playerId: "player.two" });
    expect(state.phase).toBe("cards_locked");
    expect(state.latestPlays).toEqual([]);
    state = run(state, { type: "RESOLVE_ROUND" });
    expect(state.phase).toBe("card_reveal");
    expect(state.latestPlays).toHaveLength(2);
  });

  it("allows changing or deselecting a card before lock", () => {
    let state = startAndDraw("change-selection");
    const hand = state.players["player.one"]?.hand.cards;
    const first = hand?.[0];
    const second = hand?.[1];
    if (first === undefined || second === undefined) {
      throw new Error("Missing cards.");
    }
    state = run(state, {
      type: "SELECT_CARD",
      playerId: "player.one",
      cardInstanceId: first.instanceId,
    });
    state = run(state, {
      type: "SELECT_CARD",
      playerId: "player.one",
      cardInstanceId: second.instanceId,
    });
    expect(state.players["player.one"]?.hand.selectedCardInstanceId).toBe(
      second.instanceId,
    );
    state = run(state, { type: "DESELECT_CARD", playerId: "player.one" });
    expect(state.players["player.one"]?.hand.selectedCardInstanceId).toBeNull();
  });

  it("keeps private clues private and puts public clues on the shared board", () => {
    let state = startAndDraw("visibility");
    const privateCard = forceCard(
      state,
      "player.one",
      "card.ask.pain-movement",
    );
    const publicCard = forceCard(
      state,
      "player.two",
      "card.check.temperature",
    );
    state = run(state, {
      type: "SELECT_CARD",
      playerId: "player.one",
      cardInstanceId: privateCard.instanceId,
    });
    state = run(state, { type: "LOCK_CARD", playerId: "player.one" });
    state = run(state, {
      type: "SELECT_CARD",
      playerId: "player.two",
      cardInstanceId: publicCard.instanceId,
    });
    state = run(state, { type: "LOCK_CARD", playerId: "player.two" });
    state = run(state, { type: "RESOLVE_ROUND" });
    expect(state.players["player.one"]?.privateClues.map((clue) => clue.clueId))
      .toContain("clue.pain-migrated-lower-right");
    expect(state.players["player.two"]?.privateClues.map((clue) => clue.clueId))
      .not.toContain("clue.pain-migrated-lower-right");
    expect(state.publicClues.map((clue) => clue.clueId)).toContain(
      "clue.temperature-38",
    );
    expect(
      state.latestPlays.find((play) => play.playerId === "player.one")
        ?.publicClueIds,
    ).toEqual([]);
  });

  it("draws back to three and removes played cards from hand", () => {
    let state = startAndDraw("draw-back");
    const played = state.players["player.one"]?.hand.cards[0];
    if (played === undefined) {
      throw new Error("Missing card.");
    }
    state = resolveAndOpenDiagnosis(state);
    expect(
      state.players["player.one"]?.hand.cards.some(
        (card) => card.instanceId === played.instanceId,
      ),
    ).toBe(false);
    state = advanceAndDraw(state);
    expect(state.players["player.one"]?.hand.cards).toHaveLength(3);
  });

  it("reveals exactly one seeded shared event on its authored round", () => {
    let state = startAndDraw("event-round");
    const authoredRound = state.sharedEvent.round;
    while (state.phase !== "match_complete") {
      state = resolveAndOpenDiagnosis(state);
      if (state.phase !== "match_complete") {
        state = advanceAndDraw(state);
      }
    }
    const eventReveals = state.eventLog.filter(
      (event) => event.type === "shared_event_revealed",
    );
    expect(eventReveals).toHaveLength(1);
    expect(eventReveals[0]?.round).toBe(authoredRound);
  });

  it("advances through all four rounds into a final diagnosis window", () => {
    let state = startAndDraw("four-rounds");
    for (let round = 1; round <= 4; round += 1) {
      expect(state.currentRound).toBe(round);
      state = resolveAndOpenDiagnosis(state);
      expect(state.phase).toBe("diagnosis_window");
      state = advanceAndDraw(state);
    }
    expect(state.phase).toBe("match_complete");
    expect(state.currentRound).toBe(4);
  });

  it("replays the same command sequence to the same state", () => {
    let first = startAndDraw("replay");
    let second = startAndDraw("replay");
    for (const playerId of first.playerOrder) {
      const card = first.players[playerId]?.hand.cards[0];
      if (card === undefined) {
        throw new Error("Missing replay card.");
      }
      const select: CardGameCommand = {
        type: "SELECT_CARD",
        playerId,
        cardInstanceId: card.instanceId,
      };
      first = run(first, select);
      second = run(second, select);
      const lock: CardGameCommand = { type: "LOCK_CARD", playerId };
      first = run(first, lock);
      second = run(second, lock);
    }
    first = run(first, { type: "RESOLVE_ROUND" });
    second = run(second, { type: "RESOLVE_ROUND" });
    expect(second).toEqual(first);
  });
});

describe("diagnosis and scoring", () => {
  it("blocks diagnosis before Round 2", () => {
    const state = diagnosisState(1);
    const result = transitionCardGame(content, state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: supportClues,
    });
    expect(result.errors[0]?.code).toBe("DIAGNOSIS_LOCKED");
    expect(isDiagnosisAvailable(state, "player.one")).toBe(false);
  });

  it("requires a valid condition and two distinct known clues", () => {
    const state = diagnosisState();
    const duplicate = transitionCardGame(content, state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: [supportClues[0], supportClues[0]],
    });
    expect(duplicate.errors[0]?.code).toBe("INVALID_SUPPORTING_CLUES");
    const unknown = transitionCardGame(content, state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: [supportClues[0], "clue.not-known"],
    });
    expect(unknown.errors[0]?.code).toBe("INVALID_SUPPORTING_CLUES");
    const condition = transitionCardGame(content, state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: "diagnosis.not-in-match",
      clueIds: supportClues,
    });
    expect(condition.errors[0]?.code).toBe("UNKNOWN_CONDITION");
  });

  it("applies a wrong attempt, blocks the same round, and exhausts the second", () => {
    let state = diagnosisState();
    state = run(state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: "diagnosis.gastroenteritis",
      clueIds: supportClues,
    });
    expect(state.players["player.one"]?.diagnosisAttemptsUsed).toBe(1);
    expect(
      state.eventLog.find((event) => event.type === "diagnosis_incorrect")?.payload
        .penalty,
    ).toBe(-150);
    const blocked = transitionCardGame(content, state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: "diagnosis.urinary-tract-infection",
      clueIds: supportClues,
    });
    expect(blocked.errors[0]?.code).toBe("DIAGNOSIS_LOCKED");
    state.currentRound = 3;
    state = run(state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: "diagnosis.urinary-tract-infection",
      clueIds: supportClues,
    });
    expect(state.players["player.one"]?.diagnosisAttemptsUsed).toBe(2);
    expect(state.players["player.one"]?.finalDiagnosisSubmitted).toBe(true);
  });

  it("records a correct diagnosis and prevents resubmission", () => {
    let state = diagnosisState();
    state = run(state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: supportClues,
    });
    expect(state.players["player.one"]?.correctDiagnosisRound).toBe(2);
    const repeated = transitionCardGame(content, state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: supportClues,
    });
    expect(repeated.errors[0]?.code).toBe("DIAGNOSIS_ALREADY_CORRECT");
  });

  it("awards the complete 1,000-point Round 2 score breakdown", () => {
    let state = diagnosisState();
    const opponent = state.players["player.two"];
    if (opponent === undefined) {
      throw new Error("Missing opponent.");
    }
    opponent.finalDiagnosisSubmitted = true;
    state = run(state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: supportClues,
    });
    const score = state.players["player.one"]?.score;
    expect(score).toMatchObject({
      correctDiagnosis: 500,
      supportingClues: 200,
      timing: 150,
      efficientInvestigation: 100,
      achievement: 50,
      wrongAttemptPenalty: 0,
      total: 1_000,
    });
  });

  it("subtracts wrong-attempt penalties and clamps efficiency and total", () => {
    let state = diagnosisState();
    state = run(state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: "diagnosis.gastroenteritis",
      clueIds: supportClues,
    });
    state.currentRound = 3;
    const player = state.players["player.one"];
    const opponent = state.players["player.two"];
    const irrelevant = content.cards.find(
      (card) => card.caseValue === "irrelevant",
    );
    if (player === undefined || opponent === undefined || irrelevant === undefined) {
      throw new Error("Missing score fixture.");
    }
    player.plays = Array.from({ length: 10 }, (_, index) => ({
      playerId: player.id,
      round: 2,
      cardId: irrelevant.id,
      cardInstanceId: `irrelevant-${index}`,
      displayName: irrelevant.displayName,
      category: irrelevant.category,
      visibility: irrelevant.visibility,
      revealedNewClue: false,
      publicClueIds: [],
    }));
    opponent.finalDiagnosisSubmitted = true;
    state = run(state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: supportClues,
    });
    const score = state.players["player.one"]?.score;
    expect(score?.wrongAttemptPenalty).toBe(-150);
    expect(score?.efficientInvestigation).toBe(0);
    expect(score?.total).toBeGreaterThanOrEqual(0);
    expect(score?.total).toBeLessThanOrEqual(1_000);
  });

  it("uses shared placement when every score tie-breaker is equal", () => {
    let state = diagnosisState();
    const second = state.players["player.two"];
    if (second === undefined) {
      throw new Error("Missing second player.");
    }
    second.privateClues.push({
      clueId: "clue.pain-migrated-lower-right",
      round: 2,
      sourceId: "fixture",
      visibility: "private",
      playerId: second.id,
    });
    state = run(state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: supportClues,
    });
    state = run(state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.two",
      conditionId: content.correctConditionId,
      clueIds: supportClues,
    });
    expect(state.result?.rankings.map((entry) => entry.placement)).toEqual([1, 1]);
    expect(state.result?.winnerPlayerIds).toEqual(["player.one", "player.two"]);
  });
});

describe("balanced bot and player views", () => {
  it("selects and locks a valid card from the bot's actual hand", () => {
    let state = startAndDraw("bot-valid", humanAndBot);
    const humanCard = state.players["player.you"]?.hand.cards[0];
    const botBefore = state.players["player.bot-balanced"]?.hand.cards ?? [];
    if (humanCard === undefined) {
      throw new Error("Missing human card.");
    }
    state = run(state, {
      type: "SELECT_CARD",
      playerId: "player.you",
      cardInstanceId: humanCard.instanceId,
    });
    state = run(state, { type: "LOCK_CARD", playerId: "player.you" });
    const selected = state.players["player.bot-balanced"]?.hand
      .selectedCardInstanceId;
    expect(botBefore.some((card) => card.instanceId === selected)).toBe(true);
    expect(state.players["player.bot-balanced"]?.hand.locked).toBe(true);
    expect(state.phase).toBe("cards_locked");
  });

  it("makes deterministic bot choices without reading another player's private clues", () => {
    let first = startAndDraw("bot-private", humanAndBot);
    let second = structuredClone(first);
    first.players["player.you"]?.privateClues.push({
      clueId: "clue.ultrasound-consistent-appendicitis",
      round: 1,
      sourceId: "private-fixture",
      visibility: "private",
      playerId: "player.you",
    });
    const humanCard = first.players["player.you"]?.hand.cards[0];
    if (humanCard === undefined) {
      throw new Error("Missing human card.");
    }
    const commands: CardGameCommand[] = [
      {
        type: "SELECT_CARD",
        playerId: "player.you",
        cardInstanceId: humanCard.instanceId,
      },
      { type: "LOCK_CARD", playerId: "player.you" },
    ];
    for (const command of commands) {
      first = run(first, command);
      second = run(second, command);
    }
    expect(
      first.players["player.bot-balanced"]?.hand.selectedCardInstanceId,
    ).toBe(second.players["player.bot-balanced"]?.hand.selectedCardInstanceId);
  });

  it("waits until diagnosis is unlocked and submits only valid known clues", () => {
    const state = createCardMatch(content, { seed: "bot-diagnosis" });
    state.phase = "clue_review";
    state.currentRound = 1;
    let next = run(state, { type: "OPEN_DIAGNOSIS_WINDOW" });
    expect(next.players["player.bot-balanced"]?.diagnosisSubmissions).toEqual([]);
    next.phase = "clue_review";
    next.currentRound = 2;
    next.players["player.bot-balanced"]?.privateClues.push({
      clueId: "clue.pain-migrated-lower-right",
      round: 2,
      sourceId: "bot-fixture",
      visibility: "private",
      playerId: "player.bot-balanced",
    });
    next = run(next, { type: "OPEN_DIAGNOSIS_WINDOW" });
    const submission = next.players["player.bot-balanced"]
      ?.diagnosisSubmissions[0];
    expect(submission?.conditionId).toBe(content.correctConditionId);
    expect(submission?.clueIds).toHaveLength(2);
    expect(
      submission?.clueIds.every((clueId) =>
        knownClueIdsForPlayer(next, "player.bot-balanced").includes(clueId),
      ),
    ).toBe(true);
  });

  it("does not expose opponent private clues or in-match scores in a player view", () => {
    const state = diagnosisState();
    const other = state.players["player.two"];
    if (other === undefined) {
      throw new Error("Missing other player.");
    }
    other.privateClues.push({
      clueId: "clue.ultrasound-consistent-appendicitis",
      round: 2,
      sourceId: "secret",
      visibility: "private",
      playerId: other.id,
    });
    const view = getPlayerMatchView(content, state, "player.one");
    expect(view?.opponents[0]).not.toHaveProperty("privateClues");
    expect(view?.opponents[0]?.score).toBeNull();
    expect(JSON.stringify(view)).not.toContain("clue.ultrasound-consistent-appendicitis");
  });
});
