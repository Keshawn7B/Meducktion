import type {
  ActionDefinition,
  CaseDefinition,
  ClueDefinition,
  DiagnosisDefinition,
  EvidenceCategory,
  EvidenceReliability,
  EvidenceStrength,
  EvidenceTiming,
} from "../schemas/caseTypes";
import { CURRENT_CASE_SCHEMA_VERSION } from "../schemas/schemaVersion";

const APP = "diagnosis.appendicitis";
const GE = "diagnosis.gastroenteritis";
const UTI = "diagnosis.urinary-tract-infection";
const STONE = "diagnosis.kidney-stone";
const NSAP = "diagnosis.nonspecific-abdominal-pain";
const diagnosisIds = [APP, GE, UTI, STONE, NSAP];

const diagnoses: DiagnosisDefinition[] = [
  { id: APP, displayName: "Acute appendicitis", plainLanguageDescription: "Inflammation of the appendix in this fictional case.", dangerLevel: "high", mustExclude: true, timeSensitive: true },
  { id: GE, displayName: "Gastroenteritis", plainLanguageDescription: "Inflammation affecting the stomach and intestines.", dangerLevel: "moderate", mustExclude: false, timeSensitive: false },
  { id: UTI, displayName: "Urinary tract infection", plainLanguageDescription: "An infection involving part of the urinary tract.", dangerLevel: "moderate", mustExclude: false, timeSensitive: false },
  { id: STONE, displayName: "Kidney stone", plainLanguageDescription: "A solid deposit that may cause severe urinary-tract pain.", dangerLevel: "high", mustExclude: true, timeSensitive: false },
  { id: NSAP, displayName: "Nonspecific abdominal pain", plainLanguageDescription: "Abdominal pain without a more specific authored explanation.", dangerLevel: "low", mustExclude: false, timeSensitive: false },
];

function clue(
  id: string,
  displayText: string,
  category: EvidenceCategory,
  strength: EvidenceStrength,
  reliability: EvidenceReliability,
  timing: EvidenceTiming,
  initiallyVisible: boolean,
  supports: string[],
  conflicts: string[],
  explanation: string,
  redFlag = false,
): ClueDefinition {
  return {
    id,
    displayText,
    category,
    strength,
    reliability,
    timing,
    initiallyVisible,
    relationships: [
      ...supports.map((diagnosisId) => ({ diagnosisId, direction: "supports" as const })),
      ...conflicts.map((diagnosisId) => ({ diagnosisId, direction: "conflicts" as const })),
      ...diagnosisIds.filter((diagnosisId) => !supports.includes(diagnosisId) && !conflicts.includes(diagnosisId))
        .map((diagnosisId) => ({ diagnosisId, direction: "unresolved" as const })),
    ],
    redFlag: redFlag ? { isRedFlag: true, severity: "serious", guidedSafetyText: "Treat this as a safety warning in the full case context." } : { isRedFlag: false },
    guidedExplanation: { short: explanation },
  };
}

