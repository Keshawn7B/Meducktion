import { useEffect, useMemo, useState } from "react";
import {
  createBrowserCardMatchStorage,
  createCardMatchSession,
  createMemoryCardMatchStorage,
  loadCardMatch,
  resetCardMatch,
  saveCardMatch,
  applyCardMatchCommand,
} from "../card-match-session";
import type {
  CardMatchSession,
  CardMatchStorageAdapter,
} from "../card-match-session";
import {
  cardCaseRegistry,
  getCardCaseById,
  thePainThatMovedCardCase,
} from "../card-content";
import type {
  CardCaseContent,
  CardClueDefinition,
} from "../card-content";
import {
  createCardMatch,
  createSeededRandomState,
  getDiagnosisConditionOptions,
  isDiagnosisAvailable,
  seededChoice,
} from "../card-game-engine";
import type {
  CardGameCommand,
  MatchPhase,
  MatchState,
  PlayerState,
} from "../card-game-engine";
import type {
  CardAppActions,
  CardAppModel,
  CardAppScreen,
  CardMatchPhase,
  DiagnosisInput,
  StartMatchInput,
} from "../card-app/types";

const HUMAN_PLAYER_ID = "player.human";
const BOT_NAMES = ["Dr. Beak", "Mira", "Patch"] as const;

let localMatchCounter = 0;

interface CommandRun {
  readonly session: CardMatchSession;
  readonly errorMessage?: string;
}

export interface CardMatchController {
  readonly model: CardAppModel;
  readonly actions: CardAppActions;
}

function createLocalSeed(): string {
  localMatchCounter += 1;
  return `local-${Date.now().toString(36)}-${localMatchCounter}`;
}

function runCommands(
  session: CardMatchSession,
  commands: readonly CardGameCommand[],
): CommandRun {
  let next = session;
  for (const command of commands) {
    const commandSequence = next.commandSequence + 1;
    const transition = applyCardMatchCommand(next, {
      commandId: `${next.sessionId}:command:${commandSequence}`,
      commandSequence,
      expectedRevision: next.matchState.revision,
      command,
    });
    if (transition.error) {
      return { session: next, errorMessage: transition.error.message };
    }
    next = transition.session;
  }
  return { session: next };
}

function iconForCondition(iconKey: string): string {
  const icons: Record<string, string> = {
    "condition-appendix": "✦",
    "condition-stomach": "≈",
    "condition-urinary": "◇",
    "condition-kidney": "◆",
  };
  return icons[iconKey] ?? "?";
}

function clueDefinition(
  content: CardCaseContent,
  clueId: string,
): CardClueDefinition | undefined {
  return content.clues.find((clue) => clue.id === clueId);
}

function viewPhase(phase: MatchPhase): CardMatchPhase {
  switch (phase) {
    case "card_selection":
    case "cards_locked":
    case "card_reveal":
    case "clue_review":
    case "diagnosis_window":
    case "match_complete":
      return phase;
    case "match_intro":
    case "round_draw":
    case "next_round":
      return "round_draw";
  }
}

function statusForMatch(
  state: MatchState | undefined,
  player: PlayerState | undefined,
  message: string,
): string {
  if (message) return message;
  if (!state || !player) return "Your mystery is ready when you are.";
  switch (state.phase) {
    case "match_intro":
      return "Meet Jordan, then deal the opening hand.";
    case "round_draw":
      return "Drawing each player's cards…";
    case "card_selection":
      return player.hand.selectedCardInstanceId
        ? "Card selected. Change it or lock it in."
        : "Choose one investigation card for this round.";
    case "cards_locked":
      return "Everyone is locked. Revealing automatically…";
    case "card_reveal":
    case "clue_review":
      return "New YES and NO evidence is being placed on the table.";
    case "diagnosis_window":
      if ((state.diagnosisPassedPlayerIds ?? []).includes(player.id)) {
        return "Waiting for the other players to decide.";
      }
      if (
        player.diagnosisLockedUntilRound !== null &&
        state.currentRound < player.diagnosisLockedUntilRound
      ) {
        return "Your next diagnosis attempt unlocks next round.";
      }
      return state.currentRound >= state.maximumRounds
        ? "Make the required final diagnosis."
        : "Diagnose now or continue to the next round.";
    case "next_round":
      return "The next round is ready.";
    case "match_complete":
      return "The case is complete.";
  }
}

