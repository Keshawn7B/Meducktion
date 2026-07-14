// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom/vitest";
import { CardApp, MEDUCKTION_DISCLAIMER, MEDUCKTION_TAGLINE } from "./CardApp";
import type { CardAppActions, CardAppModel } from "./types";

afterEach(cleanup);

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
      suggestedPlayerName: "Detective",
      selectedCaseName: "The Pain That Moved",
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
        },
        {
          id: "card.check.abdomen",
          title: "Examine the abdomen",
          category: "check",
          visibility: "private",
          description: "Gently check where it feels tender.",
          selected: true,
          locked: false,
          disabled: false,
        },
        {
          id: "card.test.blood",
          title: "Blood test",
          category: "test",
          visibility: "public",
          description: "Look for a simple sign of inflammation.",
          selected: false,
          locked: false,
          disabled: false,
        },
      ],
      publicClues: [
        {
          id: "clue.pain-moved",
          title: "The pain moved to the lower-right side.",
          visibility: "public",
          isNew: true,
        },
      ],
      privateClues: [
        {
          id: "clue.low-appetite",
          title: "Jordan has little appetite.",
          visibility: "private",
        },
      ],
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
          cardTitle: "Blood test",
          category: "test",
          clueIsHidden: true,
        },
      ],
      redrawAvailable: true,
      diagnosisUnlocked: true,
      diagnosisAttemptsRemaining: 2,
      diagnosisBlockedUntilNextRound: false,
      humanHasDiagnosed: false,
      mustDiagnose: false,
      canLock: true,
      canReveal: false,
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
    revealCards: vi.fn(),
    advanceRound: vi.fn(),
    submitDiagnosis: vi.fn(),
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
    expect(screen.getByRole("heading", { name: "Can you crack the case first?" })).toBeInTheDocument();
    expect(screen.getByText(MEDUCKTION_DISCLAIMER)).toBeInTheDocument();
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
    expect(screen.getByRole("dialog", { name: "Solve the same fictional case" })).toBeInTheDocument();
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
    expect(calls.startMatch).toHaveBeenCalledWith({ playerName: "Alex", playerCount: 2 });
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
    const cards = screen.getAllByRole("button", { name: /card:/i });
    expect(cards).toHaveLength(3);
    expect(cards[0]?.parentElement).toHaveClass("card-hand");
    expect(cards.every((card) => card.classList.contains("investigation-card"))).toBe(true);
    expect(screen.getAllByText("Private clue")).toHaveLength(2);
    expect(screen.getByText("Shared clue")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Check card: Examine the abdomen.*Selected/i })).toHaveClass("is-selected");
    await user.click(screen.getByRole("button", { name: /Ask card: Did the pain move/i }));
    expect(calls.toggleCard).toHaveBeenCalledWith("card.ask.pain-move");
    await user.click(screen.getByRole("button", { name: "Lock Card" }));
    expect(calls.lockCard).toHaveBeenCalledOnce();
  });

  it("keeps public, private, and opponent-hidden clues distinct", () => {
    render(<CardApp model={model("match")} actions={actions()} />);
    expect(screen.getByRole("heading", { name: "Shared clues" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Your private clues" })).toBeInTheDocument();
    expect(screen.getAllByText("Shared with room").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Private to you").length).toBeGreaterThan(0);
    expect(screen.getByText("Jordan has little appetite.")).toBeInTheDocument();
    expect(screen.getByText("Private clue collected")).toBeInTheDocument();
    expect(screen.getByLabelText("Three face-down opponent cards").children).toHaveLength(3);
    expect(screen.getByLabelText("Meducktion card table")).toBeInTheDocument();
  });

  it("shows a visible locked state without removing the hand", () => {
    const base = model("match");
    const lockedHand = base.match.hand.map((card) => ({
      ...card,
      locked: card.selected,
      disabled: true,
    }));
    render(<CardApp model={model("match", { hand: lockedHand, canLock: false, canReveal: true, phase: "cards_locked" })} actions={actions()} />);
    expect(screen.getAllByRole("button", { name: /card:/i })).toHaveLength(3);
    expect(screen.getByRole("button", { name: /Examine the abdomen.*Locked/i })).toHaveClass("is-locked");
    expect(screen.getAllByText("Locked").length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Reveal Cards" })).toBeInTheDocument();
  });

  it("emits redraw and reveal lifecycle actions", async () => {
    const user = userEvent.setup();
    const redrawCalls = actions();
    const { rerender } = render(<CardApp model={model("match")} actions={redrawCalls} />);
    await user.click(screen.getByRole("button", { name: /Redraw hand/i }));
    expect(redrawCalls.useRedraw).toHaveBeenCalledOnce();

    const revealCalls = actions();
    rerender(<CardApp model={model("match", { canLock: false, canReveal: true, phase: "cards_locked" })} actions={revealCalls} />);
    await user.click(screen.getByRole("button", { name: "Reveal Cards" }));
    expect(revealCalls.revealCards).toHaveBeenCalledOnce();
  });

  it("shows diagnosis timing and validates the simple diagnosis form", async () => {
    const user = userEvent.setup();
    const calls = actions();
    const { rerender } = render(
      <CardApp model={model("match", { diagnosisUnlocked: false, round: 1 })} actions={calls} />,
    );
    expect(screen.getByRole("button", { name: "Diagnose after Round 2" })).toBeDisabled();

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
    expect(screen.getByRole("alert")).toHaveTextContent("Choose one condition and exactly two clues");

    await user.click(screen.getByLabelText(/Appendicitis/));
    await user.click(screen.getByLabelText(/The pain moved to the lower-right side/));
    await user.click(screen.getByLabelText(/Jordan has little appetite/));
    await user.click(screen.getByRole("button", { name: "Confirm Diagnosis" }));
    expect(calls.submitDiagnosis).toHaveBeenCalledWith({
      conditionId: "condition.appendicitis",
      clueIds: ["clue.pain-moved", "clue.low-appetite"],
    });
  });

  it("exposes mobile-friendly jump navigation without hiding game sections", () => {
    render(<CardApp model={model("match")} actions={actions()} />);
    expect(screen.getByRole("navigation", { name: "Match sections" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Patient" })).toHaveAttribute("href", "#patient-card");
    expect(screen.getByRole("link", { name: "Your hand" })).toHaveAttribute("href", "#player-hand");
  });

  it("renders winner, score categories, investigation paths, and educational recap", async () => {
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
    expect(screen.getByRole("heading", { name: "Alex wins the room!" })).toBeInTheDocument();
    expect(screen.getByText("You won the room.")).toBeInTheDocument();
    expect(screen.getByText("Your Appendicitis diagnosis was correct.")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/\\u[0-9a-f]{4}/i);
    expect(screen.getAllByText("950")).toHaveLength(3);
    expect(screen.getByText(/seeded mystery draw/i)).toBeInTheDocument();
    expect(screen.getByText(/Winner decided by/i)).toBeInTheDocument();
    expect(screen.getAllByText("Score details")[0]?.closest("details")).toHaveAttribute("open");
    expect(screen.getAllByText("Correct diagnosis")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Investigation paths" })).toBeInTheDocument();
    expect(screen.getByText(/moving pain, loss of appetite/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Play Again" }));
    expect(calls.playAgain).toHaveBeenCalledOnce();
  });
});
