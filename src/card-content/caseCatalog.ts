import type { CardCaseContent, CardCategory } from "./types";

type SymptomKey =
  | "fever" | "cough" | "runny-nose" | "sore-throat" | "wheezing"
  | "short-breath" | "chest-pain" | "headache" | "dizzy" | "light-sensitive"
  | "nausea" | "vomiting" | "diarrhea" | "belly-pain" | "poor-appetite"
  | "rash" | "itchy-eyes" | "swelling" | "fatigue" | "dehydrated"
  | "urine-clear" | "glucose-normal" | "pulse-normal" | "oxygen-normal";

interface QuestionSpec {
  key: SymptomKey;
  title: string;
  question: string;
  category: Exclude<CardCategory, "special">;
}

const questions: readonly QuestionSpec[] = [
  { key: "fever", title: "Fever?", question: "Does the patient have a fever?", category: "check" },
  { key: "cough", title: "Cough?", question: "Does the patient have a cough?", category: "ask" },
  { key: "runny-nose", title: "Runny nose?", question: "Does the patient have a runny nose?", category: "ask" },
  { key: "sore-throat", title: "Sore throat?", question: "Does the patient have a sore throat?", category: "ask" },
  { key: "wheezing", title: "Wheezing?", question: "Is the patient wheezing?", category: "check" },
  { key: "short-breath", title: "Short of breath?", question: "Is the patient short of breath?", category: "ask" },
  { key: "chest-pain", title: "Chest pain?", question: "Does the patient have chest pain?", category: "ask" },
  { key: "headache", title: "Headache?", question: "Does the patient have a headache?", category: "ask" },
  { key: "dizzy", title: "Dizzy?", question: "Does the patient feel dizzy?", category: "ask" },
  { key: "light-sensitive", title: "Light sensitive?", question: "Does bright light make symptoms worse?", category: "ask" },
  { key: "nausea", title: "Nausea?", question: "Does the patient feel nauseated?", category: "ask" },
  { key: "vomiting", title: "Vomiting?", question: "Has the patient vomited?", category: "ask" },
  { key: "diarrhea", title: "Diarrhea?", question: "Does the patient have diarrhea?", category: "ask" },
  { key: "belly-pain", title: "Belly pain?", question: "Does the patient have belly pain?", category: "ask" },
  { key: "poor-appetite", title: "Poor appetite?", question: "Has the patient lost their appetite?", category: "ask" },
  { key: "rash", title: "Rash?", question: "Does the patient have a rash?", category: "check" },
  { key: "itchy-eyes", title: "Itchy eyes?", question: "Are the patient's eyes itchy?", category: "check" },
  { key: "swelling", title: "Swelling?", question: "Does the patient have unusual swelling?", category: "check" },
  { key: "fatigue", title: "Very tired?", question: "Is the patient unusually tired?", category: "ask" },
  { key: "dehydrated", title: "Dehydrated?", question: "Does the patient show signs of dehydration?", category: "check" },
  { key: "urine-clear", title: "Urine clear?", question: "Is the urine sample clear?", category: "test" },
  { key: "glucose-normal", title: "Blood sugar normal?", question: "Is the blood sugar reading in the expected range?", category: "test" },
  { key: "pulse-normal", title: "Pulse normal?", question: "Is the pulse in the expected range?", category: "test" },
  { key: "oxygen-normal", title: "Oxygen normal?", question: "Is the oxygen reading in the expected range?", category: "test" },
];