const clues: ClueDefinition[] = [
  clue("clue.pain-started-central", "Pain began near the center of the abdomen.", "history", "moderate", "high", "beforeArrival", true, [APP, GE, NSAP], [], "Several causes remain possible at the start."),
  clue("clue.heart-rate-104", "Heart rate is 104.", "vitalSign", "weak", "high", "arrival", true, [APP, GE, UTI], [NSAP], "A fast pulse signals illness or distress but is nonspecific."),
  clue("clue.temperature-38", "Temperature is 38.0°C.", "vitalSign", "moderate", "high", "arrival", true, [APP, GE, UTI], [STONE, NSAP], "Fever supports inflammation or infection.", true),
  clue("clue.nausea", "Jordan reports nausea.", "symptom", "weak", "high", "arrival", true, [APP, GE, STONE], [UTI, NSAP], "Nausea occurs in several candidates."),
  clue("clue.pain-migrated-lower-right", "Pain moved toward the lower-right abdomen.", "history", "strong", "high", "immediate", false, [APP], [GE, UTI, STONE, NSAP], "The movement and final location form a meaningful pattern.", true),
  clue("clue.loss-of-appetite", "Jordan has lost their appetite.", "symptom", "moderate", "high", "immediate", false, [APP], [UTI, STONE], "This reinforces, but does not prove, the leading pattern."),
  clue("clue.no-diarrhea", "Jordan has not had diarrhea.", "history", "moderate", "high", "immediate", false, [APP, UTI, STONE], [GE], "Absence of diarrhea weakens the authored gastroenteritis alternative."),
  clue("clue.no-urinary-symptoms", "Jordan reports no burning or increased urinary frequency.", "history", "moderate", "high", "immediate", false, [APP, GE, NSAP], [UTI], "This weighs against the urinary-infection alternative."),
  clue("clue.lower-right-tenderness", "Tenderness is localized to the lower-right abdomen.", "examination", "strong", "high", "immediate", false, [APP], [GE, UTI, NSAP], "Localized findings focus the differential.", true),
  clue("clue.mild-guarding", "Mild guarding is present.", "examination", "strong", "moderate", "immediate", false, [APP], [GE, UTI, NSAP], "Guarding is a safety warning and needs context.", true),
  clue("clue.mild-dehydration", "Findings suggest mild dehydration.", "examination", "weak", "moderate", "immediate", false, [APP, GE], [], "Useful for supportive care; weak for diagnosis."),
  clue("clue.white-count-elevated", "Simulated blood count shows an elevated white-cell count.", "laboratory", "moderate", "high", "delayed", false, [APP, GE, UTI], [STONE, NSAP], "Inflammation is present, but the source still matters."),
  clue("clue.neutrophil-pattern", "Simulated result shows a neutrophil-predominant pattern.", "laboratory", "moderate", "high", "delayed", false, [APP, UTI], [GE, STONE, NSAP], "This adds weight when combined with history and examination."),
  clue("clue.urinalysis-no-infection-support", "Urinalysis does not strongly support urinary infection.", "laboratory", "moderate", "high", "delayed", false, [APP, GE, STONE, NSAP], [UTI], "The result weakens UTI without claiming absolute exclusion."),
  clue("clue.urinalysis-no-stone-support", "Urinalysis does not strongly support the authored kidney-stone alternative.", "laboratory", "weak", "moderate", "delayed", false, [APP, GE, UTI, NSAP], [STONE], "This weakens the authored stone pattern, not every real stone."),
  clue("clue.ultrasound-consistent-appendicitis", "Simulated ultrasound findings are consistent with appendicitis.", "imaging", "defining", "high", "delayed", false, [APP], [GE, UTI, STONE, NSAP], "Strong authored evidence, interpreted with the full case.", true),
  clue("clue.vitals-remain-elevated", "Fever and heart rate remain elevated.", "vitalSign", "moderate", "high", "intervalDependent", false, [APP, GE, UTI], [NSAP], "Persistent abnormal signs increase concern.", true),
  clue("clue.vitals-worsening", "Vital signs are worsening as stability falls.", "vitalSign", "strong", "high", "intervalDependent", false, [APP], [NSAP], "Delay is becoming unsafe; act on the overall pattern.", true),
  clue("clue.pain-remains-localized", "Pain remains focused in the lower-right abdomen.", "symptom", "strong", "high", "intervalDependent", false, [APP], [GE, UTI, NSAP], "Persistent localization strengthens the leading pattern.", true),
  clue("clue.pain-and-guarding-worsening", "Pain and guarding are worsening.", "symptom", "strong", "high", "intervalDependent", false, [APP], [GE, UTI, NSAP], "This is a late safety warning.", true),
  clue("clue.fluids-response", "Stability improves modestly after supportive fluids.", "treatmentResponse", "weak", "high", "immediate", false, [APP, GE, UTI, STONE], [], "Response supports hydration needs, not a single diagnosis."),
  clue("clue.symptom-support-response", "Symptoms improve briefly with support.", "treatmentResponse", "weak", "moderate", "immediate", false, diagnosisIds, [], "Comfort improvement does not resolve the cause."),
  clue("clue.progressive-peritoneal-irritation", "Worsening localized inflammation causes acute deterioration.", "complication", "strong", "high", "intervalDependent", false, [APP], [GE, UTI, STONE, NSAP], "The warned delay-related complication has occurred.", true),
];

const noRepeat = { type: "never" } as const;
const oncePerInterval = { type: "oncePerInterval" } as const;
const reject = "rejectBeforeLock" as const;
const hint = (short: string) => ({ short });
const reveal = (...clueIds: string[]) => ({ type: "revealClues" as const, clueIds });

