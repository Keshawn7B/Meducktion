import type { CaseSchemaVersion } from "./schemaVersion";

export type StableId = string;
export type MedicalContentStatus =
  | "draft"
  | "sourceChecked"
  | "medicalReviewRequired"
  | "medicallyApproved"
  | "gameplayTested"
  | "releaseApproved"
  | "retired";

export type ReviewRole =
  | "contentAuthor"
  | "sourceChecker"
  | "qualifiedMedicalReviewer"
  | "gameplayReviewer"
  | "releaseApprover";

export interface ContentSourceReference {
  id: StableId;
  title: string;
  url?: string;
  citation?: string;
  accessedOn?: string;
  notes?: string;
}

export interface ReviewRecord {
  role: ReviewRole;
  status: "pending" | "approved" | "changesRequired";
  reviewerReference?: string;
  reviewedOn?: string;
  notes?: string;
}

export interface MedicalReviewMetadata {
  status: MedicalContentStatus;
  authoredBy: string;
  sources: ContentSourceReference[];
  reviews: ReviewRecord[];
  simplifications: string[];
  lastReviewedOn?: string;
}

export interface AssetReference {
  id: StableId;
  kind: "patientPortrait" | "scene" | "icon" | "audio";
  path: string;
  assetRevision: number;
  altText: string;
  attribution?: string;
}

export interface CaseMetadata {
  title: string;
  tagline?: string;
  summary: string;
  learningObjectives: string[];
  disclaimer: string;
  locale: string;
  tags: string[];
  medicalReview: MedicalReviewMetadata;
  assets: AssetReference[];
}

export interface PatientProfile {
  id: StableId;
  displayName: string;
  age: number;
  pronouns?: string;
  chiefComplaint: string;
  presentation: string;
  startingStability: number;
  maximumRecoverableStability: number;
}

export interface CaseModeConfiguration {
  supportedModes: Array<"solo" | "practice" | "cooperativePrivate">;
  recommendedCooperativePlayers: number;
  maximumCooperativePlayers: number;
  focusPerPlayerPerInterval: number;
  focusCarriesOver: boolean;
  startingCareBudget: number;
  careBudgetOwnership: "shared";
  maximumCareIntervals: number;
  maximumPendingMajorTests: number;
  caseCallAttemptLimit: number;
}

export type UrgencyLevel = "routine" | "prompt" | "urgent" | "emergent";

export interface NextStepDefinition {
  id: StableId;
  displayName: string;
  description: string;
  urgency: UrgencyLevel;
}

export interface GuidedExplanation {
  short: string;
  expanded?: string;
  definitionTerms?: Record<string, string>;
}

export interface DiagnosisDefinition {
  id: StableId;
  displayName: string;
  plainLanguageDescription: string;
  dangerLevel: "low" | "moderate" | "high";
  mustExclude: boolean;
  timeSensitive: boolean;
}

export interface DifferentialEntryDefinition {
  diagnosisId: StableId;
  initiallyPlausibleBecause: string;
  supportingClueIds: StableId[];
  conflictingClueIds: StableId[];
  guidedExplanation: GuidedExplanation;
}

export type EvidenceCategory =
  | "history"
  | "symptom"
  | "vitalSign"
  | "examination"
  | "laboratory"
  | "imaging"
  | "treatmentResponse"
  | "complication";
export type EvidenceStrength = "weak" | "moderate" | "strong" | "defining";
export type EvidenceReliability = "low" | "moderate" | "high";
export type EvidenceTiming = "beforeArrival" | "arrival" | "immediate" | "delayed" | "intervalDependent";
export type EvidenceDirection = "supports" | "conflicts" | "unresolved";

export interface EvidenceRelationship {
  diagnosisId: StableId;
  direction: EvidenceDirection;
}

export interface RedFlagDefinition {
  isRedFlag: boolean;
  severity?: "warning" | "serious" | "critical";
  guidedSafetyText?: string;
}