const profiles: Readonly<Record<string, readonly SymptomKey[]>> = {
  "Acid reflux": ["cough", "sore-throat", "wheezing", "short-breath", "chest-pain", "nausea", "belly-pain", "poor-appetite", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Allergic reaction": ["cough", "runny-nose", "sore-throat", "wheezing", "short-breath", "chest-pain", "dizzy", "nausea", "vomiting", "diarrhea", "belly-pain", "rash", "itchy-eyes", "swelling", "fatigue", "urine-clear", "glucose-normal"],
  "Appendicitis": ["fever", "headache", "dizzy", "nausea", "vomiting", "diarrhea", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Asthma flare": ["cough", "wheezing", "short-breath", "chest-pain", "dizzy", "fatigue", "urine-clear", "glucose-normal"],
  "Common cold": ["fever", "cough", "runny-nose", "sore-throat", "headache", "poor-appetite", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Contact dermatitis": ["rash", "swelling", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Dehydration": ["headache", "dizzy", "nausea", "vomiting", "diarrhea", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "glucose-normal", "oxygen-normal"],
  "Food intolerance": ["headache", "nausea", "vomiting", "diarrhea", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Heat exhaustion": ["headache", "dizzy", "nausea", "vomiting", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "glucose-normal", "oxygen-normal"],
  "Influenza-like illness": ["fever", "cough", "runny-nose", "sore-throat", "short-breath", "chest-pain", "headache", "dizzy", "nausea", "vomiting", "diarrhea", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal"],
  "Inner-ear vertigo": ["headache", "dizzy", "nausea", "vomiting", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Kidney stone": ["fever", "dizzy", "nausea", "vomiting", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "glucose-normal", "oxygen-normal"],
  "Laryngitis": ["fever", "cough", "runny-nose", "sore-throat", "headache", "poor-appetite", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Low blood sugar": ["headache", "dizzy", "nausea", "vomiting", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "pulse-normal", "oxygen-normal"],
  "Migraine": ["headache", "dizzy", "light-sensitive", "nausea", "vomiting", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Panic attack": ["short-breath", "chest-pain", "headache", "dizzy", "nausea", "belly-pain", "fatigue", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Pneumonia": ["fever", "cough", "runny-nose", "sore-throat", "wheezing", "short-breath", "chest-pain", "headache", "dizzy", "nausea", "vomiting", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal"],
  "Poor sleep": ["headache", "dizzy", "nausea", "poor-appetite", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Seasonal allergies": ["cough", "runny-nose", "sore-throat", "wheezing", "short-breath", "headache", "itchy-eyes", "swelling", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Acute sinusitis": ["fever", "cough", "runny-nose", "sore-throat", "headache", "dizzy", "nausea", "poor-appetite", "swelling", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Viral gastroenteritis": ["fever", "headache", "dizzy", "nausea", "vomiting", "diarrhea", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Strep throat": ["fever", "sore-throat", "headache", "nausea", "vomiting", "belly-pain", "poor-appetite", "rash", "swelling", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Tension headache": ["headache", "dizzy", "nausea", "poor-appetite", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Urinary infection": ["fever", "headache", "dizzy", "nausea", "vomiting", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "glucose-normal", "oxygen-normal"],
};

interface ScenarioSpec {
  slug: string;
  title: string;
  patient: string;
  age: number;
  introduction: string;
  conditions: readonly [string, string, string, string];
}

const DIAGNOSIS_OPTION_COUNT = 8;

function symptomProfileSimilarity(leftName: string, rightName: string): number {
  const left = new Set(profiles[leftName] ?? []);
  const right = new Set(profiles[rightName] ?? []);
  return questions.reduce(
    (score, question) =>
      score + (left.has(question.key) === right.has(question.key) ? 1 : 0),
    0,
  );
}

function symptomProfileSignature(conditionName: string): string {
  const profile = new Set(profiles[conditionName] ?? []);
  return questions
    .map((question) => profile.has(question.key) ? "1" : "0")
    .join("");
}

function expandDiagnosisOptions(
  authoredConditions: ScenarioSpec["conditions"],
): string[] {
  const correctCondition = authoredConditions[0];
  const selected: string[] = [];
  const selectedProfiles = new Set<string>();
  const addIfDistinct = (condition: string) => {
    const signature = symptomProfileSignature(condition);
    if (selectedProfiles.has(signature)) return;
    selected.push(condition);
    selectedProfiles.add(signature);
  };
  authoredConditions.forEach(addIfDistinct);
  Object.keys(profiles)
    .filter((condition) => !selected.includes(condition))
    .sort((left, right) => {
      const similarityDifference =
        symptomProfileSimilarity(correctCondition, right) -
        symptomProfileSimilarity(correctCondition, left);
      return similarityDifference || left.localeCompare(right);
    })
    .forEach((condition) => {
      if (selected.length < DIAGNOSIS_OPTION_COUNT) addIfDistinct(condition);
    });
  return selected;
}

const scenarios: readonly ScenarioSpec[] = [
  { slug: "the-pain-that-moved", title: "The Pain That Moved", patient: "Jordan Lee", age: 19, introduction: "Jordan's stomach pain moved and has become harder to ignore.", conditions: ["Appendicitis", "Viral gastroenteritis", "Urinary infection", "Kidney stone"] },
  { slug: "breathless-afternoon", title: "A Breathless Afternoon", patient: "Sam Rivera", age: 16, introduction: "Sam became short of breath during soccer practice.", conditions: ["Asthma flare", "Pneumonia", "Panic attack", "Allergic reaction"] },
  { slug: "spinning-room", title: "The Spinning Room", patient: "Maya Chen", age: 28, introduction: "Maya says the room suddenly feels as if it is spinning.", conditions: ["Migraine", "Inner-ear vertigo", "Dehydration", "Low blood sugar"] },
  { slug: "scratchy-mystery", title: "The Scratchy Mystery", patient: "Eli Brooks", age: 12, introduction: "Eli woke with a very sore throat and skipped breakfast.", conditions: ["Strep throat", "Common cold", "Seasonal allergies", "Acid reflux"] },
  { slug: "midnight-cough", title: "The Midnight Cough", patient: "Noah Reed", age: 34, introduction: "Noah's cough and tiredness kept him awake overnight.", conditions: ["Pneumonia", "Common cold", "Asthma flare", "Acid reflux"] },
  { slug: "itchy-picnic", title: "The Itchy Picnic", patient: "Avery Stone", age: 22, introduction: "Avery became itchy and uncomfortable after a picnic.", conditions: ["Allergic reaction", "Contact dermatitis", "Seasonal allergies", "Heat exhaustion"] },
  { slug: "long-bus-ride", title: "The Long Bus Ride", patient: "Kai Morgan", age: 17, introduction: "Kai stepped off a long bus ride feeling dizzy and sick.", conditions: ["Dehydration", "Migraine", "Low blood sugar", "Panic attack"] },
  { slug: "racing-heart", title: "The Racing Heart", patient: "Nina Patel", age: 31, introduction: "Nina feels dizzy and says her heart suddenly began racing.", conditions: ["Panic attack", "Dehydration", "Low blood sugar", "Heat exhaustion"] },
  { slug: "tired-student", title: "The Tired Student", patient: "Leo Grant", age: 20, introduction: "Leo has struggled to stay awake and focus all week.", conditions: ["Influenza-like illness", "Common cold", "Poor sleep", "Dehydration"] },
  { slug: "burning-sip", title: "The Burning Sip", patient: "Riley Park", age: 42, introduction: "Riley notices a burning feeling after meals and drinks.", conditions: ["Acid reflux", "Viral gastroenteritis", "Food intolerance", "Panic attack"] },
  { slug: "feverish-night", title: "The Feverish Night", patient: "Owen Bell", age: 26, introduction: "Owen woke feverish, tired, and unsure what started it.", conditions: ["Influenza-like illness", "Pneumonia", "Strep throat", "Urinary infection"] },
  { slug: "side-stitch", title: "The Side Stitch", patient: "Tara Woods", age: 37, introduction: "Tara has sharp pain along one side of her abdomen.", conditions: ["Kidney stone", "Urinary infection", "Appendicitis", "Viral gastroenteritis"] },
  { slug: "foggy-morning", title: "The Foggy Morning", patient: "Ben Ortiz", age: 45, introduction: "Ben feels foggy, shaky, and unsteady this morning.", conditions: ["Low blood sugar", "Dehydration", "Poor sleep", "Migraine"] },
  { slug: "chilly-office", title: "The Chilly Office", patient: "Mia Ross", age: 29, introduction: "Mia feels chilled and congested during her workday.", conditions: ["Common cold", "Influenza-like illness", "Seasonal allergies", "Acute sinusitis"] },
  { slug: "weekend-rash", title: "The Weekend Rash", patient: "June Hall", age: 24, introduction: "June noticed an itchy rash after weekend yard work.", conditions: ["Contact dermatitis", "Allergic reaction", "Seasonal allergies", "Heat exhaustion"] },
  { slug: "heavy-chest", title: "The Heavy Chest", patient: "Theo King", age: 38, introduction: "Theo describes tightness and heaviness in the chest.", conditions: ["Asthma flare", "Panic attack", "Acid reflux", "Pneumonia"] },
  { slug: "upset-stomach", title: "The Upset Stomach", patient: "Ivy Scott", age: 15, introduction: "Ivy has belly pain and cannot decide whether to eat.", conditions: ["Viral gastroenteritis", "Food intolerance", "Appendicitis", "Acid reflux"] },
  { slug: "thirsty-hike", title: "The Thirsty Hike", patient: "Max Young", age: 33, introduction: "Max became dizzy and exhausted near the end of a hike.", conditions: ["Dehydration", "Heat exhaustion", "Low blood sugar", "Panic attack"] },
  { slug: "achy-morning", title: "The Achy Morning", patient: "Ada Price", age: 51, introduction: "Ada woke tired, achy, and generally unwell.", conditions: ["Influenza-like illness", "Common cold", "Dehydration", "Poor sleep"] },
  { slug: "dizzy-checkout", title: "The Dizzy Checkout", patient: "Cal Evans", age: 40, introduction: "Cal became dizzy while waiting in a busy checkout line.", conditions: ["Low blood sugar", "Panic attack", "Dehydration", "Inner-ear vertigo"] },
  { slug: "hoarse-voice", title: "The Hoarse Voice", patient: "Zoe Baker", age: 27, introduction: "Zoe's voice became rough and speaking feels difficult.", conditions: ["Laryngitis", "Common cold", "Acid reflux", "Seasonal allergies"] },
  { slug: "puffy-face", title: "The Puffy Face", patient: "Finn Cooper", age: 18, introduction: "Finn woke with puffiness around the face and eyes.", conditions: ["Allergic reaction", "Acute sinusitis", "Seasonal allergies", "Contact dermatitis"] },
  { slug: "sleepless-headache", title: "The Sleepless Headache", patient: "Eva Ward", age: 36, introduction: "Eva has a stubborn headache after a nearly sleepless night.", conditions: ["Migraine", "Tension headache", "Dehydration", "Poor sleep"] },
  { slug: "rainy-day-sniffles", title: "Rainy Day Sniffles", patient: "Cole Gray", age: 11, introduction: "Cole is sniffling, coughing, and feeling worn out.", conditions: ["Common cold", "Seasonal allergies", "Influenza-like illness", "Acute sinusitis"] },
  { slug: "after-lunch", title: "After Lunch", patient: "Sara James", age: 30, introduction: "Sara developed nausea and belly pain soon after lunch.", conditions: ["Food intolerance", "Viral gastroenteritis", "Acid reflux", "Appendicitis"] },
];

const disclaimer = "Meducktion is a fictional deduction game. It is not medical advice, clinical training, or a diagnostic tool.";

function createCase(spec: ScenarioSpec): CardCaseContent {
  const caseId = `case.${spec.slug}`;
  const isOriginalCase = spec.slug === "the-pain-that-moved";
  const variantId = isOriginalCase ? "variant.classic" : `variant.${spec.slug}.classic`;
  const conditionNames = expandDiagnosisOptions(spec.conditions);
  const originalConditionIds: Readonly<Record<string, string>> = {
    Appendicitis: "diagnosis.appendicitis",
    "Viral gastroenteritis": "diagnosis.gastroenteritis",
    "Urinary infection": "diagnosis.urinary-tract-infection",
    "Kidney stone": "diagnosis.kidney-stone",
  };
  const conditionIds = conditionNames.map((conditionName, index) =>
    isOriginalCase && originalConditionIds[conditionName] !== undefined
      ? originalConditionIds[conditionName]!
      : `diagnosis.${spec.slug}.${index + 1}`,
  );
  const conditionAnswers = conditionNames.map((name) => new Set(profiles[name] ?? []));
  const clues = questions.map((question) => {
    const answer = conditionAnswers[0]!.has(question.key);
    const matching = conditionAnswers.flatMap((profile, index) => profile.has(question.key) === answer ? [conditionIds[index]!] : []);
    const conflicting = conditionIds.filter((id) => !matching.includes(id));
    return {
      id: `clue.${spec.slug}.${question.key}`,
      question: question.question,
      answer: answer ? "yes" as const : "no" as const,
      displayText: `${answer ? "YES" : "NO"} - ${question.question}`,
      expandedText: `This private answer rules possibilities in or out. Compare it with the other answers you collect.`,
      supportsConditionIds: matching,
      conflictsConditionIds: conflicting,
      meaningful: matching.length > 0 && conflicting.length > 0,
    };
  });
  const compatibility = { caseIds: [caseId], variantIds: [variantId] };
  const cards = questions.map((question, index) => ({
    id: `card.${spec.slug}.${question.key}`,
    displayName: question.title,
    category: question.category,
    description: question.question,
    iconKey: `${question.category}-${question.key}`,
    compatibility,
    result: { type: "reveal_clue" as const, clueId: clues[index]!.id },
    visibility: "private" as const,
    duplicatePolicy: "unique_per_deck" as const,
    copies: 1,
    caseValue: clues[index]!.meaningful ? "meaningful" as const : "irrelevant" as const,
    rarity: question.category === "test" ? "uncommon" as const : "common" as const,
  }));
  return {
    schemaVersion: "card-case-v1",
    contentVersion: "6.1.0-medically-approved-profiles.1",
    caseId,
    title: spec.title,
    status: "medicallyApproved",
    patient: { id: isOriginalCase ? "patient.jordan-lee" : `patient.${spec.slug}`, displayName: spec.patient, age: spec.age, pronouns: "they/them", portraitKey: "patient.generic", introduction: spec.introduction },
    disclaimer,
    correctConditionId: conditionIds[0]!,
    conditions: conditionNames.map((displayName, index) => ({ id: conditionIds[index]!, displayName, learnMore: `One possible answer in this fictional mystery.`, iconKey: `condition-${index + 1}` })),
    clues,
    cards,
    variants: [{ id: variantId, displayName: "Classic deduction", startingClueId: clues[0]!.id, initiallyStrongAlternativeId: conditionIds[1]!, especiallyValuableCardIds: cards.filter((_, index) => clues[index]!.meaningful).slice(0, 4).map((card) => card.id) }],
    sharedEvents: [{
      id: `event.${spec.slug}.extra-choice`,
      displayName: "Extra Choice",
      description: "Draw two cards and keep one.",
      effect: { type: "draw_two_keep_one" },
    }],
    clueCollectorSet: clues.filter((clue) => clue.meaningful).slice(0, 4).map((clue) => clue.id),
    educationalExplanation: `${conditionNames[0]} is the authored answer for this specific fictional patient. Another person with the same condition could have a different combination of findings. These simplified findings support gameplay and are not medical advice.`,
  };
}

export const expandedCardCaseRegistry: readonly CardCaseContent[] = scenarios.map(createCase);
export const thePainThatMovedCardCase = expandedCardCaseRegistry[0]!;
export const breathlessAfternoonCardCase = expandedCardCaseRegistry[1]!;
export const spinningRoomCardCase = expandedCardCaseRegistry[2]!;
export const scratchyMysteryCardCase = expandedCardCaseRegistry[3]!;
