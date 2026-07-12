import type { CardCategory as ContentCardCategory } from "../card-content";
import type { MatchPhase as EngineMatchPhase } from "../card-game-engine";

export type CardAppScreen =
  | "home"
  | "setup"
  | "patient_intro"
  | "match"
  | "results";

export type CardCategory = ContentCardCategory;

export type CardMatchPhase = EngineMatchPhase;

export interface CardView {
  readonly id: string;
  readonly title: string;
  readonly category: CardCategory;
  readonly description: string;
  readonly icon?: string;
  readonly beginnerHint?: string;
  readonly selected: boolean;
  readonly locked: boolean;
  readonly disabled: boolean;
}

export interface ConditionView {
  readonly id: string;
  readonly displayName: string;
  readonly icon?: string;
  readonly learnMore?: string;
}

export interface ClueView {
  readonly id: string;
  readonly title: string;
  readonly explanation?: string;
  readonly visibility: "public" | "private";
  readonly isNew?: boolean;
}

export interface OpponentView {
  readonly id: string;
  readonly displayName: string;
  readonly styleLabel: string;
  readonly avatar?: string;
  readonly status: "choosing" | "locked" | "reviewing" | "diagnosed";
  readonly playedCategory?: CardCategory;
}

export interface CardRevealView {
  readonly playerId: string;
  readonly playerName: string;
  readonly cardTitle: string;
  readonly category: CardCategory;
  readonly clue?: ClueView;
  readonly clueIsHidden: boolean;
}

export interface ScoreBreakdownView {
  readonly correctDiagnosis: number;
  readonly supportingClues: number;
  readonly timing: number;
  readonly efficiency: number;
  readonly achievement: number;
  readonly wrongAttemptPenalties: number;
}

export interface PlayerResultView {
  readonly playerId: string;
  readonly displayName: string;
  readonly placement: number;
  readonly totalScore: number;
  readonly diagnosisName: string;
  readonly diagnosisCorrect: boolean;
  readonly achievementName?: string;
  readonly breakdown: ScoreBreakdownView;
  readonly investigationPath: readonly string[];
  readonly isHuman: boolean;
}

export interface CardAppModel {
  readonly screen: CardAppScreen;
  readonly canResume: boolean;
  readonly legacySaveNotice?: string;
  readonly errorMessage?: string;
  readonly setup: {
    readonly suggestedPlayerName: string;
    readonly selectedCaseName: string;
    readonly opponentName: string;
    readonly opponentStyle: string;
    readonly playerCount: 2 | 3 | 4;
  };
  readonly patient: {
    readonly displayName: string;
    readonly age: number;
    readonly shortStory: string;
    readonly startingSymptom: string;
  };
  readonly conditions: readonly ConditionView[];
  readonly match: {
    readonly round: number;
    readonly maximumRounds: number;
    readonly phase: CardMatchPhase;
    readonly seedLabel: string;
    readonly hand: readonly CardView[];
    readonly publicClues: readonly ClueView[];
    readonly privateClues: readonly ClueView[];
    readonly opponents: readonly OpponentView[];
    readonly latestReveals: readonly CardRevealView[];
    readonly sharedEvent?: {
      readonly title: string;
      readonly description: string;
    };
    readonly redrawAvailable: boolean;
    readonly diagnosisUnlocked: boolean;
    readonly diagnosisAttemptsRemaining: number;
    readonly diagnosisBlockedUntilNextRound: boolean;
    readonly humanHasDiagnosed: boolean;
    readonly canLock: boolean;
    readonly canReveal: boolean;
    readonly canAdvance: boolean;
    readonly statusMessage: string;
  };
  readonly results: {
    readonly winnerName: string;
    readonly hiddenDiagnosisName: string;
    readonly explanation: string;
    readonly rankings: readonly PlayerResultView[];
  } | null;
}

export interface StartMatchInput {
  readonly playerName: string;
  readonly playerCount: 2 | 3 | 4;
}

export interface DiagnosisInput {
  readonly conditionId: string;
  readonly clueIds: [string, string];
}

export interface CardAppActions {
  readonly goHome: () => void;
  readonly openSetup: (mode: "competitive" | "practice") => void;
  readonly resumeMatch: () => void;
  readonly startMatch: (input: StartMatchInput) => void;
  readonly dealCards: () => void;
  readonly toggleCard: (cardId: string) => void;
  readonly useRedraw: () => void;
  readonly lockCard: () => void;
  readonly revealCards: () => void;
  readonly advanceRound: () => void;
  readonly submitDiagnosis: (input: DiagnosisInput) => void;
  readonly playAgain: () => void;
}

export interface CardAppProps {
  readonly model: CardAppModel;
  readonly actions: CardAppActions;
}
