import type { CaseDefinition, EvidenceDirection, UrgencyLevel } from "../case-content/schemas/caseTypes";

export type GamePhase = "case_intro" | "planning" | "actions_locked" | "resolving" | "results_reveal" | "decision" | "case_complete";
export type Confidence = "unlikely" | "possible" | "plausible" | "leading" | "highlySupported";
export type EngineErrorCode = "INVALID_PHASE" | "UNKNOWN_ACTION" | "INSUFFICIENT_FOCUS" | "INSUFFICIENT_BUDGET" | "DUPLICATE_ACTION" | "ACTION_NOT_REPEATABLE" | "TEST_QUEUE_FULL" | "ACTIONS_NOT_LOCKED" | "INVALID_DIFFERENTIAL" | "UNREVEALED_CLUE" | "INCOMPLETE_CASE_CALL" | "CASE_CALL_ATTEMPTS_EXHAUSTED" | "CASE_ALREADY_COMPLETE" | "INVALID_COMMAND";
export interface EngineError { code: EngineErrorCode; message: string; path?: string; relatedId?: string }
export interface SelectedAction { actionId: string }
export interface PendingTest { id: string; actionId: string; orderedInterval: number; remainingDelay: number; completionInterval: number | null; resultClueIds: string[]; occupiesMajorSlot: boolean }
export interface RevealedClue { clueId: string; revealedInterval: number; sourceId: string }
export interface DifferentialRuntimeEntry { diagnosisId: string; rank: number; confidence: Confidence; evidence: Array<{ clueId: string; direction: EvidenceDirection }>; mustExclude: boolean }
export interface CaseCallSubmission { diagnosisId: string; urgency: UrgencyLevel; nextStepId: string; supportingClueIds: string[]; alternativeDiagnosisId: string; alternativeWeakeningClueId: string; classificationsCorrect?: boolean }
export interface CaseCallRuntime extends CaseCallSubmission { correct: boolean; submittedInterval: number }
export type GameOutcome = "excellent_resolution" | "safe_resolution" | "correct_but_inefficient" | "correct_poor_outcome" | "safe_stabilization_without_diagnosis" | "incorrect_diagnosis" | "critical_failure" | "time_expired_failure";
export interface ScoreRuntimeState { diagnosis: number; safety: number; reasoning: number; urgencyAndNextStep: number; efficiency: number; speedAndCoordination: number; penalties: Array<{ id: string; points: number }>; total: number }
export interface GameEvent { sequence: number; type: string; careInterval: number; relatedIds: string[]; payload: Record<string, unknown> }
export interface GameState {
  caseId: string; variantId: string; schemaVersion: number; contentVersion: string; phase: GamePhase;
  careInterval: number; maximumCareIntervals: number; stability: number; startingStability: number; focusAvailable: number;
  careBudgetRemaining: number; careBudgetSpent: number; selectedActions: SelectedAction[]; lockedActionIds: string[];
  completedActionIds: string[]; actionUseCounts: Record<string, number>; pendingTests: PendingTest[]; revealedClues: RevealedClue[];
  revealedWarningIds: string[]; triggeredComplicationIds: string[]; differential: DifferentialRuntimeEntry[];
  caseCallAttemptsUsed: number; lastCaseCall: CaseCallRuntime | null; escalated: boolean; complete: boolean;
  outcome: GameOutcome | null; score: ScoreRuntimeState | null; eventLog: GameEvent[]; revision: number;
}
export type DifferentialUpdate = Omit<DifferentialRuntimeEntry, "mustExclude">;
export type GameCommand =
  | { type: "START_CASE" } | { type: "SELECT_ACTION"; actionId: string } | { type: "DESELECT_ACTION"; actionId: string }
  | { type: "LOCK_ACTIONS" } | { type: "RESOLVE_INTERVAL" } | { type: "ACKNOWLEDGE_RESULTS" }
  | { type: "UPDATE_DIFFERENTIAL"; entries: DifferentialUpdate[] } | { type: "SUBMIT_CASE_CALL"; caseCall: CaseCallSubmission }
  | { type: "CONTINUE_TO_NEXT_INTERVAL" } | { type: "COMPLETE_ESCALATED_UNRESOLVED" };
export interface TransitionResult { state: GameState; events: GameEvent[]; errors: EngineError[] }
export type { CaseDefinition };