function achievementName(achievementId: string | null): string | undefined {
  const labels: Record<string, string> = {
    "achievement.bold-call": "Bold Call",
    "achievement.sharp-detective": "Sharp Detective",
    "achievement.focused-search": "Focused Search",
    "achievement.clue-collector": "Clue Collector",
  };
  return achievementId === null ? undefined : labels[achievementId];
}

function tieBreakLabel(reason: NonNullable<MatchState["result"]>["winningTieBreak"] | undefined): string {
  const labels = {
    only_player: "Only remaining player",
    correct_diagnosis: "Correct diagnosis",
    total_score: "Higher total score",
    evidence_score: "Stronger submitted evidence",
    earlier_correct_round: "Earlier correct round",
    fewer_wrong_diagnoses: "Fewer wrong diagnoses",
    more_unique_discoveries: "More unique discoveries",
    seeded_mystery_draw: "Seeded mystery draw",
  } as const;
  return reason ? labels[reason] : "Final score";
}

function screenForSession(session: CardMatchSession): CardAppScreen {
  if (session.matchState.phase === "match_intro") return "patient_intro";
  if (session.matchState.phase === "match_complete") return "results";
  return "match";
}

export function buildCardAppModel(
  content: CardCaseContent,
  requestedScreen: CardAppScreen,
  session: CardMatchSession | null,
  statusMessage = "",
  saveNotice?: string,
  errorMessage?: string,
  playerId = HUMAN_PLAYER_ID,
): CardAppModel {
  const state = session?.matchState;
  const human = state?.players[playerId];
  const diagnosisConditions = state
    ? getDiagnosisConditionOptions(content, state)
    : content.conditions;
  const visibleScreen =
    requestedScreen === "match" && state?.phase === "match_complete"
      ? "results"
      : requestedScreen;
  const startingClueId =
    content.variants.find((variant) => variant.id === state?.variantId)
      ?.startingClueId ?? content.variants[0]?.startingClueId;
  const startingClue = startingClueId
    ? clueDefinition(content, startingClueId)
    : undefined;

  const publicClues =
    state?.publicClues.map((reveal) => {
      const clue = clueDefinition(content, reveal.clueId);
      return {
        id: reveal.clueId,
        title: clue?.displayText ?? "Shared clue",
        ...(clue ? { question: clue.question, answer: clue.answer } : {}),
        ...(clue?.expandedText ? { explanation: clue.expandedText } : {}),
        visibility: "public" as const,
        isNew: reveal.round === state.currentRound,
      };
    }) ?? [];
  const privateClues =
    human?.privateClues.map((reveal) => {
      const clue = clueDefinition(content, reveal.clueId);
      return {
        id: reveal.clueId,
        title: clue?.displayText ?? "Private clue",
        ...(clue ? { question: clue.question, answer: clue.answer } : {}),
        ...(clue?.expandedText ? { explanation: clue.expandedText } : {}),
        visibility: "private" as const,
        isNew: reveal.round === state?.currentRound,
      };
    }) ?? [];

  const results = state?.result
    ? {
        winnerName: state.result.winnerPlayerIds
          .map((playerId) => state.players[playerId]?.displayName)
          .filter((name): name is string => Boolean(name))
          .join(" & "),
        hiddenDiagnosisName:
          content.conditions.find(
            (condition) => condition.id === state.result?.correctConditionId,
          )?.displayName ?? "the hidden condition",
        explanation: content.educationalExplanation,
        tieBreakLabel: tieBreakLabel(state.result.winningTieBreak),
        rankings: state.result.rankings.map((ranking) => {
          const player = state.players[ranking.playerId];
          const lastDiagnosis = player?.diagnosisSubmissions.at(-1);
          const score = ranking.score;
          const namedAchievement = achievementName(score.achievementId);
          return {
            playerId: ranking.playerId,
            displayName: player?.displayName ?? "Player",
            placement: ranking.placement,
            totalScore: score.total,
            diagnosisName:
              content.conditions.find(
                (condition) => condition.id === lastDiagnosis?.conditionId,
              )?.displayName ?? "No diagnosis",
            diagnosisCorrect:
              player?.diagnosisSubmissions.some(
                (submission) => submission.correct,
              ) ?? false,
            ...(namedAchievement ? { achievementName: namedAchievement } : {}),
            breakdown: {
              correctDiagnosis: score.correctDiagnosis,
              supportingClues: score.supportingClues,
              timing: score.timing,
              efficiency: score.efficientInvestigation,
              achievement: score.achievement,
              wrongAttemptPenalties: score.wrongAttemptPenalty,
            },
            investigationPath: player?.plays.map((play) => play.displayName) ?? [],
            isHuman: ranking.playerId === playerId,
          };
        }),
      }
    : null;

  const sharedEvent =
    state?.sharedEvent.revealed === true
      ? content.sharedEvents.find(
          (event) => event.id === state.sharedEvent.eventId,
        )
      : undefined;

  return {
    screen: visibleScreen,
    canResume: session !== null,
    ...(saveNotice ? { legacySaveNotice: saveNotice } : {}),
    ...(errorMessage ? { errorMessage } : {}),
    setup: {
      selectedCaseId: "random",
      suggestedPlayerName: human?.displayName ?? "Detective",
      selectedCaseName: "Random mystery",
      availableCases: [{
        id: "random",
        title: "Random mystery",
        patientName: "Revealed when the match starts",
      }],
      opponentName: BOT_NAMES[0],
      opponentStyle: "Balanced",
      playerCount: 2,
    },
    patient: {
      displayName: content.patient.displayName,
      age: content.patient.age,
      shortStory: content.patient.introduction,
      startingSymptom:
        startingClue?.displayText ?? "Jordan's stomach pain began earlier today.",
    },
    conditions: diagnosisConditions.map((condition) => ({
      id: condition.id,
      displayName: condition.displayName,
      icon: iconForCondition(condition.iconKey),
      learnMore: condition.learnMore,
    })),
    match: {
      round: state?.currentRound ?? 1,
      maximumRounds: state?.maximumRounds ?? 4,
      phase: viewPhase(state?.phase ?? "round_draw"),
      seedLabel: state?.seed ?? "not-started",
      hand:
        human?.hand.cards.map((instance) => {
          const card = content.cards.find((candidate) => candidate.id === instance.cardId);
          const selected = human.hand.selectedCardInstanceId === instance.instanceId;
          return {
            id: instance.instanceId,
            title: card?.displayName ?? "Investigation card",
            category: card?.category ?? "special",
            visibility: card?.visibility ?? "private",
            description: card?.description ?? "Reveal another part of the mystery.",
            ...(card?.beginnerHint ? { beginnerHint: card.beginnerHint } : {}),
            selected,
            locked: human.hand.locked,
            dimmed: human.hand.selectedCardInstanceId !== null && !selected,
            disabled:
              state?.phase !== "card_selection" ||
              human.correctDiagnosisRound !== null,
          };
        }) ?? [],
      publicClues,
      privateClues,
      hiddenClueAnswers: human?.hiddenClueAnswers ?? [],
      cluePilePenaltyChoiceRequired: human?.pendingCluePenaltyChoice ?? false,
      opponents:
        state?.playerOrder
          .filter((opponentId) => opponentId !== playerId)
          .map((opponentId) => {
            const opponent = state.players[opponentId];
            const latestPlay = state.latestPlays.find(
              (play) => play.playerId === opponentId,
            );
            const status = opponent?.finalDiagnosisSubmitted
              ? opponent.correctDiagnosisRound === null
                ? ("eliminated" as const)
                : ("diagnosed" as const)
              : opponent?.hand.locked
                ? ("locked" as const)
                : state.phase === "card_reveal" ||
                    state.phase === "clue_review" ||
                    state.phase === "diagnosis_window"
                  ? ("reviewing" as const)
                  : ("choosing" as const);
            return {
              id: opponentId,
              displayName: opponent?.displayName ?? "Bot",
              styleLabel: opponent?.kind === "bot" ? "Balanced bot" : "Online player",
              avatar: opponent?.displayName.slice(0, 1).toUpperCase() ?? "?",
              status,
              ...(latestPlay ? { playedCategory: latestPlay.category } : {}),
            };
          }) ?? [],
      latestReveals:
        state?.latestPlays.map((play) => {
          const owner = state.players[play.playerId];
          const privateReveal = owner?.privateClues.find(
            (clue) =>
              clue.round === state.currentRound && clue.sourceId === play.cardId,
          );
          const publicReveal = state.publicClues.find(
            (clue) =>
              clue.round === state.currentRound && clue.sourceId === play.cardId,
          );
          const reveal = publicReveal ??
            (play.playerId === playerId ? privateReveal : undefined);
          const clue = reveal
            ? clueDefinition(content, reveal.clueId)
            : undefined;
          const clueHiddenByPenalty =
            play.playerId === playerId &&
            clue !== undefined &&
            (human?.hiddenClueAnswers ?? []).includes(clue.answer);
          const playedCard = content.cards.find((card) => card.id === play.cardId);
          const effectText = playedCard?.result.type === "special"
            ? playedCard.result.effect.type === "swap_one_card"
              ? "Your least useful remaining card was traded for a new one."
              : playedCard.result.effect.type === "draw_two_keep_one"
                ? "Two cards were drawn and the stronger option was kept."
                : playedCard.description
            : undefined;
          return {
            playerId: play.playerId,
            playerName: owner?.displayName ?? "Player",
            cardTitle: play.displayName,
            category: play.category,
            ...(clue && !clueHiddenByPenalty
              ? {
                  clue: {
                    id: clue.id,
                    title: clue.displayText,
                    explanation: clue.expandedText,
                    visibility:
                      publicReveal !== undefined
                        ? ("public" as const)
                        : ("private" as const),
                  },
                }
              : {}),
            clueIsHidden:
              clueHiddenByPenalty ||
              (play.playerId !== playerId && play.visibility === "private"),
            ...(effectText ? { effectText } : {}),
          };
        }) ?? [],
      ...(sharedEvent
        ? {
            sharedEvent: {
              title: sharedEvent.displayName,
              description: sharedEvent.description,
            },
          }
        : {}),
      redrawAvailable: human?.redrawAvailable ?? true,
      diagnosisUnlocked:
        state !== undefined && isDiagnosisAvailable(state, playerId),
      diagnosisAttemptsRemaining: Math.max(
        0,
        3 - (human?.diagnosisAttemptsUsed ?? 0),
      ),
      diagnosisBlockedUntilNextRound:
        human?.diagnosisLockedUntilRound !== null &&
        human?.diagnosisLockedUntilRound !== undefined &&
        (state?.currentRound ?? 0) < human.diagnosisLockedUntilRound,
      humanHasDiagnosed: human?.correctDiagnosisRound != null,
      humanEliminated:
        human?.finalDiagnosisSubmitted === true &&
        human.correctDiagnosisRound === null,
      mustDiagnose:
        state?.phase === "diagnosis_window" &&
        state.currentRound >= state.maximumRounds &&
        human !== undefined &&
        human.correctDiagnosisRound === null &&
        human.diagnosisAttemptsUsed < 3 &&
        !human.pendingCluePenaltyChoice &&
        !human.diagnosisSubmissions.some(
          (submission) => submission.round === state.currentRound,
        ),
      canLock:
        state?.phase === "card_selection" &&
        human?.correctDiagnosisRound === null &&
        human?.finalDiagnosisSubmitted === false &&
        !human?.pendingCluePenaltyChoice &&
        !human.hand.locked,
      canUnlock:
        state?.phase === "card_selection" &&
        human?.correctDiagnosisRound === null &&
        human?.finalDiagnosisSubmitted === false &&
        !human?.pendingCluePenaltyChoice &&
        human.hand.locked,
      canReveal:
        state?.phase === "cards_locked" ||
        (state?.phase === "card_reveal" &&
          !(state.acknowledgedRevealPlayerIds ?? []).includes(playerId)),
      revealActionLabel:
        state?.phase === "card_reveal" ? "Review Clues" : "Reveal Cards",
      canAdvance:
        state?.phase === "diagnosis_window" &&
        human?.finalDiagnosisSubmitted !== true &&
        !human?.pendingCluePenaltyChoice &&
        !(state.diagnosisPassedPlayerIds ?? []).includes(playerId) &&
        !(
          state.currentRound >= state.maximumRounds &&
          human !== undefined &&
          human.correctDiagnosisRound === null &&
          human.diagnosisAttemptsUsed < 3 &&
          !human.pendingCluePenaltyChoice &&
          !human.diagnosisSubmissions.some(
            (submission) => submission.round === state.currentRound,
          )
        ),
      statusMessage: statusForMatch(state, human, statusMessage),
    },
    results,
  };
}