const actions: ActionDefinition[] = [
  { id: "action.history.pain-onset", displayName: "Ask how the pain began", category: "interview", focusCost: 1, careBudgetCost: 0, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("The sequence of symptoms can matter."), efficiency: "lowValue", result: reveal("clue.pain-started-central") },
  { id: "action.history.pain-movement", displayName: "Ask whether the pain moved", category: "interview", focusCost: 1, careBudgetCost: 0, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("A changing pain location may separate alternatives."), efficiency: "highValue", result: reveal("clue.pain-migrated-lower-right") },
  { id: "action.history.appetite", displayName: "Ask about appetite", category: "interview", focusCost: 1, careBudgetCost: 0, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("Associated symptoms can reinforce a pattern."), efficiency: "reasonable", result: reveal("clue.loss-of-appetite") },
  { id: "action.history.diarrhea", displayName: "Ask about diarrhea", category: "interview", focusCost: 1, careBudgetCost: 0, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("This may test the stomach-infection alternative."), efficiency: "highValue", result: reveal("clue.no-diarrhea") },
  { id: "action.history.urinary-symptoms", displayName: "Ask about urinary symptoms", category: "interview", focusCost: 1, careBudgetCost: 0, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("Compare urinary and abdominal explanations."), efficiency: "reasonable", result: reveal("clue.no-urinary-symptoms") },
  { id: "action.examination.focused-abdomen", displayName: "Focused abdominal examination", category: "examination", patientBurden: "mild", focusCost: 1, careBudgetCost: 0, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("A focused examination may reveal location and warning signs."), efficiency: "highValue", result: reveal("clue.lower-right-tenderness", "clue.mild-guarding") },
  { id: "action.examination.hydration", displayName: "Hydration assessment", category: "examination", patientBurden: "none", focusCost: 1, careBudgetCost: 0, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("Useful for support, but may not distinguish the diagnosis."), efficiency: "lowValue", result: reveal("clue.mild-dehydration") },
  { id: "action.monitoring.vital-signs", displayName: "Repeat vital signs", category: "monitoring", focusCost: 1, careBudgetCost: 0, repeatRule: oncePerInterval, duplicateBehavior: reject, guidedHint: hint("Trends show safety, not necessarily the cause."), efficiency: "reasonable", result: { type: "revealCluesByInterval", ranges: [{ fromInterval: 1, toInterval: 3, clueIds: ["clue.vitals-remain-elevated"] }, { fromInterval: 4, toInterval: 5, clueIds: ["clue.vitals-worsening"] }] } },
  { id: "action.monitoring.pain", displayName: "Reassess pain", category: "monitoring", focusCost: 1, careBudgetCost: 0, repeatRule: oncePerInterval, duplicateBehavior: reject, guidedHint: hint("Worsening localization can be a warning."), efficiency: "reasonable", result: { type: "revealCluesByInterval", ranges: [{ fromInterval: 1, toInterval: 3, clueIds: ["clue.pain-remains-localized"] }, { fromInterval: 4, toInterval: 5, clueIds: ["clue.pain-and-guarding-worsening"] }] } },
  { id: "test.blood-count", displayName: "Blood count", category: "test", focusCost: 1, careBudgetCost: 2, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("Looks for a systemic inflammatory pattern."), efficiency: "highValue", delayCareIntervals: 1, occupiesMajorTestSlot: true, patientBurden: "low", resultClueIds: ["clue.white-count-elevated", "clue.neutrophil-pattern"], pendingDisplayText: "Blood count pending", caseEndBehavior: "cancelWithoutReveal", result: { type: "delayedTest" } },
  { id: "test.urinalysis", displayName: "Urinalysis", category: "test", focusCost: 1, careBudgetCost: 2, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("May weaken urinary alternatives."), efficiency: "lowValue", delayCareIntervals: 1, occupiesMajorTestSlot: true, patientBurden: "low", resultClueIds: ["clue.urinalysis-no-infection-support", "clue.urinalysis-no-stone-support"], pendingDisplayText: "Urinalysis pending", caseEndBehavior: "cancelWithoutReveal", result: { type: "delayedTest" } },
  { id: "test.abdominal-ultrasound", displayName: "Abdominal ultrasound", category: "test", focusCost: 2, careBudgetCost: 4, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("Potentially strong, but slow and costly."), efficiency: "reasonable", delayCareIntervals: 2, occupiesMajorTestSlot: true, patientBurden: "low", resultClueIds: ["clue.ultrasound-consistent-appendicitis"], pendingDisplayText: "Ultrasound pending", caseEndBehavior: "cancelWithoutReveal", result: { type: "delayedTest" } },
  { id: "treatment.supportive-fluids", displayName: "Supportive fluids", category: "treatment", patientBurden: "low", focusCost: 1, careBudgetCost: 1, repeatRule: { type: "limited", maximumUses: 3, effectsByUse: [4, 2, 0] }, duplicateBehavior: reject, guidedHint: hint("Can protect stability but does not settle the diagnosis."), efficiency: "reasonable", stabilityEffectsByUse: [4, 2, 0], result: reveal("clue.fluids-response") },
  { id: "treatment.symptom-support", displayName: "Symptom support", category: "treatment", patientBurden: "low", focusCost: 1, careBudgetCost: 1, repeatRule: { type: "limited", maximumUses: 3, effectsByUse: [2, 1, 0] }, duplicateBehavior: reject, guidedHint: hint("Comfort support buys little time and does not treat the cause."), efficiency: "lowValue", stabilityEffectsByUse: [2, 1, 0], result: reveal("clue.symptom-support-response") },
  { id: "action.safety.urgent-escalation", displayName: "Urgent escalation", category: "escalation", focusCost: 1, careBudgetCost: 0, repeatRule: noRepeat, duplicateBehavior: reject, guidedHint: hint("Escalate when delay is becoming unsafe."), efficiency: "highValue", stopsDeterioration: true, opensFinalDecision: true, result: { type: "escalateCase" } },
];

