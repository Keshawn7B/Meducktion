// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { CardApp, MEDUCKTION_DISCLAIMER, MEDUCKTION_TAGLINE } from "./CardApp";
import type { CardAppActions, CardAppModel } from "./types";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const conditions = [
  { id: "condition.appendicitis", displayName: "Appendicitis", icon: "A", learnMore: "Irritation of the appendix." },
  { id: "condition.stomach-infection", displayName: "Stomach infection", icon: "S" },
  { id: "condition.urinary-infection", displayName: "Urinary infection", icon: "U" },
  { id: "condition.kidney-stone", displayName: "Kidney stone", icon: "K" },
] as const;

function model(screen: CardAppModel["screen"], patch?: Partial<CardAppModel["match"]>): CardAppModel {
  return {
    screen,
    canResume: false,
    setup: {
      selectedCaseId: "case.the-pain-that-moved",
      suggestedPlayerName: "Detective",
      selectedCaseName: "The Pain That Moved",
      availableCases: [{ id: "case.the-pain-that-moved", title: "The Pain That Moved", patientName: "Jordan Lee" }],
      opponentName: "Bailey",
      opponentStyle: "Balanced",
      playerCount: 2,
    },
    patient: {
      displayName: "Jordan Lee",
      age: 20,
      shortStory: "Jordan has felt sick and has had stomach pain since earlier today.",
      startingSymptom: "Stomach pain and nausea",
    },
    conditions,
    match: {
      round: 2,
      maximumRounds: 4,
      phase: "card_selection",
      seedLabel: "friendly-owl",
      hand: [
        {
          id: "card.ask.pain-move",
          title: "Did the pain move?",
          category: "ask",
          visibility: "private",
          description: "Ask Jordan how the pain changed.",
          selected: false,
          locked: false,
          disabled: false,
          dimmed: true,
        },
        {
          id: "card.check.abdomen",
          title: "Tender abdomen?",
          category: "check",
          visibility: "private",
          description: "Reveal a private YES or NO answer.",
          selected: true,
          locked: false,
          disabled: false,
          dimmed: false,
        },
        {
          id: "card.test.blood",
          title: "Urine clear?",
          category: "test",
          visibility: "private",
          description: "Reveal a private YES or NO answer.",
          selected: false,
          locked: false,
          disabled: false,
          dimmed: true,
        },
      ],
      publicClues: [],
      privateClues: [
        {
          id: "clue.pain-moved",
          title: "The pain moved to the lower-right side.",
          visibility: "private",
          question: "Did the pain move?",
          answer: "yes",
          isNew: true,
        },
        {
          id: "clue.low-appetite",
          title: "Jordan has little appetite.",
          visibility: "private",
          question: "Is Jordan eating normally?",
          answer: "no",
        },
      ],
      hiddenClueAnswers: [],
      cluePilePenaltyChoiceRequired: false,
      opponents: [
        {
          id: "player.bot",
          displayName: "Bailey",
          styleLabel: "Balanced bot",
          status: "locked",
          playedCategory: "test",
        },
      ],
      latestReveals: [
        {
          playerId: "player.human",
          playerName: "Detective",
          cardTitle: "Did the pain move?",
          category: "ask",
          clue: {
            id: "clue.pain-moved",
            title: "The pain moved to the lower-right side.",
            visibility: "public",
          },
          clueIsHidden: false,
        },
        {
          playerId: "player.bot",
          playerName: "Bailey",
          cardTitle: "Urine clear?",
          category: "test",
          clueIsHidden: true,
        },
      ],
      redrawAvailable: true,
      diagnosisUnlocked: true,
      diagnosisAttemptsRemaining: 3,
      diagnosisBlockedUntilNextRound: false,
      humanHasDiagnosed: false,
      humanEliminated: false,
      mustDiagnose: false,
      canLock: true,
      canUnlock: false,
      canReveal: false,
      revealActionLabel: "Reveal Cards",
      canAdvance: false,
      statusMessage: "Choose one card, then lock it in.",
      ...patch,
    },
    results: null,
  };
}

function actions(): CardAppActions {
  return {
    goHome: vi.fn(),
    openSetup: vi.fn(),
    resumeMatch: vi.fn(),
    startMatch: vi.fn(),
    dealCards: vi.fn(),
    toggleCard: vi.fn(),
    useRedraw: vi.fn(),
    lockCard: vi.fn(),
    unlockCard: vi.fn(),
    revealCards: vi.fn(),
    advanceRound: vi.fn(),
    submitDiagnosis: vi.fn(),
    chooseCluePilePenalty: vi.fn(),
    playAgain: vi.fn(),
  };
}

