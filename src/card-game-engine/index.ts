import type {
  CardCaseContent,
  CardCategory,
  CardClueDefinition,
  InvestigationCard,
  SharedEventDefinition,
  SpecialCardEffect,
} from "../card-content/types";
import {
  createSeededRandomState,
  nextSeededRandom,
  seededChoice,
  seededShuffle,
} from "./random";
import type {
  CardGameCommand,
  CardGameError,
  CardGameErrorCode,
  CardGameTransitionResult,
  CardInstance,
  CardPlay,
  CreateCardMatchOptions,
  DiagnosisSubmission,
  MatchEvent,
  MatchPlayerSetup,
  MatchResult,
  MatchState,
  PlayerMatchView,
  PlayerScore,
  PlayerState,
  PrivateClue,
  PublicClue,
} from "./types";

export type * from "./types";
export {
  createSeededRandomState,
  nextSeededRandom,
  seededChoice,
  seededShuffle,
} from "./random";

const DEFAULT_PLAYERS: MatchPlayerSetup[] = [
  { id: "player.you", displayName: "You", kind: "human" },
  {
    id: "player.bot-balanced",
    displayName: "Dr. Duck",
    kind: "bot",
    botStyle: "balanced",
  },
];

// The bot usually trusts its strongest evidence, but it is deliberately fallible.
// Keeping this below 1 prevents an evidence leader from becoming a guaranteed win.
const BOT_EVIDENCE_CONFIDENCE = 0.72;

function cardById(
  content: CardCaseContent,
  cardId: string,
): InvestigationCard | undefined {
  return content.cards.find((card) => card.id === cardId);
}

function clueById(
  content: CardCaseContent,
  clueId: string,
): CardClueDefinition | undefined {
  return content.clues.find((clue) => clue.id === clueId);
}

export function getCompatibleCards(
  content: CardCaseContent,
  variantId: string,
): InvestigationCard[] {
  return content.cards.filter(
    (card) =>
      card.compatibility.caseIds.includes(content.caseId) &&
      (card.compatibility.variantIds === undefined ||
        card.compatibility.variantIds.includes(variantId)),
  );
}

export function getDiagnosisConditionOptions(
  content: CardCaseContent,
  match: Pick<MatchState, "matchId" | "seed">,
): CardCaseContent["conditions"] {
  const orderSeed = [
    "diagnosis-condition-order",
    content.caseId,
    match.seed,
    match.matchId,
  ].join(":");
  return seededShuffle(
    content.conditions,
    createSeededRandomState(orderSeed),
  ).values;
}

function assertContent(content: CardCaseContent): void {
  if (content.conditions.length !== 8) {
    throw new Error("A card match requires exactly eight conditions.");
  }
  if (
    !content.conditions.some(
      (condition) => condition.id === content.correctConditionId,
    )
  ) {
    throw new Error("The correct condition is missing from the case.");
  }
  const clueIds = new Set(content.clues.map((clue) => clue.id));
  for (const clue of content.clues) {
    if (clue.question.trim().length === 0) {
      throw new Error(`Clue ${clue.id} must include a YES or NO question.`);
    }
    if (clue.answer !== "yes" && clue.answer !== "no") {
      throw new Error(`Clue ${clue.id} must have a YES or NO answer.`);
    }
  }
  for (const variant of content.variants) {
    if (!clueIds.has(variant.startingClueId)) {
      throw new Error(`Variant ${variant.id} references an unknown starting clue.`);
    }
  }
  for (const card of content.cards) {
    if (card.copies < 1 || !Number.isInteger(card.copies)) {
      throw new Error(`Card ${card.id} must have a positive integer copy count.`);
    }
    if (card.duplicatePolicy === "unique_per_deck" && card.copies !== 1) {
      throw new Error(`Unique card ${card.id} must have exactly one copy.`);
    }
    if (
      card.result.type === "reveal_clue" &&
      !clueIds.has(card.result.clueId)
    ) {
      throw new Error(`Card ${card.id} references an unknown clue.`);
    }
    if (
      card.result.type === "special" &&
      (card.result.effect.type === "second_opinion" ||
        card.result.effect.type === "share_clue") &&
      !clueIds.has(card.result.effect.clueId)
    ) {
      throw new Error(`Special card ${card.id} references an unknown clue.`);
    }
  }
  for (const event of content.sharedEvents) {
    if (
      event.effect.type === "reveal_public_clue" &&
      !clueIds.has(event.effect.clueId)
    ) {
      throw new Error(`Shared event ${event.id} references an unknown clue.`);
    }
  }
}

function makeDeck(
  content: CardCaseContent,
  variantId: string,
  playerId: string,
  source: MatchState["rng"],
): { cards: CardInstance[]; rng: MatchState["rng"] } {
  const startingClueId = content.variants.find(
    (variant) => variant.id === variantId,
  )?.startingClueId;
  const instances = getCompatibleCards(content, variantId)
    .filter((card) =>
      card.result.type !== "reveal_clue" || card.result.clueId !== startingClueId,
    )
    .flatMap((card) =>
      Array.from({ length: card.copies }, (_, copyIndex) => ({
        instanceId: `${playerId}:${card.id}:${copyIndex + 1}`,
        cardId: card.id,
      })),
    );
  const shuffled = seededShuffle(instances, source);
  const remaining = [...shuffled.values];
  const opening: CardInstance[] = [];
  const take = (predicate: (card: InvestigationCard) => boolean): void => {
    const index = remaining.findIndex((instance) => {
      const card = cardById(content, instance.cardId);
      return card !== undefined && predicate(card);
    });
    if (index >= 0) {
      const [instance] = remaining.splice(index, 1);
      if (instance !== undefined) {
        opening.push(instance);
      }
    }
  };
  take((card) => card.category === "ask");
  take((card) => card.category === "check");
  take((card) => card.category === "test" || card.category === "special");
  if (opening.length !== 3) {
    throw new Error("The compatible card pool cannot satisfy the opening hand guarantee.");
  }
  const openingShuffle = seededShuffle(opening, shuffled.state);
  return {
    cards: [...openingShuffle.values, ...remaining],
    rng: openingShuffle.state,
  };
}

function makePlayer(
  setup: MatchPlayerSetup,
  cards: CardInstance[],
): PlayerState {
  return {
    id: setup.id,
    displayName: setup.displayName,
    kind: setup.kind,
    botStyle: setup.kind === "bot" ? (setup.botStyle ?? "balanced") : null,
    hand: { cards: [], selectedCardInstanceId: null, locked: false },
    deck: { drawPile: cards, discardPile: [] },
    privateClues: [],
    plays: [],
    redrawAvailable: true,
    diagnosisAttemptsUsed: 0,
    diagnosisLockedUntilRound: null,
    diagnosisSubmissions: [],
    hiddenClueAnswers: [],
    pendingCluePenaltyChoice: false,
    correctDiagnosisRound: null,
    finalDiagnosisSubmitted: false,
    unhelpfulHandStreak: 0,
    score: null,
  };
}

