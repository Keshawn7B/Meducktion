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
  "Appendicitis": ["fever", "nausea", "vomiting", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Stomach infection": ["fever", "nausea", "vomiting", "diarrhea", "belly-pain", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Urinary infection": ["fever", "nausea", "belly-pain", "poor-appetite", "fatigue", "glucose-normal", "oxygen-normal"],
  "Kidney stone": ["nausea", "vomiting", "belly-pain", "poor-appetite", "dehydrated", "glucose-normal", "oxygen-normal"],
  "Asthma flare": ["cough", "wheezing", "short-breath", "chest-pain", "glucose-normal"],
  "Pneumonia": ["fever", "cough", "short-breath", "chest-pain", "headache", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal"],
  "Panic episode": ["short-breath", "chest-pain", "dizzy", "nausea", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Allergic reaction": ["wheezing", "short-breath", "rash", "itchy-eyes", "swelling", "urine-clear", "glucose-normal"],
  "Migraine": ["headache", "dizzy", "light-sensitive", "nausea", "vomiting", "poor-appetite", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Inner-ear issue": ["headache", "dizzy", "nausea", "vomiting", "fatigue", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Dehydration": ["headache", "dizzy", "nausea", "poor-appetite", "fatigue", "dehydrated", "glucose-normal", "oxygen-normal"],
  "Low blood sugar": ["headache", "dizzy", "nausea", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "oxygen-normal"],
  "Strep throat": ["fever", "sore-throat", "headache", "nausea", "poor-appetite", "fatigue", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Common cold": ["cough", "runny-nose", "sore-throat", "headache", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Seasonal allergies": ["cough", "runny-nose", "sore-throat", "itchy-eyes", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Acid reflux": ["cough", "sore-throat", "chest-pain", "nausea", "belly-pain", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Influenza-like illness": ["fever", "cough", "runny-nose", "sore-throat", "headache", "nausea", "poor-appetite", "fatigue", "dehydrated", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Heat exhaustion": ["headache", "dizzy", "nausea", "vomiting", "fatigue", "dehydrated", "glucose-normal", "oxygen-normal"],
  "Contact dermatitis": ["rash", "itchy-eyes", "swelling", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Tension headache": ["headache", "dizzy", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Food intolerance": ["nausea", "vomiting", "diarrhea", "belly-pain", "poor-appetite", "dehydrated", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Poor sleep": ["headache", "dizzy", "poor-appetite", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
  "Sinus inflammation": ["fever", "cough", "runny-nose", "sore-throat", "headache", "swelling", "fatigue", "urine-clear", "glucose-normal", "oxygen-normal"],
  "Laryngitis": ["cough", "runny-nose", "sore-throat", "fatigue", "urine-clear", "glucose-normal", "pulse-normal", "oxygen-normal"],
};

interface ScenarioSpec {
  slug: string;
  title: string;
  patient: string;
  age: number;
  introduction: string;
  conditions: readonly [string, string, string, string];
}

const scenarios: readonly ScenarioSpec[] = [
  { slug: "the-pain-that-moved", title: "The Pain That Moved", patient: "Jordan Lee", age: 19, introduction: "Jordan's stomach pain moved and has become harder to ignore.", conditions: ["Appendicitis", "Stomach infection", "Urinary infection", "Kidney stone"] },
  { slug: "breathless-afternoon", title: "A Breathless Afternoon", patient: "Sam Rivera", age: 16, introduction: "Sam became short of breath during soccer practice.", conditions: ["Asthma flare", "Pneumonia", "Panic episode", "Allergic reaction"] },
  { slug: "spinning-room", title: "The Spinning Room", patient: "Maya Chen", age: 28, introduction: "Maya says the room suddenly feels as if it is spinning.", conditions: ["Migraine", "Inner-ear issue", "Dehydration", "Low blood sugar"] },
  { slug: "scratchy-mystery", title: "The Scratchy Mystery", patient: "Eli Brooks", age: 12, introduction: "Eli woke with a very sore throat and skipped breakfast.", conditions: ["Strep throat", "Common cold", "Seasonal allergies", "Acid reflux"] },
  { slug: "midnight-cough", title: "The Midnight Cough", patient: "Noah Reed", age: 34, introduction: "Noah's cough and tiredness kept him awake overnight.", conditions: ["Pneumonia", "Common cold", "Asthma flare", "Acid reflux"] },
  { slug: "itchy-picnic", title: "The Itchy Picnic", patient: "Avery Stone", age: 22, introduction: "Avery became itchy and uncomfortable after a picnic.", conditions: ["Allergic reaction", "Contact dermatitis", "Seasonal allergies", "Heat exhaustion"] },
  { slug: "long-bus-ride", title: "The Long Bus Ride", patient: "Kai Morgan", age: 17, introduction: "Kai stepped off a long bus ride feeling dizzy and sick.", conditions: ["Dehydration", "Migraine", "Low blood sugar", "Panic episode"] },
  { slug: "racing-heart", title: "The Racing Heart", patient: "Nina Patel", age: 31, introduction: "Nina feels dizzy and says her heart suddenly began racing.", conditions: ["Panic episode", "Dehydration", "Low blood sugar", "Heat exhaustion"] },
  { slug: "tired-student", title: "The Tired Student", patient: "Leo Grant", age: 20, introduction: "Leo has struggled to stay awake and focus all week.", conditions: ["Influenza-like illness", "Common cold", "Poor sleep", "Dehydration"] },
  { slug: "burning-sip", title: "The Burning Sip", patient: "Riley Park", age: 42, introduction: "Riley notices a burning feeling after meals and drinks.", conditions: ["Acid reflux", "Stomach infection", "Food intolerance", "Panic episode"] },
  { slug: "feverish-night", title: "The Feverish Night", patient: "Owen Bell", age: 26, introduction: "Owen woke feverish, tired, and unsure what started it.", conditions: ["Influenza-like illness", "Pneumonia", "Strep throat", "Urinary infection"] },
  { slug: "side-stitch", title: "The Side Stitch", patient: "Tara Woods", age: 37, introduction: "Tara has sharp pain along one side of her abdomen.", conditions: ["Kidney stone", "Urinary infection", "Appendicitis", "Stomach infection"] },
  { slug: "foggy-morning", title: "The Foggy Morning", patient: "Ben Ortiz", age: 45, introduction: "Ben feels foggy, shaky, and unsteady this morning.", conditions: ["Low blood sugar", "Dehydration", "Poor sleep", "Migraine"] },
  { slug: "chilly-office", title: "The Chilly Office", patient: "Mia Ross", age: 29, introduction: "Mia feels chilled and congested during her workday.", conditions: ["Common cold", "Influenza-like illness", "Seasonal allergies", "Sinus inflammation"] },
  { slug: "weekend-rash", title: "The Weekend Rash", patient: "June Hall", age: 24, introduction: "June noticed an itchy rash after weekend yard work.", conditions: ["Contact dermatitis", "Allergic reaction", "Seasonal allergies", "Heat exhaustion"] },
  { slug: "heavy-chest", title: "The Heavy Chest", patient: "Theo King", age: 38, introduction: "Theo describes tightness and heaviness in the chest.", conditions: ["Asthma flare", "Panic episode", "Acid reflux", "Pneumonia"] },
  { slug: "upset-stomach", title: "The Upset Stomach", patient: "Ivy Scott", age: 15, introduction: "Ivy has belly pain and cannot decide whether to eat.", conditions: ["Stomach infection", "Food intolerance", "Appendicitis", "Acid reflux"] },
  { slug: "thirsty-hike", title: "The Thirsty Hike", patient: "Max Young", age: 33, introduction: "Max became dizzy and exhausted near the end of a hike.", conditions: ["Dehydration", "Heat exhaustion", "Low blood sugar", "Panic episode"] },
  { slug: "achy-morning", title: "The Achy Morning", patient: "Ada Price", age: 51, introduction: "Ada woke tired, achy, and generally unwell.", conditions: ["Influenza-like illness", "Common cold", "Dehydration", "Poor sleep"] },
  { slug: "dizzy-checkout", title: "The Dizzy Checkout", patient: "Cal Evans", age: 40, introduction: "Cal became dizzy while waiting in a busy checkout line.", conditions: ["Low blood sugar", "Panic episode", "Dehydration", "Inner-ear issue"] },
  { slug: "hoarse-voice", title: "The Hoarse Voice", patient: "Zoe Baker", age: 27, introduction: "Zoe's voice became rough and speaking feels difficult.", conditions: ["Laryngitis", "Common cold", "Acid reflux", "Seasonal allergies"] },
  { slug: "puffy-face", title: "The Puffy Face", patient: "Finn Cooper", age: 18, introduction: "Finn woke with puffiness around the face and eyes.", conditions: ["Allergic reaction", "Sinus inflammation", "Seasonal allergies", "Contact dermatitis"] },
  { slug: "sleepless-headache", title: "The Sleepless Headache", patient: "Eva Ward", age: 36, introduction: "Eva has a stubborn headache after a nearly sleepless night.", conditions: ["Migraine", "Tension headache", "Dehydration", "Poor sleep"] },
  { slug: "rainy-day-sniffles", title: "Rainy Day Sniffles", patient: "Cole Gray", age: 11, introduction: "Cole is sniffling, coughing, and feeling worn out.", conditions: ["Common cold", "Seasonal allergies", "Influenza-like illness", "Sinus inflammation"] },
  { slug: "after-lunch", title: "After Lunch", patient: "Sara James", age: 30, introduction: "Sara developed nausea and belly pain soon after lunch.", conditions: ["Food intolerance", "Stomach infection", "Acid reflux", "Appendicitis"] },
];

const disclaimer = "Meducktion is a fictional deduction game. It is not medical advice, clinical training, or a diagnostic tool.";

function createCase(spec: ScenarioSpec): CardCaseContent {
  const caseId = `case.${spec.slug}`;
  const isOriginalCase = spec.slug === "the-pain-that-moved";
  const variantId = isOriginalCase ? "variant.classic" : `variant.${spec.slug}.classic`;
  const conditionIds = isOriginalCase
    ? ["diagnosis.appendicitis", "diagnosis.gastroenteritis", "diagnosis.urinary-tract-infection", "diagnosis.kidney-stone"]
    : spec.conditions.map((_, index) => `diagnosis.${spec.slug}.${index + 1}`);
  const conditionAnswers = spec.conditions.map((name) => new Set(profiles[name] ?? []));
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
    contentVersion: "5.0.0-race-deduction-draft.1",
    caseId,
    title: spec.title,
    status: "medicalReviewRequired",
    patient: { id: isOriginalCase ? "patient.jordan-lee" : `patient.${spec.slug}`, displayName: spec.patient, age: spec.age, pronouns: "they/them", portraitKey: "patient.generic", introduction: spec.introduction },
    disclaimer,
    correctConditionId: conditionIds[0]!,
    conditions: spec.conditions.map((displayName, index) => ({ id: conditionIds[index]!, displayName, learnMore: `One possible answer in this fictional mystery.`, iconKey: `condition-${index + 1}` })),
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
    educationalExplanation: `${spec.conditions[0]} is the authored answer. This draft case requires medical and playtest review before release.`,
  };
}

export const expandedCardCaseRegistry: readonly CardCaseContent[] = scenarios.map(createCase);
export const thePainThatMovedCardCase = expandedCardCaseRegistry[0]!;
export const breathlessAfternoonCardCase = expandedCardCaseRegistry[1]!;
export const spinningRoomCardCase = expandedCardCaseRegistry[2]!;
export const scratchyMysteryCardCase = expandedCardCaseRegistry[3]!;