export interface ClueDefinition {
  id: StableId;
  displayText: string;
  category: EvidenceCategory;
  strength: EvidenceStrength;
  reliability: EvidenceReliability;
  timing: EvidenceTiming;
  initiallyVisible: boolean;
  relationships: EvidenceRelationship[];
  redFlag: RedFlagDefinition;
  guidedExplanation: GuidedExplanation;
}

export type RuleCondition =
  | { type: "intervalAtLeast"; value: number }
  | { type: "intervalEquals"; value: number }
  | { type: "stabilityAtOrBelow"; value: number }
  | { type: "actionCompleted"; actionId: StableId }
  | { type: "actionNotCompleted"; actionId: StableId }
  | { type: "clueRevealed"; clueId: StableId }
  | { type: "testPending"; actionId: StableId }
  | { type: "caseEscalated" }
  | { type: "all"; conditions: RuleCondition[] }
  | { type: "any"; conditions: RuleCondition[] }
  | { type: "not"; condition: RuleCondition };

export type RepeatRule =
  | { type: "never" }
  | { type: "oncePerInterval" }
  | { type: "limited"; maximumUses: number; effectsByUse: number[] };
export type DuplicateBehavior = "rejectBeforeLock";
export type EfficiencyClassification = "highValue" | "reasonable" | "lowValue" | "wasteful";

export interface ActionBase {
  id: StableId;
  displayName: string;
  focusCost: number;
  careBudgetCost: number;
  repeatRule: RepeatRule;
  duplicateBehavior: DuplicateBehavior;
  guidedHint: GuidedExplanation;
  efficiency: EfficiencyClassification;
  prerequisites?: RuleCondition;
  lockoutConditions?: RuleCondition[];
}

export interface RevealResultBehavior {
  type: "revealClues";
  clueIds: StableId[];
}

export interface IntervalRevealResultBehavior {
  type: "revealCluesByInterval";
  ranges: Array<{ fromInterval: number; toInterval: number; clueIds: StableId[] }>;
}

export interface InterviewActionDefinition extends ActionBase {
  category: "interview";
  result: RevealResultBehavior;
}
export interface ExaminationActionDefinition extends ActionBase {
  category: "examination";
  patientBurden: "none" | "mild";
  result: RevealResultBehavior;
}
export interface MonitoringActionDefinition extends ActionBase {
  category: "monitoring";
  result: IntervalRevealResultBehavior;
}
export interface TestActionDefinition extends ActionBase {
  category: "test";
  delayCareIntervals: number;
  occupiesMajorTestSlot: boolean;
  patientBurden: "low" | "moderate" | "high";
  resultClueIds: StableId[];
  pendingDisplayText: string;
  caseEndBehavior: "cancelWithoutReveal";
  result: { type: "delayedTest" };
}
export interface TreatmentActionDefinition extends ActionBase {
  category: "treatment";
  patientBurden: "low" | "moderate";
  stabilityEffectsByUse: number[];
  result: RevealResultBehavior;
}
export interface EscalationActionDefinition extends ActionBase {
  category: "escalation";
  stopsDeterioration: true;
  opensFinalDecision: true;
  result: { type: "escalateCase" };
}

export type ActionDefinition =
  | InterviewActionDefinition
  | ExaminationActionDefinition
  | MonitoringActionDefinition
  | TestActionDefinition
  | TreatmentActionDefinition
  | EscalationActionDefinition;

export interface WarningDefinition {
  id: StableId;
  condition: RuleCondition;
  displayText: string;
  guidedText: string;
  severity: "notice" | "warning" | "critical";
}

export interface ComplicationDefinition {
  id: StableId;
  displayName: string;
  trigger: RuleCondition;
  stabilityDelta: number;
  revealClueIds: StableId[];
  preventedBy: RuleCondition;
}

export interface ConditionalStabilityDelta {
  id: StableId;
  condition: RuleCondition;
  delta: number;
  explanation: string;
}