export function createCardMatch(
  content: CardCaseContent,
  options: CreateCardMatchOptions,
): MatchState {
  assertContent(content);
  const players = options.players ?? DEFAULT_PLAYERS;
  if (players.length < 2 || players.length > 4) {
    throw new RangeError("Meducktion card matches require 2–4 players.");
  }
  if (new Set(players.map((player) => player.id)).size !== players.length) {
    throw new Error("Player IDs must be unique.");
  }

  let rng = createSeededRandomState(options.seed);
  const requestedVariant = options.variantId;
  let variant = content.variants.find(
    (candidate) => candidate.id === requestedVariant,
  );
  if (requestedVariant === undefined) {
    const selected = seededChoice(content.variants, rng);
    if (selected === null) {
      throw new Error("No case variant exists.");
    }
    variant = selected.value;
    rng = selected.state;
  }
  if (variant === undefined) {
    throw new Error("No compatible case variant exists.");
  }

  const selectedEvent = seededChoice(content.sharedEvents, rng);
  if (selectedEvent === null) {
    throw new Error("At least one shared event is required.");
  }
  rng = selectedEvent.state;
  const eventRoundChoice = seededChoice([2, 3] as const, rng);
  if (eventRoundChoice === null) {
    throw new Error("A shared-event round could not be selected.");
  }
  rng = eventRoundChoice.state;

  const playerStates: Record<string, PlayerState> = {};
  for (const player of players) {
    const deck = makeDeck(content, variant.id, player.id, rng);
    rng = deck.rng;
    playerStates[player.id] = makePlayer(player, deck.cards);
  }

  for (const player of Object.values(playerStates)) {
    player.privateClues.push({
      clueId: variant.startingClueId,
      round: 0,
      sourceId: variant.id,
      visibility: "private",
      playerId: player.id,
    });
  }
  const seed = String(options.seed);
  const matchId = options.matchId ?? `match.${content.caseId}.${rng.state.toString(16)}`;
  const state: MatchState = {
    matchId,
    caseId: content.caseId,
    variantId: variant.id,
    schemaVersion: "card-match-v1",
    caseSchemaVersion: content.schemaVersion,
    contentVersion: content.contentVersion,
    seed,
    rng,
    phase: "match_intro",
    currentRound: 0,
    maximumRounds: options.maximumRounds === undefined ? 10 : options.maximumRounds,
    currentTurnPlayerId: null,
    playerOrder: players.map((player) => player.id),
    players: playerStates,
    publicClues: [],
    sharedEvent: {
      eventId: selectedEvent.value.id,
      round: eventRoundChoice.value,
      revealed: false,
    },
    acknowledgedRevealPlayerIds: [],
    diagnosisPassedPlayerIds: [],
    latestPlays: [],
    result: null,
    eventLog: [],
    revision: 0,
  };
  state.eventLog = [
    {
      sequence: 1,
      type: "match_created",
      round: 0,
      relatedIds: [content.caseId, variant.id],
      payload: { seed, playerCount: players.length },
    },
  ];
  return state;
}

function fail(
  state: MatchState,
  code: CardGameErrorCode,
  message: string,
  relatedId?: string,
): CardGameTransitionResult {
  const error: CardGameError = {
    code,
    message,
    ...(relatedId === undefined ? {} : { relatedId }),
  };
  return { state, events: [], errors: [error] };
}

function emit(
  state: MatchState,
  events: MatchEvent[],
  type: MatchEvent["type"],
  relatedIds: string[] = [],
  payload: MatchEvent["payload"] = {},
): void {
  events.push({
    sequence: state.eventLog.length + events.length + 1,
    type,
    round: state.currentRound,
    relatedIds,
    payload,
  });
}

function complete(
  original: MatchState,
  state: MatchState,
  events: MatchEvent[],
): CardGameTransitionResult {
  state.revision = original.revision + 1;
  state.eventLog = [...original.eventLog, ...events];
  return { state, events, errors: [] };
}

function playerKnownClueIds(state: MatchState, player: PlayerState): Set<string> {
  return new Set([
    ...state.publicClues.map((clue) => clue.clueId),
    ...player.privateClues.map((clue) => clue.clueId),
  ]);
}

function isUsefulCard(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
  instance: CardInstance,
): boolean {
  const card = cardById(content, instance.cardId);
  if (card === undefined || card.caseValue !== "meaningful") {
    return false;
  }
  if (card.result.type === "special") {
    const effect = card.result.effect;
    if (effect.type !== "second_opinion" && effect.type !== "share_clue") {
      return false;
    }
    const clue = clueById(content, effect.clueId);
    return (
      clue?.meaningful === true &&
      !playerKnownClueIds(state, player).has(effect.clueId)
    );
  }
  return !playerKnownClueIds(state, player).has(card.result.clueId);
}

function reshuffleDiscardIfNeeded(state: MatchState, player: PlayerState): void {
  if (player.deck.drawPile.length > 0 || player.deck.discardPile.length === 0) {
    return;
  }
  const shuffled = seededShuffle(player.deck.discardPile, state.rng);
  state.rng = shuffled.state;
  player.deck.drawPile = shuffled.values;
  player.deck.discardPile = [];
}

function drawMatching(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
  predicate?: (instance: CardInstance) => boolean,
): CardInstance | null {
  reshuffleDiscardIfNeeded(state, player);
  if (player.deck.drawPile.length === 0) {
    return null;
  }
  const matchingIndex = predicate
    ? player.deck.drawPile.findIndex(predicate)
    : 0;
  const index = matchingIndex >= 0 ? matchingIndex : 0;
  const [card] = player.deck.drawPile.splice(index, 1);
  if (card === undefined) {
    return null;
  }
  if (cardById(content, card.cardId) === undefined) {
    return null;
  }
  return card;
}

function drawToThree(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
): void {
  let protectedDraw = player.unhelpfulHandStreak >= 2;
  while (player.hand.cards.length < 3) {
    const card = drawMatching(
      content,
      state,
      player,
      protectedDraw
        ? (candidate) => isUsefulCard(content, state, player, candidate)
        : undefined,
    );
    if (card === null) {
      break;
    }
    player.hand.cards.push(card);
    protectedDraw = false;
  }
  const useful = player.hand.cards.some((card) =>
    isUsefulCard(content, state, player, card),
  );
  player.unhelpfulHandStreak = useful ? 0 : player.unhelpfulHandStreak + 1;
}