describe("competitive card-game UI", () => {
  it("renders symbols instead of raw unicode escape codes", () => {
    const calls = actions();
    const { container, rerender } = render(
      <CardApp model={model("home")} actions={calls} />,
    );

    for (const currentScreen of ["setup", "patient_intro", "match"] as const) {
      rerender(<CardApp model={model(currentScreen)} actions={calls} />);
      expect(container.textContent).not.toMatch(/\\u[0-9a-f]{4}/i);
    }
  });

  it("presents the new home experience and prominent disclaimer", () => {
    render(<CardApp model={model("home")} actions={actions()} />);
    expect(screen.getByText(MEDUCKTION_TAGLINE)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "Meducktion" })).toBeInTheDocument();
    expect(document.querySelector(".brand-wordmark")).toBeInTheDocument();
    expect(document.querySelector(".brand-mark")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Solve the case before your opponents." })).toBeInTheDocument();
    expect(screen.getByText(MEDUCKTION_DISCLAIMER)).toBeInTheDocument();
    expect(screen.getByLabelText("Meducktion medical duck mascot").querySelector('img[src$="/assets/meducktion-medical-duck-logo.webp"]')).toBeInTheDocument();
    expect(document.querySelector('img[src$="/assets/patient-jordan-lee.webp"]')).not.toBeInTheDocument();
    expect(screen.queryByText(/care budget|stability|focus points/i)).not.toBeInTheDocument();
  });

  it("routes Play Local to competitive setup and Practice separately", async () => {
    const user = userEvent.setup();
    const calls = actions();
    render(<CardApp model={model("home")} actions={calls} />);
    await user.click(screen.getByRole("button", { name: "Play Local" }));
    await user.click(screen.getByRole("button", { name: "Practice" }));
    expect(calls.openSetup).toHaveBeenNthCalledWith(1, "competitive");
    expect(calls.openSetup).toHaveBeenNthCalledWith(2, "practice");
  });

  it("offers a skippable five-panel tutorial", async () => {
    const user = userEvent.setup();
    render(<CardApp model={model("home")} actions={actions()} />);
    await user.click(screen.getByRole("button", { name: "How to Play" }));
    expect(screen.getByRole("dialog", { name: "Review the same fictional case" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Play one card each round" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Skip tutorial" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("submits beginner-friendly local match setup", async () => {
    const user = userEvent.setup();
    const calls = actions();
    render(<CardApp model={model("setup")} actions={calls} />);
    await user.clear(screen.getByLabelText("Your player name"));
    expect(screen.getByRole("button", { name: "Start Match" })).toBeDisabled();
    await user.type(screen.getByLabelText("Your player name"), "Alex");
    await user.click(screen.getByRole("button", { name: "Start Match" }));
    expect(calls.startMatch).toHaveBeenCalledWith({
      playerName: "Alex",
      playerCount: 2,
      caseId: "random",
    });
    expect(screen.getByText(/one human and one deterministic bot/i)).toBeInTheDocument();
  });

  it("introduces Jordan, four choices, and a deliberate deal action", async () => {
    const user = userEvent.setup();
    const calls = actions();
    render(<CardApp model={model("patient_intro")} actions={calls} />);
    expect(screen.getByRole("heading", { name: "Jordan Lee" })).toBeInTheDocument();
    expect(screen.getAllByText(/Appendicitis|Stomach infection|Urinary infection|Kidney stone/)).toHaveLength(4);
    await user.click(screen.getByRole("button", { name: "Deal Cards" }));
    expect(calls.dealCards).toHaveBeenCalledOnce();
  });

  it("renders a usable three-card hand and emits card selection", async () => {
    const user = userEvent.setup();
    const calls = actions();
    render(<CardApp model={model("match")} actions={calls} />);
    const cards = screen.getAllByRole("button", { name: /question:/i });
    expect(cards).toHaveLength(3);
    expect(cards[0]?.parentElement).toHaveClass("card-hand");
    expect(cards.every((card) => card.classList.contains("investigation-card"))).toBe(true);
    expect(cards[0]).toHaveClass("is-dimmed");
    expect(cards[1]).not.toHaveClass("is-dimmed");
    expect(cards[2]).toHaveClass("is-dimmed");
    expect(cards.every((card) => card.querySelector(".card-art") === null)).toBe(true);
    expect(cards.every((card) => card.querySelector(".card-visibility") === null)).toBe(true);
    expect(screen.getAllByText("YES")).toHaveLength(4);
    expect(screen.getAllByText("NO")).toHaveLength(4);
    expect(screen.getByRole("button", { name: /Check question: Tender abdomen.*Selected/i })).toHaveClass("is-selected");
    await user.click(screen.getByRole("button", { name: /Ask question: Did the pain move/i }));
    expect(calls.toggleCard).toHaveBeenCalledWith("card.ask.pain-move");
    await user.click(screen.getByRole("button", { name: "Lock Card" }));
    expect(calls.lockCard).toHaveBeenCalledOnce();
  });

  it("keeps every answer in the player's private YES and NO piles", () => {
    render(<CardApp model={model("match")} actions={actions()} />);
    expect(screen.queryByText(/shared clue|shared with room|private clue|private to you/i)).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your YES / NO evidence" })).toBeInTheDocument();
    expect(screen.getByLabelText("YES evidence")).toHaveTextContent("The pain moved to the lower-right side.");
    expect(screen.getByLabelText("NO evidence")).toHaveTextContent("Jordan has little appetite.");
    expect(screen.getByText("Opponent received an answer")).toBeInTheDocument();
    const opponentCards = screen.getByLabelText("Three face-down opponent cards");
    expect(opponentCards.children).toHaveLength(3);
    expect(opponentCards.querySelectorAll('img[src$="/assets/meducktion-medical-duck-logo.webp"]')).toHaveLength(3);
    expect(screen.getByLabelText("Meducktion card table")).toBeInTheDocument();
  });

  it("covers hidden evidence and requires the first-miss pile choice", async () => {
    const user = userEvent.setup();
    const calls = actions();
    render(
      <CardApp
        model={model("match", {
          hiddenClueAnswers: ["yes"],
          cluePilePenaltyChoiceRequired: true,
        })}
        actions={calls}
      />,
    );

    expect(screen.getByLabelText("YES evidence, hidden")).toHaveTextContent("Clues hidden");
    expect(screen.getByRole("dialog", { name: "Choose a pile to hide" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Hide NO clues" }));
    expect(calls.chooseCluePilePenalty).toHaveBeenCalledWith("no");
  });

  it("shows a visible locked state without removing the hand", () => {
    const base = model("match");
    const lockedHand = base.match.hand.map((card) => ({
      ...card,
      locked: card.selected,
      disabled: true,
    }));
    render(<CardApp model={model("match", { hand: lockedHand, canLock: false, canUnlock: true, canReveal: false, phase: "card_selection" })} actions={actions()} />);
    expect(screen.getAllByRole("button", { name: /question:/i })).toHaveLength(3);
    expect(screen.getByText("Ask Jordan how the pain changed.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tender abdomen.*Locked/i })).toHaveClass("is-locked");
    expect(screen.getAllByText("Locked").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Unlock Card" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Reveal Cards" })).not.toBeInTheDocument();
  });

  it("emits redraw and unlock actions while reveal remains automatic", async () => {
    const user = userEvent.setup();
    const redrawCalls = actions();
    const { rerender } = render(<CardApp model={model("match")} actions={redrawCalls} />);
    await user.click(screen.getByRole("button", { name: /Redraw hand/i }));
    expect(redrawCalls.useRedraw).toHaveBeenCalledOnce();

    const unlockCalls = actions();
    rerender(<CardApp model={model("match", { canLock: false, canUnlock: true, canReveal: false })} actions={unlockCalls} />);
    await user.click(screen.getByRole("button", { name: "Unlock Card" }));
    expect(unlockCalls.unlockCard).toHaveBeenCalledOnce();
    expect(screen.queryByRole("button", { name: "Reveal Cards" })).not.toBeInTheDocument();
  });

  it("offers an explicit leave control only for online matches", async () => {
    const user = userEvent.setup();
    const leave = vi.fn();
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const { rerender } = render(<CardApp model={model("match")} actions={actions()} />);
    expect(screen.queryByRole("button", { name: "Leave Match" })).not.toBeInTheDocument();
    rerender(<CardApp model={model("match")} actions={actions()} onLeaveMatch={leave} />);
    await user.click(screen.getByRole("button", { name: "Leave Match" }));
    expect(confirm).toHaveBeenCalledWith(expect.stringMatching(/bot will take over/i));
    expect(leave).toHaveBeenCalledOnce();
  });

  it("shows online room health and blocks duplicate actions while syncing", () => {
    const syncingModel: CardAppModel = {
      ...model("match"),
      online: { roomCode: "ABC234", isSyncing: true, isOffline: false },
    };
    render(<CardApp model={syncingModel} actions={actions()} />);
    expect(screen.getByRole("status")).toHaveTextContent("Room ABC234 Syncing");
    expect(screen.getByRole("button", { name: "Lock Card" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Diagnose" })).toBeDisabled();
  });

  it("shows when an online opponent is reconnecting", () => {
    render(<CardApp model={model("match", {
      opponents: [{
        id: "player.bot",
        displayName: "Bailey",
        styleLabel: "Online player",
        status: "reconnecting",
      }],
    })} actions={actions()} />);
    expect(screen.getByText("Reconnecting")).toBeInTheDocument();
  });

  it("allows a condition-only diagnosis whenever it is available", async () => {
    const user = userEvent.setup();
    const calls = actions();
    const { rerender } = render(
      <CardApp model={model("match", { diagnosisUnlocked: false, round: 1 })} actions={calls} />,
    );
    expect(screen.getByRole("button", { name: "Diagnose after reveal" })).toBeDisabled();

    rerender(
      <CardApp
        model={model("match", { diagnosisUnlocked: false, round: 3 })}
        actions={calls}
      />,
    );
    expect(screen.getByRole("button", { name: "Diagnose after reveal" })).toBeDisabled();

    rerender(<CardApp model={model("match")} actions={calls} />);
    await user.click(screen.getByRole("button", { name: "Diagnose" }));
    await user.click(screen.getByRole("button", { name: "Confirm Diagnosis" }));
    expect(screen.getByRole("alert")).toHaveTextContent("Choose one condition");

    await user.click(screen.getByLabelText(/Appendicitis/));
    await user.click(screen.getByRole("button", { name: "Confirm Diagnosis" }));
    expect(calls.submitDiagnosis).toHaveBeenCalledWith({
      conditionId: "condition.appendicitis",
      clueIds: [],
    });
  });

  it("exposes mobile-friendly jump navigation without hiding game sections", () => {
    render(<CardApp model={model("match")} actions={actions()} />);
    expect(screen.getByRole("navigation", { name: "Match sections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Patient" })).toHaveAttribute("href", "#patient-card");
    expect(screen.getByRole("link", { name: "Your hand" })).toHaveAttribute("href", "#player-hand");
  });

  it("renders the first correct winner, investigation paths, and educational recap", async () => {
    const user = userEvent.setup();
    const resultModel: CardAppModel = {
      ...model("results"),
      results: {
        winnerName: "Alex",
        hiddenDiagnosisName: "Appendicitis",
        explanation: "The moving pain, loss of appetite, and lower-right tenderness fit this fictional case.",
        tieBreakLabel: "Seeded mystery draw",
        rankings: [
          {
            playerId: "player.human",
            displayName: "Alex",
            placement: 1,
            totalScore: 950,
            diagnosisName: "Appendicitis",
            diagnosisCorrect: true,
            achievementName: "Sharp Detective",
            breakdown: {
              correctDiagnosis: 500,
              supportingClues: 200,
              timing: 100,
              efficiency: 100,
              achievement: 50,
              wrongAttemptPenalties: 0,
            },
            investigationPath: ["Did the pain move?", "Examine the abdomen"],
            isHuman: true,
          },
          {
            playerId: "player.bot",
            displayName: "Bailey",
            placement: 2,
            totalScore: 950,
            diagnosisName: "Appendicitis",
            diagnosisCorrect: true,
            breakdown: {
              correctDiagnosis: 500,
              supportingClues: 200,
              timing: 100,
              efficiency: 100,
              achievement: 50,
              wrongAttemptPenalties: 0,
            },
            investigationPath: ["Blood test", "Urine test"],
            isHuman: false,
          },
        ],
      },
    };
    const calls = actions();
    render(<CardApp model={resultModel} actions={calls} />);
    expect(screen.getByRole("heading", { name: "Alex wins!" })).toBeInTheDocument();
    expect(screen.getByText("You solved the case first.")).toBeInTheDocument();
    expect(screen.getByText("Your Appendicitis diagnosis was correct.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\\u[0-9a-f]{4}/i);
    expect(screen.queryByText("950")).not.toBeInTheDocument();
    expect(screen.queryByText(/Winner decided by/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Score details")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Investigation paths" })).toBeInTheDocument();
    expect(screen.getByText(/moving pain, loss of appetite/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Play Again" }));
    expect(calls.playAgain).toHaveBeenCalledOnce();
  });
});