export interface ProgressionStageDefinition {
  interval: number;
  id: StableId;
  displayName: string;
  baselineStabilityDelta: number;
  conditionalStabilityDeltas: ConditionalStabilityDelta[];
  spontaneousClueIds: StableId[];
  warningIds: StableId[];
  complicationIds: StableId[];
}

export interface ProgressionDefinition {
  resolutionOrder: Array<
    | "validateAndLock"
    | "applyImmediateSafetyAndStabilization"
    | "advanceExistingTestTimers"
    | "resolveInstantActionsAndEnqueueTests"
    | "revealCompletedTests"
    | "applyNaturalProgression"
    | "evaluateWarnings"
    | "evaluateComplications"
    | "clampAndClassifyStability"
    | "openDecision"
  >;
  stages: ProgressionStageDefinition[];
  warnings: WarningDefinition[];
  complications: ComplicationDefinition[];
  deteriorationStoppingCondition: RuleCondition;
  stabilityFloor: number;
  stabilityCeiling: number;
  terminalFailureCondition: RuleCondition;
}

export interface CaseCallRequirements {
  minimumSupportingClues: number;
  minimumEvidenceCategories: number;
  requiresAlternativeDiagnosis: boolean;
  requiresAlternativeWeakeningEvidence: boolean;
  incompleteSubmissionConsumesAttempt: boolean;
  firstIncorrectCall: { diagnosisPointsLost: number; forcedDelayIntervals: number };
  secondIncorrectCallEndsCase: boolean;
  unsafeCallEndsCase: boolean;
}

export interface FinalAnswerDefinition {
  diagnosisId: StableId;
  urgency: UrgencyLevel;
  nextStepId: StableId;
  acceptableSupportingClueIds: StableId[];
  acceptableAlternativeDiagnosisIds: StableId[];
}

export interface ScoreBand {
  minimumValue: number;
  points: number;
}

export interface ScoringConfiguration {
  floor: 0;
  ceiling: 1000;
  rounding: "integersOnly";
  categories: {
    diagnosis: { maximum: 350; correctFirstAttempt: 350; correctAfterOneIncorrect: 250; safeWithoutDiagnosis: 175; firstIncorrectCall: 100 };
    safety: { maximum: 200; stabilityBandsDescending: ScoreBand[] };
    reasoning: {
      maximum: 150;
      pointsPerValidSupportingClue: 40;
      supportingCluePointsMaximum: 80;
      categoryDiversityPoints: 20;
      validAlternativePoints: 10;
      weakeningEvidencePoints: 20;
      correctClassificationPoints: 20;
    };
    urgencyAndNextStep: { maximum: 150; urgencyPoints: 75; nextStepPoints: 75; safeEscalationAwardsBoth: true };
    efficiency: { maximum: 100; basePoints: 60; pointsPerUnusedBudget: 5; lowValuePenalty: 10; wastefulPenalty: 20; treatmentActionsExempt: boolean; allMajorTestsOrderedPenalty: number };
    speedAndCoordination: { maximum: 50; pointsByTerminalInterval: Record<number, number> };
  };
}

export interface CaseDefinition {
  schemaVersion: CaseSchemaVersion;
  contentVersion: string;
  caseId: StableId;
  variantId: StableId;
  status: MedicalContentStatus;
  assetRevision: number;
  metadata: CaseMetadata;
  patient: PatientProfile;
  mode: CaseModeConfiguration;
  diagnoses: DiagnosisDefinition[];
  differential: DifferentialEntryDefinition[];
  clues: ClueDefinition[];
  actions: ActionDefinition[];
  nextSteps: NextStepDefinition[];
  progression: ProgressionDefinition;
  caseCall: CaseCallRequirements;
  finalAnswer: FinalAnswerDefinition;
  scoring: ScoringConfiguration;
  successfulResolutionPaths: Array<{ id: StableId; description: string; requiredActionIds: StableId[] }>;
}