function drawGuaranteedHand(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
): void {
  const selected: CardInstance[] = [];
  const takeCategory = (categories: readonly CardCategory[]): void => {
    const card = drawMatching(content, state, player, (instance) => {
      const definition = cardById(content, instance.cardId);
      return definition !== undefined && categories.includes(definition.category);
    });
    if (card !== null) {
      selected.push(card);
    }
  };
  takeCategory(["ask"]);
  takeCategory(["check"]);
  takeCategory(["test", "special"]);
  while (selected.length < 3) {
    const card = drawMatching(content, state, player);
    if (card === null) {
      break;
    }
    selected.push(card);
  }
  const shuffled = seededShuffle(selected, state.rng);
  state.rng = shuffled.state;
  player.hand.cards = shuffled.values;
  player.unhelpfulHandStreak = player.hand.cards.some((card) =>
    isUsefulCard(content, state, player, card),
  )
    ? 0
    : player.unhelpfulHandStreak + 1;
}

function activePlayers(state: MatchState): PlayerState[] {
  return state.playerOrder
    .map((playerId) => state.players[playerId])
    .filter(
      (player): player is PlayerState =>
        player !== undefined && !player.finalDiagnosisSubmitted,
    );
}

function chooseSeededFromBest<T>(
  state: MatchState,
  candidates: readonly T[],
): T | null {
  const choice = seededChoice(candidates, state.rng);
  if (choice === null) {
    return null;
  }
  state.rng = choice.state;
  return choice.value;
}

function botCardValue(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
  instance: CardInstance,
): number {
  const card = cardById(content, instance.cardId);
  if (card === undefined) {
    return -1;
  }
  const categoryValue: Record<CardCategory, number> = {
    ask: 20,
    check: 30,
    test: 40,
    special: 10,
  };
  const usefulBonus = isUsefulCard(content, state, player, instance) ? 100 : 0;
  const irrelevantPenalty = card.caseValue === "irrelevant" ? 40 : 0;
  return usefulBonus + categoryValue[card.category] - irrelevantPenalty;
}

function selectAndLockBot(
  content: CardCaseContent,
  state: MatchState,
  events: MatchEvent[],
  player: PlayerState,
): void {
  const values = player.hand.cards.map((instance) => ({
    instance,
    value: botCardValue(content, state, player, instance),
  }));
  const bestValue = Math.max(...values.map((candidate) => candidate.value));
  const bestCards = values
    .filter((candidate) => candidate.value === bestValue)
    .map((candidate) => candidate.instance);
  const selected = chooseSeededFromBest(state, bestCards);
  if (selected !== null) {
    player.hand.selectedCardInstanceId = selected.instanceId;
    player.hand.locked = true;
    emit(state, events, "card_selected", [player.id], { bot: true });
    emit(state, events, "card_locked", [player.id], { bot: true });
  }
}

function activePlayersInTurnOrder(state: MatchState): PlayerState[] {
  const offset = state.playerOrder.length === 0
    ? 0
    : Math.max(0, state.currentRound - 1) % state.playerOrder.length;
  const rotated = [
    ...state.playerOrder.slice(offset),
    ...state.playerOrder.slice(0, offset),
  ];
  return rotated
    .map((playerId) => state.players[playerId])
    .filter(
      (player): player is PlayerState =>
        player !== undefined && !player.finalDiagnosisSubmitted,
    );
}

function advanceSelectionTurn(
  content: CardCaseContent,
  state: MatchState,
  events: MatchEvent[],
): void {
  while (true) {
    const next = activePlayersInTurnOrder(state).find((player) => !player.hand.locked);
    if (!next) {
      state.currentTurnPlayerId = null;
      state.phase = "cards_locked";
      emit(state, events, "all_cards_locked");
      return;
    }
    state.currentTurnPlayerId = next.id;
    if (next.kind !== "bot") return;
    selectAndLockBot(content, state, events, next);
    if (!next.hand.locked) return;
  }
}

function revealClue(
  content: CardCaseContent,
  state: MatchState,
  events: MatchEvent[],
  player: PlayerState,
  clueId: string,
  visibility: "private" | "public",
  sourceId: string,
): boolean {
  if (clueById(content, clueId) === undefined) {
    return false;
  }
  if (state.publicClues.some((clue) => clue.clueId === clueId)) {
    return false;
  }
  if (visibility === "public") {
    const clue: PublicClue = {
      clueId,
      round: state.currentRound,
      sourceId,
      visibility: "public",
    };
    state.publicClues.push(clue);
    emit(state, events, "public_clue_revealed", [clueId, sourceId]);
    return true;
  }
  if (player.privateClues.some((clue) => clue.clueId === clueId)) {
    return false;
  }
  const clue: PrivateClue = {
    clueId,
    round: state.currentRound,
    sourceId,
    visibility: "private",
    playerId: player.id,
  };
  player.privateClues.push(clue);
  emit(state, events, "private_clue_revealed", [player.id, sourceId], {
    clueCount: 1,
  });
  return true;
}

function cardUsefulnessScore(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
  instance: CardInstance,
): number {
  return botCardValue(content, state, player, instance);
}

function keepOneOfTwo(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
): void {
  const drawn = [
    drawMatching(content, state, player),
    drawMatching(content, state, player),
  ].filter((card): card is CardInstance => card !== null);
  if (drawn.length === 0) {
    return;
  }
  const scores = drawn.map((instance) => ({
    instance,
    score: cardUsefulnessScore(content, state, player, instance),
  }));
  const bestScore = Math.max(...scores.map((candidate) => candidate.score));
  const best = chooseSeededFromBest(
    state,
    scores
      .filter((candidate) => candidate.score === bestScore)
      .map((candidate) => candidate.instance),
  );
  if (best === null) {
    return;
  }
  player.hand.cards.push(best);
  player.deck.discardPile.push(
    ...drawn.filter((instance) => instance.instanceId !== best.instanceId),
  );
}

function swapWorstCard(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
): void {
  if (player.hand.cards.length === 0) {
    return;
  }
  const scored = player.hand.cards.map((instance) => ({
    instance,
    score: cardUsefulnessScore(content, state, player, instance),
  }));
  const worstScore = Math.min(...scored.map((candidate) => candidate.score));
  const worst = chooseSeededFromBest(
    state,
    scored
      .filter((candidate) => candidate.score === worstScore)
      .map((candidate) => candidate.instance),
  );
  if (worst === null) {
    return;
  }
  player.hand.cards = player.hand.cards.filter(
    (instance) => instance.instanceId !== worst.instanceId,
  );
  player.deck.discardPile.push(worst);
  const replacement = drawMatching(content, state, player);
  if (replacement !== null) {
    player.hand.cards.push(replacement);
  }
}