const notEscalated = { type: "not", condition: { type: "caseEscalated" } } as const;

export const thePainThatMoved: CaseDefinition = {
  schemaVersion: CURRENT_CASE_SCHEMA_VERSION,
  contentVersion: "1.0.0-draft.1",
  caseId: "case.the-pain-that-moved",
  variantId: "variant.classic",
  status: "medicalReviewRequired",
  assetRevision: 1,
  metadata: {
    title: "The Pain That Moved",
    summary: "A fictional case of evolving abdominal pain and nausea.",
    learningObjectives: ["Combine symptom evolution, focused findings, and alternatives.", "Recognize that safe escalation may matter before every test returns."],
    disclaimer: "Meducktion is a fictional educational game. It is not medical advice, clinical training, or a diagnostic tool. It must not be used to make decisions about real patients.",
    locale: "en-US",
    tags: ["guided", "abdominal-pain", "mvp"],
    medicalReview: {
      status: "medicalReviewRequired",
      authoredBy: "Meducktion content team",
      sources: [],
      reviews: [
        { role: "contentAuthor", status: "approved", notes: "Converted from approved internal paper design." },
        { role: "sourceChecker", status: "pending" },
        { role: "qualifiedMedicalReviewer", status: "pending" },
        { role: "gameplayReviewer", status: "pending" },
        { role: "releaseApprover", status: "pending" },
      ],
      simplifications: ["Results and progression are deterministic for playability.", "Treatment is expressed in broad categories without dosing or procedural instruction."],
    },
    assets: [{ id: "asset.patient.jordan-lee", kind: "patientPortrait", path: "assets/cases/the-pain-that-moved/jordan-lee.webp", assetRevision: 1, altText: "Stylized fictional portrait of Jordan Lee" }],
  },
  patient: { id: "patient.jordan-lee", displayName: "Jordan Lee", age: 20, pronouns: "they/them", chiefComplaint: "Abdominal pain and nausea", presentation: "Pain began centrally and is evolving.", startingStability: 82, maximumRecoverableStability: 82 },
  mode: { supportedModes: ["solo", "practice", "cooperativePrivate"], recommendedCooperativePlayers: 2, maximumCooperativePlayers: 4, focusPerPlayerPerInterval: 2, focusCarriesOver: false, startingCareBudget: 8, careBudgetOwnership: "shared", maximumCareIntervals: 5, maximumPendingMajorTests: 2, caseCallAttemptLimit: 2 },
  diagnoses,
  differential: [
    { diagnosisId: APP, initiallyPlausibleBecause: "Central pain, nausea, and fever.", supportingClueIds: ["clue.pain-migrated-lower-right", "clue.lower-right-tenderness", "clue.mild-guarding", "clue.white-count-elevated", "clue.ultrasound-consistent-appendicitis"], conflictingClueIds: [], guidedExplanation: hint("A leading pattern can emerge from changing pain and focused findings.") },
    { diagnosisId: GE, initiallyPlausibleBecause: "Central pain, nausea, and fever.", supportingClueIds: ["clue.nausea", "clue.mild-dehydration"], conflictingClueIds: ["clue.no-diarrhea", "clue.lower-right-tenderness", "clue.mild-guarding"], guidedExplanation: hint("This becomes weaker as findings localize.") },
    { diagnosisId: UTI, initiallyPlausibleBecause: "Fever and fast pulse.", supportingClueIds: ["clue.temperature-38", "clue.heart-rate-104"], conflictingClueIds: ["clue.no-urinary-symptoms", "clue.urinalysis-no-infection-support"], guidedExplanation: hint("Ask whether the urinary pattern is present.") },
    { diagnosisId: STONE, initiallyPlausibleBecause: "Abdominal pain and nausea.", supportingClueIds: ["clue.nausea"], conflictingClueIds: ["clue.temperature-38", "clue.pain-migrated-lower-right", "clue.urinalysis-no-stone-support"], guidedExplanation: hint("Potentially urgent, but the authored pattern points elsewhere.") },
    { diagnosisId: NSAP, initiallyPlausibleBecause: "Early evidence is incomplete.", supportingClueIds: ["clue.pain-started-central"], conflictingClueIds: ["clue.temperature-38", "clue.pain-migrated-lower-right", "clue.mild-guarding"], guidedExplanation: hint("A fallback label becomes inappropriate when warnings accumulate.") },
  ],
  clues,
  actions,
  nextSteps: [
    { id: "next-step.urgent-surgical-assessment", displayName: "Urgent surgical assessment and hospital management", description: "Escalate for urgent assessment and appropriate hospital management.", urgency: "urgent" },
    { id: "next-step.supportive-observation", displayName: "Supportive observation", description: "Continue supportive observation without urgent escalation.", urgency: "routine" },
  ],
  progression: {
    resolutionOrder: ["validateAndLock", "applyImmediateSafetyAndStabilization", "advanceExistingTestTimers", "resolveInstantActionsAndEnqueueTests", "revealCompletedTests", "applyNaturalProgression", "evaluateWarnings", "evaluateComplications", "clampAndClassifyStability", "openDecision"],
    stages: [
      { interval: 1, id: "stage.early-local-inflammation", displayName: "Early local inflammation", baselineStabilityDelta: -2, conditionalStabilityDeltas: [], spontaneousClueIds: [], warningIds: [], complicationIds: [] },
      { interval: 2, id: "stage.localizing", displayName: "Localizing", baselineStabilityDelta: -4, conditionalStabilityDeltas: [], spontaneousClueIds: [], warningIds: ["warning.reassess-changing-pain"], complicationIds: [] },
      { interval: 3, id: "stage.guarded-progression", displayName: "Guarded progression", baselineStabilityDelta: -6, conditionalStabilityDeltas: [], spontaneousClueIds: [], warningIds: ["warning.guarded-stability", "warning.delay-unsafe"], complicationIds: [] },
      { interval: 4, id: "stage.worsening-with-delay", displayName: "Worsening with delay", baselineStabilityDelta: -8, conditionalStabilityDeltas: [{ id: "delta.interval-4-delay", condition: notEscalated, delta: -4, explanation: "Delay is becoming unsafe." }], spontaneousClueIds: [], warningIds: ["warning.complication-imminent"], complicationIds: [] },
      { interval: 5, id: "stage.late-complicated", displayName: "Late/complicated", baselineStabilityDelta: -10, conditionalStabilityDeltas: [{ id: "delta.interval-5-delay", condition: notEscalated, delta: -6, explanation: "Continued delay worsens the condition." }], spontaneousClueIds: [], warningIds: [], complicationIds: ["complication.progressive-peritoneal-irritation"] },
    ],
    warnings: [
      { id: "warning.reassess-changing-pain", condition: { type: "intervalEquals", value: 2 }, displayText: "The pain pattern may be changing.", guidedText: "Consider reassessing location and alternatives.", severity: "notice" },
      { id: "warning.guarded-stability", condition: { type: "stabilityAtOrBelow", value: 75 }, displayText: "Patient stability is Guarded.", guidedText: "Persistent abnormal signs increase concern.", severity: "warning" },
      { id: "warning.delay-unsafe", condition: { type: "all", conditions: [{ type: "intervalEquals", value: 3 }, notEscalated] }, displayText: "Further delay in the next interval is becoming unsafe.", guidedText: "Review red flags and consider urgent escalation before continuing.", severity: "warning" },
      { id: "warning.complication-imminent", condition: { type: "all", conditions: [{ type: "intervalEquals", value: 4 }, notEscalated] }, displayText: "A serious complication may occur in the next interval.", guidedText: "Urgent escalation can prevent further deterioration.", severity: "critical" },
    ],
    complications: [{ id: "complication.progressive-peritoneal-irritation", displayName: "Progressive localized inflammation", trigger: { type: "all", conditions: [{ type: "intervalEquals", value: 5 }, notEscalated] }, stabilityDelta: -12, revealClueIds: ["clue.progressive-peritoneal-irritation"], preventedBy: { type: "caseEscalated" } }],
    deteriorationStoppingCondition: { type: "caseEscalated" },
    stabilityFloor: 0,
    stabilityCeiling: 82,
    terminalFailureCondition: { type: "stabilityAtOrBelow", value: 0 },
  },
  caseCall: { minimumSupportingClues: 2, minimumEvidenceCategories: 2, requiresAlternativeDiagnosis: true, requiresAlternativeWeakeningEvidence: true, incompleteSubmissionConsumesAttempt: false, firstIncorrectCall: { diagnosisPointsLost: 100, forcedDelayIntervals: 1 }, secondIncorrectCallEndsCase: true, unsafeCallEndsCase: true },
  finalAnswer: { diagnosisId: APP, urgency: "urgent", nextStepId: "next-step.urgent-surgical-assessment", acceptableSupportingClueIds: clues.filter((item) => item.relationships.some((r) => r.diagnosisId === APP && r.direction === "supports")).map((item) => item.id), acceptableAlternativeDiagnosisIds: [GE, UTI, STONE, NSAP] },
  scoring: {
    floor: 0,
    ceiling: 1000,
    rounding: "integersOnly",
    categories: {
      diagnosis: { maximum: 350, correctFirstAttempt: 350, correctAfterOneIncorrect: 250, safeWithoutDiagnosis: 175, firstIncorrectCall: 100 },
      safety: { maximum: 200, stabilityBandsDescending: [{ minimumValue: 76, points: 200 }, { minimumValue: 61, points: 170 }, { minimumValue: 41, points: 120 }, { minimumValue: 26, points: 70 }, { minimumValue: 1, points: 25 }, { minimumValue: 0, points: 0 }] },
      reasoning: { maximum: 150, pointsPerValidSupportingClue: 40, supportingCluePointsMaximum: 80, categoryDiversityPoints: 20, validAlternativePoints: 10, weakeningEvidencePoints: 20, correctClassificationPoints: 20 },
      urgencyAndNextStep: { maximum: 150, urgencyPoints: 75, nextStepPoints: 75, safeEscalationAwardsBoth: true },
      efficiency: { maximum: 100, basePoints: 60, pointsPerUnusedBudget: 5, lowValuePenalty: 10, wastefulPenalty: 20, treatmentActionsExempt: true, allMajorTestsOrderedPenalty: 10 },
      speedAndCoordination: { maximum: 50, pointsByTerminalInterval: { 1: 50, 2: 40, 3: 30, 4: 20, 5: 10 } },
    },
  },
  successfulResolutionPaths: [
    { id: "path.focused-history-exam-lab", description: "Focused history and examination, blood count, stabilization, escalation, and a supported Case Call.", requiredActionIds: ["action.history.pain-movement", "action.examination.focused-abdomen", "test.blood-count", "treatment.supportive-fluids", "action.safety.urgent-escalation"] },
    { id: "path.safe-escalation-without-diagnosis", description: "Protect stability and escalate without claiming a final diagnosis.", requiredActionIds: ["treatment.supportive-fluids", "action.safety.urgent-escalation"] },
  ],
};
