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
    if (player?.kind !== "human" || player.correctDiagnosisRound !== null) {
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
  if (state.currentRound >= state.maximumRounds) {
    return state;
  }
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
    clueId: supportClues[1],
    round,
    sourceId: "fixture.answer",
    visibility: "private",
    playerId: player.id,
  };
  player.privateClues.push(clue);
  return state;
}

const supportingClueIds = content.clues
  .filter((clue) => clue.supportsConditionIds.includes(content.correctConditionId))
  .map((clue) => clue.id);
const supportClues: [string, string] = [supportingClueIds[0]!, supportingClueIds[1]!];

function completeExactTie(
  seed: string,
  submissionOrder: [string, string],
  players: MatchPlayerSetup[] = twoHumans,
): MatchState {
  let state = createCardMatch(content, {
    seed,
    matchId: `match.${seed}`,
    players,
  });
  state.phase = "diagnosis_window";
  state.currentRound = 2;
  for (const playerId of state.playerOrder) {
    const player = state.players[playerId];
    if (player === undefined) continue;
    player.privateClues.push({
      clueId: supportClues[1],
      round: 2,
      sourceId: "fixture",
      visibility: "private",
      playerId,
    });
  }
  for (const playerId of submissionOrder.slice(0, 1)) {
    state = run(state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId,
      conditionId: content.correctConditionId,
      clueIds: supportClues,
    });
  }
  return state;
}

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

  it("puts generic question answers only in each player's private pile", () => {
    let state = startAndDraw("visibility");
    const questionCard = forceCard(
      state,
      "player.one",
      "card.the-pain-that-moved.belly-pain",
    );
    const secondQuestion = forceCard(
      state,
      "player.two",
      "card.the-pain-that-moved.fever",
    );
    state = run(state, {
      type: "SELECT_CARD",
      playerId: "player.one",
      cardInstanceId: questionCard.instanceId,
    });
    state = run(state, { type: "LOCK_CARD", playerId: "player.one" });
    state = run(state, {
      type: "SELECT_CARD",
      playerId: "player.two",
      cardInstanceId: secondQuestion.instanceId,
    });
    state = run(state, { type: "LOCK_CARD", playerId: "player.two" });
    state = run(state, { type: "RESOLVE_ROUND" });
    expect(state.players["player.one"]?.privateClues.map((clue) => clue.clueId))
      .toContain("clue.the-pain-that-moved.belly-pain");
    expect(state.players["player.two"]?.privateClues.map((clue) => clue.clueId))
      .not.toContain("clue.the-pain-that-moved.belly-pain");
    expect(state.players["player.two"]?.privateClues.map((clue) => clue.clueId))
      .toContain("clue.the-pain-that-moved.fever");
    expect(state.publicClues).toEqual([]);
    expect(
      state.latestPlays.find((play) => play.playerId === "player.one")
        ?.publicClueIds,
    ).toEqual([]);
  });

  it("allows a player to unlock while another player is still choosing", () => {
    let state = startAndDraw("unlock-before-reveal");
    const card = state.players["player.one"]?.hand.cards[0];
    if (card === undefined) throw new Error("Missing card.");
    state = run(state, { type: "SELECT_CARD", playerId: "player.one", cardInstanceId: card.instanceId });
    state = run(state, { type: "LOCK_CARD", playerId: "player.one" });
    expect(state.players["player.one"]?.hand.locked).toBe(true);
    expect(state.phase).toBe("card_selection");
    state = run(state, { type: "UNLOCK_CARD", playerId: "player.one" });
    expect(state.players["player.one"]?.hand.locked).toBe(false);
    expect(state.players["player.one"]?.hand.selectedCardInstanceId).toBe(card.instanceId);
  });

  it("gives simultaneous players separate private copies of the same answer", () => {
    let state = startAndDraw("simultaneous-public-credit");
    for (const playerId of state.playerOrder) {
      const card = forceCard(state, playerId, "card.the-pain-that-moved.cough");
      state = run(state, {
        type: "SELECT_CARD",
        playerId,
        cardInstanceId: card.instanceId,
      });
      state = run(state, { type: "LOCK_CARD", playerId });
    }

    state = run(state, { type: "RESOLVE_ROUND" });

    expect(state.publicClues).toHaveLength(0);
    for (const playerId of state.playerOrder) {
      expect(state.players[playerId]?.privateClues.map((clue) => clue.clueId)).toContain("clue.the-pain-that-moved.cough");
    }
    expect(
      state.playerOrder.map((playerId) =>
        state.players[playerId]?.plays[0]?.revealedNewClue,
      ),
    ).toEqual([true, true]);
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
    for (let round = 1; round <= state.maximumRounds; round += 1) {
      state = resolveAndOpenDiagnosis(state);
      if (round < state.maximumRounds) {
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
    expect(state.phase).toBe("diagnosis_window");
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

describe("diagnosis race", () => {
  it("allows diagnosis in Round 1", () => {
    const state = diagnosisState(1);
    const result = transitionCardGame(content, state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: supportClues,
    });
    expect(result.errors).toEqual([]);
    expect(result.state.phase).toBe("match_complete");
    expect(isDiagnosisAvailable(state, "player.one")).toBe(true);
  });

  it("removes the newest private answer after a wrong Round 1 guess", () => {
    const state = diagnosisState(1);
    const before = state.players["player.one"]?.privateClues.length;
    const result = transitionCardGame(content, state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.conditions[1]!.id,
      clueIds: [],
    });
    expect(result.errors).toEqual([]);
    expect(result.state.players["player.one"]?.privateClues).toHaveLength((before ?? 0) - 1);
    expect(result.state.players["player.one"]?.diagnosisLockedUntilRound).toBe(2);
  });

  it("requires a valid condition but does not require clue selection", () => {
    const state = diagnosisState();
    const duplicate = transitionCardGame(content, state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: [supportClues[0], supportClues[0]],
    });
    expect(duplicate.errors).toEqual([]);
    const unknown = transitionCardGame(content, state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.one",
      conditionId: content.correctConditionId,
      clueIds: [supportClues[0], "clue.not-known"],
    });
    expect(unknown.errors).toEqual([]);
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
        .removedClueId,
    ).toBe(supportClues[1]);
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
    state.phase = "card_selection";
    const exhaustedPlayer = state.players["player.one"];
    if (exhaustedPlayer === undefined) {
      throw new Error("Missing exhausted player.");
    }
    const card = exhaustedPlayer?.deck.drawPile.shift();
    if (card === undefined) {
      throw new Error("Missing exhausted player's card.");
    }
    exhaustedPlayer.hand.cards.push(card);
    state = run(state, {
      type: "SELECT_CARD",
      playerId: "player.one",
      cardInstanceId: card.instanceId,
    });
    expect(state.players["player.one"]?.hand.selectedCardInstanceId).toBe(
      card.instanceId,
    );
  });

  it("requires an available final diagnosis before the match can finish", () => {
    const state = diagnosisState(4);
    const result = transitionCardGame(content, state, {
      type: "CONTINUE_FROM_DIAGNOSIS",
    });

    expect(result.errors[0]?.code).toBe("DIAGNOSIS_REQUIRED");
    expect(result.state.phase).toBe("diagnosis_window");
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
    expect(repeated.errors[0]?.code).toBe("INVALID_PHASE");
  });

  it("finishes immediately without point scoring", () => {
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
      correctDiagnosis: 0,
      supportingClues: 0,
      timing: 0,
      efficientInvestigation: 0,
      achievement: 0,
      wrongAttemptPenalty: 0,
      total: 0,
    });
    expect(state.result?.winnerPlayerIds).toEqual(["player.one"]);
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
    expect(score?.wrongAttemptPenalty).toBe(0);
    expect(score?.efficientInvestigation).toBe(0);
    expect(score?.total).toBeGreaterThanOrEqual(0);
    expect(score?.total).toBeLessThanOrEqual(1_000);
  });

  it("uses a deterministic seeded draw instead of sharing first place", () => {
    const first = completeExactTie("ranking-draw", ["player.one", "player.two"]);
    const replay = completeExactTie("ranking-draw", ["player.one", "player.two"]);

    expect(first.result).toEqual(replay.result);
    expect(first.result?.rankings.map((entry) => entry.placement)).toEqual([1, 2]);
    expect(first.result?.winnerPlayerIds).toHaveLength(1);
    expect(first.result?.winningTieBreak).toBe("correct_diagnosis");
  });

  it("awards the win to the first correct submission", () => {
    const forward = completeExactTie("order-neutral", ["player.one", "player.two"]);
    const reversed = completeExactTie(
      "order-neutral",
      ["player.two", "player.one"],
      [...twoHumans].reverse(),
    );

    expect(forward.result?.winnerPlayerIds).toEqual(["player.one"]);
    expect(reversed.result?.winnerPlayerIds).toEqual(["player.two"]);
  });

  it("does not let the seed change who submitted correctly first", () => {
    const winners = new Set(
      Array.from({ length: 24 }, (_, index) =>
        completeExactTie(`fair-draw-${index}`, ["player.one", "player.two"])
          .result?.winnerPlayerIds[0],
      ),
    );

    expect(winners).toEqual(new Set(["player.one"]));
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

  it("waits to diagnose while its private answers remain ambiguous", () => {
    const state = createCardMatch(content, { seed: "bot-diagnosis" });
    state.phase = "clue_review";
    state.currentRound = 1;
    let next = run(state, { type: "OPEN_DIAGNOSIS_WINDOW" });
    expect(next.players["player.bot-balanced"]?.diagnosisSubmissions).toEqual([]);
    next.phase = "clue_review";
    next.currentRound = 2;
    next.players["player.bot-balanced"]?.privateClues.push({
      clueId: supportClues[1],
      round: 2,
      sourceId: "bot-fixture",
      visibility: "private",
      playerId: "player.bot-balanced",
    });
    next = run(next, { type: "OPEN_DIAGNOSIS_WINDOW" });
    expect(next.players["player.bot-balanced"]?.diagnosisSubmissions).toEqual([]);
    next = run(next, { type: "CONTINUE_FROM_DIAGNOSIS" });
    expect(next.players["player.bot-balanced"]?.diagnosisSubmissions).toEqual([]);
  });

  it("lets the human decide before the bot without awarding first-player priority", () => {
    let state = createCardMatch(content, {
      seed: "human-first-diagnosis",
      players: humanAndBot,
    });
    state.phase = "clue_review";
    state.currentRound = 2;
    for (const playerId of state.playerOrder) {
      const player = state.players[playerId];
      if (player === undefined) continue;
      player.privateClues.push({
        clueId: supportClues[1],
        round: 2,
        sourceId: "fixture",
        visibility: "private",
        playerId,
      });
    }

    state = run(state, { type: "OPEN_DIAGNOSIS_WINDOW" });
    expect(state.players["player.bot-balanced"]?.diagnosisSubmissions).toEqual([]);
    state = run(state, {
      type: "SUBMIT_DIAGNOSIS",
      playerId: "player.you",
      conditionId: content.correctConditionId,
      clueIds: supportClues,
    });

    expect(state.players["player.you"]?.score?.total).toBe(0);
    expect(state.players["player.bot-balanced"]?.score?.total).toBe(0);
    expect(state.result?.rankings.map((entry) => entry.placement)).toEqual([1, 2]);
    expect(state.result?.winnerPlayerIds).toHaveLength(1);
    const correctEvents = state.eventLog.filter(
      (event) => event.type === "diagnosis_correct",
    );
    expect(correctEvents[0]?.relatedIds).toContain("player.you");
    expect(correctEvents).toHaveLength(1);
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