function trimHandToThree(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
): void {
  while (player.hand.cards.length > 3) {
    const scored = player.hand.cards.map((instance) => ({
      instance,
      score: cardUsefulnessScore(content, state, player, instance),
    }));
    const worstScore = Math.min(...scored.map((candidate) => candidate.score));
    const discarded = chooseSeededFromBest(
      state,
      scored
        .filter((candidate) => candidate.score === worstScore)
        .map((candidate) => candidate.instance),
    );
    if (discarded === null) {
      return;
    }
    player.hand.cards = player.hand.cards.filter(
      (instance) => instance.instanceId !== discarded.instanceId,
    );
    player.deck.discardPile.push(discarded);
  }
}

function resolveSpecial(
  content: CardCaseContent,
  state: MatchState,
  events: MatchEvent[],
  player: PlayerState,
  effect: SpecialCardEffect,
  sourceId: string,
): { newClue: boolean; publicClueIds: string[] } {
  if (effect.type === "draw_two_keep_one") {
    keepOneOfTwo(content, state, player);
    return { newClue: false, publicClueIds: [] };
  }
  if (effect.type === "swap_one_card") {
    swapWorstCard(content, state, player);
    return { newClue: false, publicClueIds: [] };
  }
  if (effect.type === "repeat_check") {
    const priorCheck = [...player.plays]
      .reverse()
      .find((play) => play.category === "check");
    const card = priorCheck ? cardById(content, priorCheck.cardId) : undefined;
    if (card?.result.type !== "reveal_clue") {
      return { newClue: false, publicClueIds: [] };
    }
    const newClue = revealClue(
      content,
      state,
      events,
      player,
      card.result.clueId,
      card.visibility,
      sourceId,
    );
    return {
      newClue,
      publicClueIds:
        newClue && card.visibility === "public" ? [card.result.clueId] : [],
    };
  }
  const visibility = effect.type === "share_clue" ? "public" : "private";
  const newClue = revealClue(
    content,
    state,
    events,
    player,
    effect.clueId,
    visibility,
    sourceId,
  );
  return {
    newClue,
    publicClueIds: newClue && visibility === "public" ? [effect.clueId] : [],
  };
}

function resolveCard(
  content: CardCaseContent,
  state: MatchState,
  events: MatchEvent[],
  player: PlayerState,
  instance: CardInstance,
  sameRoundPublicCredits: ReadonlySet<string> = new Set(),
): CardPlay | null {
  const card = cardById(content, instance.cardId);
  if (card === undefined) {
    return null;
  }
  let revealedNewClue = false;
  let publicClueIds: string[] = [];
  if (card.result.type === "reveal_clue") {
    const addedClue = revealClue(
      content,
      state,
      events,
      player,
      card.result.clueId,
      card.visibility,
      card.id,
    );
    revealedNewClue =
      addedClue ||
      sameRoundPublicCredits.has(`${player.id}:${card.result.clueId}`);
    if (revealedNewClue && card.visibility === "public") {
      publicClueIds = [card.result.clueId];
    }
  } else {
    const special = resolveSpecial(
      content,
      state,
      events,
      player,
      card.result.effect,
      card.id,
    );
    revealedNewClue = special.newClue;
    publicClueIds = special.publicClueIds;
  }
  const play: CardPlay = {
    playerId: player.id,
    round: state.currentRound,
    cardId: card.id,
    cardInstanceId: instance.instanceId,
    displayName: card.displayName,
    category: card.category,
    visibility: card.visibility,
    revealedNewClue,
    publicClueIds,
  };
  player.plays.push(play);
  emit(state, events, "card_revealed", [player.id, card.id], {
    category: card.category,
    title: card.displayName,
  });
  return play;
}

function sharedEventById(
  content: CardCaseContent,
  eventId: string,
): SharedEventDefinition | undefined {
  return content.sharedEvents.find((event) => event.id === eventId);
}

function resolveSharedEvent(
  content: CardCaseContent,
  state: MatchState,
  events: MatchEvent[],
): void {
  if (
    state.sharedEvent.revealed ||
    state.sharedEvent.round !== state.currentRound
  ) {
    return;
  }
  const event = sharedEventById(content, state.sharedEvent.eventId);
  if (event === undefined) {
    return;
  }
  state.sharedEvent.revealed = true;
  emit(state, events, "shared_event_revealed", [event.id], {
    title: event.displayName,
  });
  for (const playerId of state.playerOrder) {
    const player = state.players[playerId];
    if (player === undefined) {
      continue;
    }
    if (event.effect.type === "draw_category") {
      const category = event.effect.category;
      const card = drawMatching(content, state, player, (instance) => {
        const definition = cardById(content, instance.cardId);
        return definition?.category === category;
      });
      if (card !== null) {
        player.hand.cards.push(card);
      }
    } else if (event.effect.type === "replace_one") {
      swapWorstCard(content, state, player);
    } else if (event.effect.type === "draw_two_keep_one") {
      keepOneOfTwo(content, state, player);
    } else {
      revealClue(
        content,
        state,
        events,
        player,
        event.effect.clueId,
        "public",
        event.id,
      );
    }
    trimHandToThree(content, state, player);
  }
}

function validateDiagnosis(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
  conditionId: string,
  clueIds: readonly string[],
): CardGameError | null {
  if (
    player.diagnosisLockedUntilRound !== null &&
    state.currentRound < player.diagnosisLockedUntilRound
  ) {
    return {
      code: "DIAGNOSIS_LOCKED",
      message: "A wrong diagnosis blocks another attempt until the next round.",
    };
  }
  if (player.correctDiagnosisRound !== null) {
    return {
      code: "DIAGNOSIS_ALREADY_CORRECT",
      message: "A correct diagnosis has already been submitted.",
    };
  }
  if (player.pendingCluePenaltyChoice) {
    return {
      code: "CLUE_PILE_CHOICE_REQUIRED",
      message: "Choose whether to hide your YES or NO clues first.",
    };
  }
  if (player.diagnosisAttemptsUsed >= 3) {
    return {
      code: "DIAGNOSIS_ATTEMPTS_EXHAUSTED",
      message: "No diagnosis attempts remain.",
    };
  }
  if (!content.conditions.some((condition) => condition.id === conditionId)) {
    return {
      code: "UNKNOWN_CONDITION",
      message: "Choose one of the eight conditions in this match.",
      relatedId: conditionId,
    };
  }
  return null;
}

function isFinalRound(state: MatchState): boolean {
  return state.maximumRounds !== null && state.currentRound >= state.maximumRounds;
}

function currentTurnPlayer(state: MatchState): PlayerState | undefined {
  const explicit = state.currentTurnPlayerId === null
    ? undefined
    : state.players[state.currentTurnPlayerId];
  if (explicit && !explicit.finalDiagnosisSubmitted && !explicit.hand.locked) {
    return explicit;
  }
  return activePlayersInTurnOrder(state).find((player) => !player.hand.locked);
}