export function useCardMatch(): CardMatchController {
  const storage = useMemo<CardMatchStorageAdapter>(
    () =>
      typeof window === "undefined"
        ? createMemoryCardMatchStorage()
        : createBrowserCardMatchStorage(window.localStorage),
    [],
  );
  const initialLoad = useMemo(() => loadCardMatch(storage), [storage]);
  const [session, setSession] = useState<CardMatchSession | null>(
    initialLoad.session ?? null,
  );
  const [screen, setScreen] = useState<CardAppScreen>("home");
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [saveNotice, setSaveNotice] = useState(initialLoad.error?.message);
  const activeContent = session
    ? getCardCaseById(session.caseId) ?? thePainThatMovedCardCase
    : thePainThatMovedCardCase;

  useEffect(() => {
    if (!session) return;
    const currentContent = getCardCaseById(session.caseId);
    if (
      currentContent &&
      session.contentVersion === currentContent.contentVersion &&
      session.matchState.contentVersion === currentContent.contentVersion
    ) return;
    resetCardMatch(storage);
    setSession(null);
    setScreen("home");
    setSaveNotice("The card catalog changed, so the incompatible saved match was cleared. Start a new match to use the complete symptom deck.");
  }, [session, storage]);

  function commit(run: CommandRun): CardMatchSession {
    setSession(run.session);
    setErrorMessage(run.errorMessage ?? "");
    if (!run.errorMessage) {
      setMessage("");
      saveCardMatch(storage, run.session);
    }
    return run.session;
  }

  function startMatch(input: StartMatchInput) {
    const seed = createLocalSeed();
    const selectedContent = input.caseId === "random"
      ? seededChoice(cardCaseRegistry, createSeededRandomState(`case:${seed}`))?.value ?? thePainThatMovedCardCase
      : getCardCaseById(input.caseId) ?? thePainThatMovedCardCase;
    const players = [
      {
        id: HUMAN_PLAYER_ID,
        displayName: input.playerName,
        kind: "human" as const,
      },
      ...Array.from({ length: input.playerCount - 1 }, (_, index) => ({
        id: `player.bot.${index + 1}`,
        displayName: BOT_NAMES[index] ?? `Bot ${index + 1}`,
        kind: "bot" as const,
        botStyle: "balanced" as const,
      })),
    ];
    const matchState = createCardMatch(selectedContent, {
      seed,
      matchId: `match.local.${seed}`,
      players,
    });
    const created = createCardMatchSession(
      matchState,
      `session.local.${seed}`,
    );
    resetCardMatch(storage);
    saveCardMatch(storage, created);
    setSession(created);
    setMessage("");
    setErrorMessage("");
    setSaveNotice(undefined);
    setScreen("patient_intro");
  }

  function withCurrent(commands: readonly CardGameCommand[]): CardMatchSession | null {
    if (!session) return null;
    return commit(runCommands(session, commands));
  }

  function submitDiagnosis(input: DiagnosisInput) {
    if (!session) return;
    const next = commit(
      runCommands(session, [
        {
          type: "SUBMIT_DIAGNOSIS",
          playerId: HUMAN_PLAYER_ID,
          conditionId: input.conditionId,
          clueIds: input.clueIds,
        },
      ]),
    );
    const latest = next.matchState.players[HUMAN_PLAYER_ID]?.diagnosisSubmissions.at(-1);
    if (latest) {
      setErrorMessage("");
      setMessage(
        latest.correct
          ? "Correct diagnosis. You won the match."
          : next.matchState.players[HUMAN_PLAYER_ID]?.diagnosisAttemptsUsed === 1
            ? "Incorrect. Choose whether to hide your YES or NO clues."
            : next.matchState.players[HUMAN_PLAYER_ID]?.finalDiagnosisSubmitted
              ? "Incorrect. That was your third guess, so you are out of the match."
              : "Incorrect. Both clue piles are now hidden until the match ends.",
      );
    }
  }

  const actions: CardAppActions = {
    goHome: () => setScreen("home"),
    openSetup: () => {
      setMessage("");
      setScreen("setup");
    },
    resumeMatch: () => {
      if (session) setScreen(screenForSession(session));
    },
    startMatch,
    dealCards: () => {
      const next = withCurrent([{ type: "START_MATCH" }, { type: "DRAW_CARDS" }]);
      if (next) setScreen(screenForSession(next));
    },
    toggleCard: (cardInstanceId) => {
      if (!session) return;
      const selected =
        session.matchState.players[HUMAN_PLAYER_ID]?.hand.selectedCardInstanceId;
      withCurrent([
        selected === cardInstanceId
          ? { type: "DESELECT_CARD", playerId: HUMAN_PLAYER_ID }
          : {
              type: "SELECT_CARD",
              playerId: HUMAN_PLAYER_ID,
              cardInstanceId,
            },
      ]);
    },
    useRedraw: () =>
      void withCurrent([{ type: "USE_REDRAW", playerId: HUMAN_PLAYER_ID }]),
    lockCard: () => {
      if (!session) return;
      let run = runCommands(session, [{ type: "LOCK_CARD", playerId: HUMAN_PLAYER_ID }]);
      if (!run.errorMessage && run.session.matchState.phase === "cards_locked") {
        run = runCommands(run.session, [{ type: "RESOLVE_ROUND" }]);
      }
      if (!run.errorMessage && run.session.matchState.phase === "card_reveal") {
        run = runCommands(run.session, [{ type: "ACKNOWLEDGE_REVEAL", playerId: HUMAN_PLAYER_ID }]);
      }
      if (!run.errorMessage && run.session.matchState.phase === "clue_review") {
        run = runCommands(run.session, [{ type: "OPEN_DIAGNOSIS_WINDOW" }]);
      }
      if (!run.errorMessage && run.session.matchState.phase === "diagnosis_window" && run.session.matchState.currentRound < run.session.matchState.maximumRounds) {
        run = runCommands(run.session, [{ type: "CONTINUE_FROM_DIAGNOSIS" }]);
        if (!run.errorMessage && run.session.matchState.phase === "next_round") {
          run = runCommands(run.session, [{ type: "ADVANCE_ROUND" }, { type: "DRAW_CARDS" }]);
        }
      }
      const next = commit(run);
      setScreen(screenForSession(next));
    },
    unlockCard: () =>
      void withCurrent([{ type: "UNLOCK_CARD", playerId: HUMAN_PLAYER_ID }]),
    revealCards: () => {
      if (!session) return;
      let run = runCommands(session, [{ type: "RESOLVE_ROUND" }]);
      if (!run.errorMessage && run.session.matchState.phase === "card_reveal") {
        run = runCommands(run.session, [
          { type: "ACKNOWLEDGE_REVEAL", playerId: HUMAN_PLAYER_ID },
          { type: "OPEN_DIAGNOSIS_WINDOW" },
        ]);
      }
      commit(run);
    },
    advanceRound: () => {
      if (!session) return;
      let run = runCommands(session, [{ type: "CONTINUE_FROM_DIAGNOSIS" }]);
      if (!run.errorMessage && run.session.matchState.phase === "next_round") {
        run = runCommands(run.session, [
          { type: "ADVANCE_ROUND" },
          { type: "DRAW_CARDS" },
        ]);
      }
      const next = commit(run);
      setScreen(screenForSession(next));
    },
    submitDiagnosis,
    chooseCluePilePenalty: (answer) =>
      void withCurrent([
        {
          type: "CHOOSE_CLUE_PILE_PENALTY",
          playerId: HUMAN_PLAYER_ID,
          answer,
        },
      ]),
    playAgain: () => {
      resetCardMatch(storage);
      setSession(null);
      setMessage("");
      setErrorMessage("");
      setScreen("setup");
    },
  };

  return {
    model: buildCardAppModel(
      activeContent,
      screen,
      session,
      message,
      saveNotice,
      errorMessage,
    ),
    actions,
  };
}