function requirePlayerTurn(state: MatchState, player: PlayerState): CardGameError | null {
  const current = currentTurnPlayer(state);
  return current?.id === player.id
    ? null
    : {
        code: "INVALID_COMMAND",
        message: current
          ? `Wait for ${current.displayName} to finish their turn.`
          : "There is no active card turn.",
        relatedId: player.id,
      };
}

function hideCluePile(
  state: MatchState,
  events: MatchEvent[],
  player: PlayerState,
  answer: "yes" | "no",
): void {
  player.hiddenClueAnswers = Array.from(
    new Set([...(player.hiddenClueAnswers ?? []), answer]),
  );
  player.pendingCluePenaltyChoice = false;
  emit(state, events, "clue_pile_hidden", [player.id], { answer });
}

function resolveBotCluePenalty(
  state: MatchState,
  events: MatchEvent[],
  player: PlayerState,
): void {
  if (!player.pendingCluePenaltyChoice) return;
  const answer = chooseSeededFromBest(state, ["yes", "no"] as const);
  if (answer !== null) hideCluePile(state, events, player, answer);
}

function submitDiagnosis(
  content: CardCaseContent,
  state: MatchState,
  events: MatchEvent[],
  player: PlayerState,
  conditionId: string,
  clueIds: readonly string[],
): CardGameError | null {
  const validation = validateDiagnosis(
    content,
    state,
    player,
    conditionId,
    clueIds,
  );
  if (validation !== null) {
    return validation;
  }
  const correct = conditionId === content.correctConditionId;
  const submission: DiagnosisSubmission = {
    conditionId,
    clueIds: [...clueIds],
    round: state.currentRound,
    correct,
  };
  player.diagnosisAttemptsUsed += 1;
  player.diagnosisSubmissions.push(submission);
  emit(state, events, "diagnosis_submitted", [player.id], {
    attempt: player.diagnosisAttemptsUsed,
  });
  if (correct) {
    player.correctDiagnosisRound = state.currentRound;
    player.finalDiagnosisSubmitted = true;
    player.diagnosisLockedUntilRound = null;
    emit(state, events, "diagnosis_correct", [player.id]);
  } else {
    player.diagnosisLockedUntilRound = state.currentRound + 1;
    if (player.diagnosisAttemptsUsed === 1) {
      player.pendingCluePenaltyChoice = true;
    } else if (player.diagnosisAttemptsUsed === 2) {
      hideCluePile(state, events, player, "yes");
      hideCluePile(state, events, player, "no");
    } else {
      player.finalDiagnosisSubmitted = true;
      emit(state, events, "player_eliminated", [player.id]);
    }
    emit(state, events, "diagnosis_incorrect", [player.id], {
      attempt: player.diagnosisAttemptsUsed,
    });
  }
  return null;
}

function botDiagnosisCandidate(
  content: CardCaseContent,
  state: MatchState,
  player: PlayerState,
): { conditionId: string; clueIds: [string, string] } | null {
  if (
    state.currentRound < 2 ||
    player.finalDiagnosisSubmitted ||
    (player.diagnosisLockedUntilRound !== null &&
      state.currentRound < player.diagnosisLockedUntilRound)
  ) {
    return null;
  }
  const known = [...playerKnownClueIds(state, player)];
  const scored = content.conditions.map((condition) => {
    const clues = known.filter((clueId) =>
      clueById(content, clueId)?.supportsConditionIds.includes(condition.id),
    );
    return { conditionId: condition.id, clues, score: clues.length };
  });
  const bestScore = Math.max(...scored.map((candidate) => candidate.score));
  if (bestScore < 2) {
    return null;
  }
  const leaders = scored.filter((candidate) => candidate.score === bestScore);
  if (leaders.length > 1 && !isFinalRound(state)) {
    return null;
  }
  const evidenceLeader = chooseSeededFromBest(state, leaders);
  if (evidenceLeader === null) {
    return null;
  }

  const confidenceRoll = nextSeededRandom(state.rng);
  state.rng = confidenceRoll.state;
  let guess = evidenceLeader;
  if (confidenceRoll.value >= BOT_EVIDENCE_CONFIDENCE) {
    const alternatives = scored.filter(
      (candidate) => candidate.conditionId !== evidenceLeader.conditionId,
    );
    const secondGuess = chooseSeededFromBest(state, alternatives);
    if (secondGuess !== null) {
      guess = secondGuess;
    }
  }

  const first = evidenceLeader.clues[0];
  const second = evidenceLeader.clues[1];
  return first === undefined || second === undefined
    ? null
    : { conditionId: guess.conditionId, clueIds: [first, second] };
}

function autoDiagnoseBots(
  content: CardCaseContent,
  state: MatchState,
  events: MatchEvent[],
): void {
  for (const playerId of state.playerOrder) {
    const player = state.players[playerId];
    if (player?.kind !== "bot") {
      continue;
    }
    const candidate = botDiagnosisCandidate(content, state, player);
    if (candidate !== null) {
      submitDiagnosis(
        content,
        state,
        events,
        player,
        candidate.conditionId,
        candidate.clueIds,
      );
      resolveBotCluePenalty(state, events, player);
      if (player.correctDiagnosisRound !== null) return;
    }
  }
}

function finishMatch(
  content: CardCaseContent,
  state: MatchState,
  events: MatchEvent[],
  winnerPlayerId: string | null = null,
): void {
  const emptyScore = (playerId: string): PlayerScore => ({
    playerId,
    correctDiagnosis: 0,
    supportingClues: 0,
    timing: 0,
    efficientInvestigation: 0,
    achievement: 0,
    achievementId: null,
    wrongAttemptPenalty: 0,
    total: 0,
  });
  for (const playerId of state.playerOrder) {
    const player = state.players[playerId];
    if (player !== undefined) {
      player.score = emptyScore(playerId);
    }
  }
  const rankedPlayerIds = winnerPlayerId === null
    ? [...state.playerOrder]
    : [winnerPlayerId, ...state.playerOrder.filter((id) => id !== winnerPlayerId)];
  const rankings: MatchResult["rankings"] = rankedPlayerIds.map((playerId, index) => ({
    playerId,
    placement: index + 1,
    score: state.players[playerId]?.score ?? emptyScore(playerId),
  }));
  state.result = {
    rankings,
    winnerPlayerIds: winnerPlayerId === null ? [] : [winnerPlayerId],
    correctConditionId: content.correctConditionId,
    winningTieBreak: winnerPlayerId === null ? "only_player" : "correct_diagnosis",
  };
  state.phase = "match_complete";
  emit(state, events, "match_completed", state.result.winnerPlayerIds, {
    playerCount: state.playerOrder.length,
  });
}

function firstCorrectPlayerId(state: MatchState): string | null {
  return state.playerOrder.find(
    (playerId) => state.players[playerId]?.correctDiagnosisRound !== null,
  ) ?? null;
}

function allPlayersEliminated(state: MatchState): boolean {
  return state.playerOrder.length > 0 && state.playerOrder.every((playerId) => {
    const player = state.players[playerId];
    return player !== undefined &&
      player.correctDiagnosisRound === null &&
      player.diagnosisAttemptsUsed >= 3 &&
      player.finalDiagnosisSubmitted;
  });
}

export function transitionCardGame(
  content: CardCaseContent,
  original: MatchState,
  command: CardGameCommand,
): CardGameTransitionResult {
  if (
    original.caseId !== content.caseId ||
    original.contentVersion !== content.contentVersion
  ) {
    return fail(
      original,
      "UNKNOWN_CONTENT",
      "The pinned card-case content does not match this state.",
    );
  }
  if (original.phase === "match_complete") {
    return fail(original, "INVALID_PHASE", "The match is already complete.");
  }
  const state = structuredClone(original);
  const events: MatchEvent[] = [];

  const commandPlayer = "playerId" in command
    ? state.players[command.playerId]
    : undefined;
  if (
    commandPlayer?.pendingCluePenaltyChoice === true &&
    command.type !== "CHOOSE_CLUE_PILE_PENALTY" &&
    command.type !== "CONVERT_TO_BOT"
  ) {
    return fail(
      original,
      "CLUE_PILE_CHOICE_REQUIRED",
      "Choose whether to hide your YES or NO clues first.",
      commandPlayer.id,
    );
  }
  if (
    !("playerId" in command) &&
    Object.values(state.players).some((player) => player.pendingCluePenaltyChoice)
  ) {
    return fail(
      original,
      "CLUE_PILE_CHOICE_REQUIRED",
      "A player must choose which clue pile to hide first.",
    );
  }

  if (command.type === "START_MATCH") {
    if (state.phase !== "match_intro") {
      return fail(original, "INVALID_PHASE", "The match has already started.");
    }
    state.currentRound = 1;
    state.phase = "round_draw";
    emit(state, events, "match_started");
    emit(state, events, "round_started", [], { round: 1 });
    return complete(original, state, events);
  }

  if (command.type === "DRAW_CARDS") {
    if (state.phase !== "round_draw") {
      return fail(original, "INVALID_PHASE", "Cards can only be drawn now.");
    }
    for (const player of activePlayers(state)) {
      drawToThree(content, state, player);
      player.hand.selectedCardInstanceId = null;
      player.hand.locked = false;
    }
    state.acknowledgedRevealPlayerIds = [];
    state.phase = "card_selection";
    state.currentTurnPlayerId = null;
    emit(state, events, "cards_dealt", [], { handSize: 3 });
    advanceSelectionTurn(content, state, events);
    return complete(original, state, events);
  }

  if (command.type === "SELECT_CARD") {
    if (state.phase !== "card_selection") {
      return fail(original, "INVALID_PHASE", "Cards cannot be selected now.");
    }
    const player = state.players[command.playerId];
    if (player === undefined) {
      return fail(original, "UNKNOWN_PLAYER", "Unknown player.", command.playerId);
    }
    if (player.correctDiagnosisRound !== null) {
      return fail(original, "INVALID_COMMAND", "This player has finished diagnosing.");
    }
    const turnError = requirePlayerTurn(state, player);
    if (turnError !== null) return { state: original, events: [], errors: [turnError] };
    if (player.hand.locked) {
      return fail(original, "CARD_ALREADY_LOCKED", "The card is already locked.");
    }
    if (
      !player.hand.cards.some(
        (card) => card.instanceId === command.cardInstanceId,
      )
    ) {
      return fail(
        original,
        "CARD_NOT_IN_HAND",
        "Choose a card from this player's hand.",
        command.cardInstanceId,
      );
    }
    player.hand.selectedCardInstanceId = command.cardInstanceId;
    emit(state, events, "card_selected", [player.id], { bot: false });
    return complete(original, state, events);
  }

  if (command.type === "DESELECT_CARD") {
    if (state.phase !== "card_selection") {
      return fail(original, "INVALID_PHASE", "Cards cannot be deselected now.");
    }
    const player = state.players[command.playerId];
    if (player === undefined) {
      return fail(original, "UNKNOWN_PLAYER", "Unknown player.", command.playerId);
    }
    const turnError = requirePlayerTurn(state, player);
    if (turnError !== null) return { state: original, events: [], errors: [turnError] };
    if (player.hand.locked) {
      return fail(original, "CARD_ALREADY_LOCKED", "The card is already locked.");
    }
    if (player.hand.selectedCardInstanceId === null) {
      return fail(original, "CARD_NOT_SELECTED", "No card is selected.");
    }
    player.hand.selectedCardInstanceId = null;
    emit(state, events, "card_deselected", [player.id]);
    return complete(original, state, events);
  }

  if (command.type === "USE_REDRAW") {
    if (state.phase !== "card_selection") {
      return fail(original, "INVALID_PHASE", "The hand cannot be redrawn now.");
    }
    const player = state.players[command.playerId];
    if (player === undefined) {
      return fail(original, "UNKNOWN_PLAYER", "Unknown player.", command.playerId);
    }
    const turnError = requirePlayerTurn(state, player);
    if (turnError !== null) return { state: original, events: [], errors: [turnError] };
    if (player.hand.locked) {
      return fail(original, "CARD_ALREADY_LOCKED", "The card is already locked.");
    }
    if (!player.redrawAvailable) {
      return fail(original, "REDRAW_ALREADY_USED", "The free redraw was already used.");
    }
    player.deck.discardPile.push(...player.hand.cards);
    player.hand.cards = [];
    player.hand.selectedCardInstanceId = null;
    player.redrawAvailable = false;
    drawGuaranteedHand(content, state, player);
    emit(state, events, "hand_redrawn", [player.id]);
    return complete(original, state, events);
  }

  if (command.type === "LOCK_CARD") {
    if (state.phase !== "card_selection") {
      return fail(original, "INVALID_PHASE", "Cards cannot be locked now.");
    }
    const player = state.players[command.playerId];
    if (player === undefined) {
      return fail(original, "UNKNOWN_PLAYER", "Unknown player.", command.playerId);
    }
    const turnError = requirePlayerTurn(state, player);
    if (turnError !== null) return { state: original, events: [], errors: [turnError] };
    if (player.hand.locked) {
      return fail(original, "CARD_ALREADY_LOCKED", "The card is already locked.");
    }
    if (player.hand.selectedCardInstanceId === null) {
      return fail(original, "CARD_NOT_SELECTED", "Select a card before revealing it.");
    }
    player.hand.locked = true;
    emit(state, events, "card_locked", [player.id], { bot: false });
    advanceSelectionTurn(content, state, events);
    return complete(original, state, events);
  }

  if (command.type === "UNLOCK_CARD") {
    if (state.phase !== "card_selection" && state.phase !== "cards_locked") {
      return fail(original, "INVALID_PHASE", "Cards can only be unlocked before the reveal.");
    }
    const player = state.players[command.playerId];
    if (player === undefined) {
      return fail(original, "UNKNOWN_PLAYER", "Unknown player.", command.playerId);
    }
    if (!player.hand.locked) {
      return fail(original, "INVALID_COMMAND", "This card is not locked.");
    }
    const current = currentTurnPlayer(state);
    const turnOrder = activePlayersInTurnOrder(state);
    const currentIndex = current
      ? turnOrder.findIndex((candidate) => candidate.id === current.id)
      : turnOrder.length;
    const previous = turnOrder[currentIndex - 1];
    if (previous?.id !== player.id) {
      return fail(original, "INVALID_COMMAND", "Only the most recent player may take back a locked card.");
    }
    if (current?.hand.selectedCardInstanceId) {
      return fail(original, "INVALID_COMMAND", "The next player has already started their turn.");
    }
    player.hand.locked = false;
    state.currentTurnPlayerId = player.id;
    state.phase = "card_selection";
    emit(state, events, "card_unlocked", [player.id]);
    return complete(original, state, events);
  }

  if (command.type === "RESOLVE_ROUND") {
    if (state.phase !== "cards_locked") {
      return fail(original, "CARDS_NOT_LOCKED", "All active players must lock first.");
    }
    const plays: CardPlay[] = [];
    const publicBeforeRound = new Set(
      state.publicClues.map((clue) => clue.clueId),
    );
    const sameRoundPublicCredits = new Set<string>();
    for (const player of activePlayers(state)) {
      const selected = player.hand.cards.find(
        (card) => card.instanceId === player.hand.selectedCardInstanceId,
      );
      const definition = selected
        ? cardById(content, selected.cardId)
        : undefined;
      if (
        definition?.visibility === "public" &&
        definition.result.type === "reveal_clue" &&
        !publicBeforeRound.has(definition.result.clueId)
      ) {
        sameRoundPublicCredits.add(`${player.id}:${definition.result.clueId}`);
      }
    }
    for (const player of activePlayers(state)) {
      const selectedId = player.hand.selectedCardInstanceId;
      const instance = player.hand.cards.find(
        (card) => card.instanceId === selectedId,
      );
      if (instance === undefined) {
        return fail(original, "CARD_NOT_SELECTED", "A locked card is missing.");
      }
      player.hand.cards = player.hand.cards.filter(
        (card) => card.instanceId !== instance.instanceId,
      );
      player.deck.discardPile.push(instance);
      const play = resolveCard(
        content,
        state,
        events,
        player,
        instance,
        sameRoundPublicCredits,
      );
      if (play !== null) {
        plays.push(play);
      }
      player.hand.selectedCardInstanceId = null;
      player.hand.locked = false;
    }
    state.latestPlays = plays;
    resolveSharedEvent(content, state, events);
    state.acknowledgedRevealPlayerIds = state.playerOrder.filter(
      (playerId) =>
        state.players[playerId]?.kind === "bot" ||
        state.players[playerId]?.finalDiagnosisSubmitted === true,
    );
    state.phase = "card_reveal";
    state.currentTurnPlayerId = null;
    return complete(original, state, events);
  }

  if (command.type === "ACKNOWLEDGE_REVEAL") {
    if (state.phase !== "card_reveal") {
      return fail(original, "INVALID_PHASE", "There is no reveal to acknowledge.");
    }
    if (state.players[command.playerId] === undefined) {
      return fail(original, "UNKNOWN_PLAYER", "Unknown player.", command.playerId);
    }
    if (state.acknowledgedRevealPlayerIds.includes(command.playerId)) {
      return fail(original, "INVALID_COMMAND", "This reveal is already acknowledged.");
    }
    state.acknowledgedRevealPlayerIds.push(command.playerId);
    emit(state, events, "reveal_acknowledged", [command.playerId]);
    if (
      state.playerOrder.every((playerId) =>
        state.acknowledgedRevealPlayerIds.includes(playerId),
      )
    ) {
      state.phase = "clue_review";
    }
    return complete(original, state, events);
  }

  if (command.type === "OPEN_DIAGNOSIS_WINDOW") {
    if (state.phase !== "clue_review") {
      return fail(original, "INVALID_PHASE", "Review the revealed clues first.");
    }
    state.phase = "diagnosis_window";
    state.diagnosisPassedPlayerIds = [];
    emit(state, events, "diagnosis_window_opened", [], {
      unlocked: true,
    });
    return complete(original, state, events);
  }

  if (command.type === "CHOOSE_CLUE_PILE_PENALTY") {
    const player = state.players[command.playerId];
    if (player === undefined) {
      return fail(original, "UNKNOWN_PLAYER", "Unknown player.", command.playerId);
    }
    if (!player.pendingCluePenaltyChoice) {
      return fail(original, "INVALID_COMMAND", "There is no clue-pile penalty to choose.");
    }
    hideCluePile(state, events, player, command.answer);
    return complete(original, state, events);
  }

  if (command.type === "CONVERT_TO_BOT") {
    const player = state.players[command.playerId];
    if (player === undefined) {
      return fail(original, "UNKNOWN_PLAYER", "Unknown player.", command.playerId);
    }
    if (player.kind === "bot") {
      return fail(original, "INVALID_COMMAND", "This player is already automated.");
    }
    player.kind = "bot";
    player.botStyle = "balanced";
    emit(state, events, "player_replaced_by_bot", [command.playerId]);
    resolveBotCluePenalty(state, events, player);

    if (state.phase === "card_selection" && player.correctDiagnosisRound === null) {
      advanceSelectionTurn(content, state, events);
    } else if (state.phase === "card_reveal") {
      if (!state.acknowledgedRevealPlayerIds.includes(command.playerId)) {
        state.acknowledgedRevealPlayerIds.push(command.playerId);
        emit(state, events, "reveal_acknowledged", [command.playerId], { bot: true });
      }
      if (state.playerOrder.every((playerId) => state.acknowledgedRevealPlayerIds.includes(playerId))) {
        state.phase = "clue_review";
      }
    } else if (state.phase === "diagnosis_window") {
      autoDiagnoseBots(content, state, events);
      const winnerPlayerId = firstCorrectPlayerId(state);
      if (winnerPlayerId !== null) {
        finishMatch(content, state, events, winnerPlayerId);
        return complete(original, state, events);
      }
      const decided =
        player.finalDiagnosisSubmitted ||
        player.diagnosisSubmissions.some((submission) => submission.round === state.currentRound);
      if (!decided && !(state.diagnosisPassedPlayerIds ?? []).includes(command.playerId)) {
        state.diagnosisPassedPlayerIds = [...(state.diagnosisPassedPlayerIds ?? []), command.playerId];
        emit(state, events, "diagnosis_passed", [command.playerId], { bot: true });
      }
    }
    return complete(original, state, events);
  }

  if (command.type === "PASS_DIAGNOSIS") {
    if (state.phase !== "diagnosis_window") {
      return fail(original, "INVALID_PHASE", "Diagnosis is not open now.");
    }
    const player = state.players[command.playerId];
    if (player === undefined) {
      return fail(original, "UNKNOWN_PLAYER", "Unknown player.", command.playerId);
    }
    const passed = state.diagnosisPassedPlayerIds ?? [];
    if (
      passed.includes(command.playerId) ||
      player.diagnosisSubmissions.some((submission) => submission.round === state.currentRound)
    ) {
      return fail(original, "INVALID_COMMAND", "This player already made a round decision.");
    }
    state.diagnosisPassedPlayerIds = [...passed, command.playerId];
    emit(state, events, "diagnosis_passed", [command.playerId]);
    return complete(original, state, events);
  }

  if (command.type === "SUBMIT_DIAGNOSIS") {
    if (state.phase !== "diagnosis_window" && state.phase !== "card_selection") {
      return fail(original, "INVALID_PHASE", "Diagnosis is only available while choosing cards or after the final reveal.");
    }
    const player = state.players[command.playerId];
    if (player === undefined) {
      return fail(original, "UNKNOWN_PLAYER", "Unknown player.", command.playerId);
    }
    const error = submitDiagnosis(
      content,
      state,
      events,
      player,
      command.conditionId,
      command.clueIds,
    );
    if (error !== null) {
      return { state: original, events: [], errors: [error] };
    }
    if (player.correctDiagnosisRound !== null) {
      finishMatch(content, state, events, player.id);
      return complete(original, state, events);
    }
    if (state.phase === "card_selection" && player.finalDiagnosisSubmitted) {
      advanceSelectionTurn(content, state, events);
    }
    if (player.kind === "human") {
      autoDiagnoseBots(content, state, events);
    }
    const winnerPlayerId = firstCorrectPlayerId(state);
    if (winnerPlayerId !== null) {
      finishMatch(content, state, events, winnerPlayerId);
      return complete(original, state, events);
    }
    const remainingPlayers = activePlayers(state);
    if (remainingPlayers.length === 1 && state.playerOrder.length > 1) {
      finishMatch(content, state, events, remainingPlayers[0]!.id);
      if (state.result) state.result.winningTieBreak = "only_player";
      return complete(original, state, events);
    }
    if (allPlayersEliminated(state)) {
      finishMatch(content, state, events);
    }
    return complete(original, state, events);
  }

  if (command.type === "CONTINUE_FROM_DIAGNOSIS") {
    if (state.phase !== "diagnosis_window") {
      return fail(original, "INVALID_PHASE", "The diagnosis window is not open.");
    }
    autoDiagnoseBots(content, state, events);
    const winnerPlayerId = firstCorrectPlayerId(state);
    if (winnerPlayerId !== null) {
      finishMatch(content, state, events, winnerPlayerId);
      return complete(original, state, events);
    }
    const remainingPlayers = activePlayers(state);
    if (remainingPlayers.length === 1 && state.playerOrder.length > 1) {
      finishMatch(content, state, events, remainingPlayers[0]!.id);
      if (state.result) state.result.winningTieBreak = "only_player";
      return complete(original, state, events);
    }
    if (
      isFinalRound(state) ||
      allPlayersEliminated(state)
    ) {
      finishMatch(content, state, events);
    } else {
      state.phase = "next_round";
      emit(state, events, "next_round_ready", [], {
        nextRound: state.currentRound + 1,
      });
    }
    return complete(original, state, events);
  }

  if (command.type === "ADVANCE_ROUND") {
    if (state.phase !== "next_round") {
      return fail(original, "INVALID_PHASE", "The next round is not ready.");
    }
    state.currentRound += 1;
    state.phase = "round_draw";
    emit(state, events, "round_started", [], { round: state.currentRound });
    return complete(original, state, events);
  }

  if (command.type === "COMPLETE_MATCH") {
    if (
      state.phase !== "diagnosis_window" ||
      (!isFinalRound(state) &&
        !allPlayersEliminated(state))
    ) {
      return fail(original, "INVALID_PHASE", "The match cannot be completed yet.");
    }
    finishMatch(content, state, events);
    return complete(original, state, events);
  }

  return fail(original, "INVALID_COMMAND", "Unknown card-game command.");
}

export function knownClueIdsForPlayer(
  state: MatchState,
  playerId: string,
): string[] {
  const player = state.players[playerId];
  return player === undefined ? [] : [...playerKnownClueIds(state, player)];
}

export function isDiagnosisAvailable(
  state: MatchState,
  playerId: string,
): boolean {
  const player = state.players[playerId];
  return (
    (state.phase === "diagnosis_window" || state.phase === "card_selection") &&
    player !== undefined &&
    !player.finalDiagnosisSubmitted &&
    player.diagnosisAttemptsUsed < 3 &&
    (player.diagnosisLockedUntilRound === null ||
      state.currentRound >= player.diagnosisLockedUntilRound)
  );
}

export function getPlayerMatchView(
  content: CardCaseContent,
  state: MatchState,
  playerId: string,
): PlayerMatchView | null {
  const player = state.players[playerId];
  if (player === undefined) {
    return null;
  }
  const playerCopy = structuredClone(player);
  const opponents = state.playerOrder
    .filter((id) => id !== playerId)
    .map((id) => state.players[id])
    .filter((opponent): opponent is PlayerState => opponent !== undefined)
    .map((opponent) => ({
      id: opponent.id,
      displayName: opponent.displayName,
      kind: opponent.kind,
      locked: opponent.hand.locked,
      handSize: opponent.hand.cards.length,
      playedCategory:
        state.latestPlays.find((play) => play.playerId === opponent.id)?.category ??
        null,
      diagnosisSubmitted: opponent.diagnosisSubmissions.length > 0,
      score: state.phase === "match_complete" ? (opponent.score?.total ?? null) : null,
    }));
  return {
    matchId: state.matchId,
    phase: state.phase,
    currentRound: state.currentRound,
    maximumRounds: state.maximumRounds,
    currentTurnPlayerId: currentTurnPlayer(state)?.id ?? null,
    publicClues: structuredClone(state.publicClues),
    sharedEvent: structuredClone(state.sharedEvent),
    latestPlays: structuredClone(state.latestPlays),
    opponents,
    player: playerCopy,
    availableCards: player.hand.cards
      .map((instance) => cardById(content, instance.cardId))
      .filter((card): card is InvestigationCard => card !== undefined),
    result: structuredClone(state.result),
  };
}
