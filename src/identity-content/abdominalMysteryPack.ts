import type { IdentityCasePack, PatientIdentity, SymptomCard } from "./types";

const cards: SymptomCard[] = [
  ["card.mild-fever", "Mild fever", "The patient has a mild fever.", "symptom", "broad"],
  ["card.low-appetite", "Loss of appetite", "The patient does not feel like eating.", "symptom", "broad"],
  ["card.nausea", "Nausea", "The patient feels nauseated.", "symptom", "broad"],
  ["card.diarrhea", "Diarrhea", "The patient has loose stools.", "symptom", "broad"],
  ["card.constipation", "Constipation", "The patient has difficulty passing stool.", "symptom", "broad"],
  ["card.burning-urination", "Burning urination", "Passing urine causes a burning feeling.", "symptom", "moderate"],
  ["card.central-pain", "Pain near the center", "The pain is near the center of the abdomen.", "pain-location", "broad"],
  ["card.lower-right-pain", "Lower-right pain", "The pain is strongest in the lower-right abdomen.", "pain-location", "moderate"],
  ["card.upper-right-pain", "Upper-right pain", "The pain is strongest in the upper-right abdomen.", "pain-location", "moderate"],
  ["card.flank-pain", "Side or flank pain", "The pain is strongest along the side or back.", "pain-location", "moderate"],
  ["card.pain-moved", "Pain moved", "The pain changed location after it began.", "pain-pattern", "moderate"],
  ["card.pain-waves", "Pain comes in waves", "The pain rises and falls in strong waves.", "pain-pattern", "moderate"],
  ["card.after-eating", "Worse after eating", "Eating makes the discomfort worse.", "pain-pattern", "moderate"],
  ["card.movement-worse", "Worse with movement", "Movement makes the pain feel worse.", "pain-pattern", "broad"],
  ["card.lower-right-tender", "Lower-right tenderness", "The lower-right abdomen is tender on examination.", "exam", "strong"],
  ["card.flank-tender", "Flank tenderness", "The side or back is tender on examination.", "exam", "strong"],
  ["card.blood-urine", "Blood detected in urine", "A urine test detects blood.", "test", "strong"],
  ["card.infection-urine", "Signs of infection in urine", "A urine test shows signs associated with infection.", "test", "strong"],
].map(([id, title, description, category, informationStrength]) => ({
  id,
  title,
  description,
  category,
  informationStrength,
})) as SymptomCard[];

const yes = (...ids: string[]) => new Set(ids);
const identity = (
  id: string,
  displayName: string,
  family: string,
  matching: Set<string>,
  explanation: string,
): PatientIdentity => ({
  id,
  displayName,
  family,
  explanation,
  cardResults: Object.fromEntries(cards.map((card) => [card.id, matching.has(card.id)])),
});

const identities: PatientIdentity[] = [
  identity("identity.early-appendicitis", "Early Appendicitis", "Appendix", yes("card.low-appetite", "card.nausea", "card.central-pain", "card.pain-moved", "card.movement-worse", "card.mild-fever"), "This simplified profile combines early central pain, appetite loss, nausea, and pain that begins to move."),
  identity("identity.typical-appendicitis", "Typical Appendicitis", "Appendix", yes("card.mild-fever", "card.low-appetite", "card.nausea", "card.lower-right-pain", "card.pain-moved", "card.movement-worse", "card.lower-right-tender"), "This simplified profile combines migrating pain with lower-right pain and tenderness."),
  identity("identity.kidney-stone", "Kidney Stone", "Urinary", yes("card.nausea", "card.flank-pain", "card.pain-waves", "card.blood-urine", "card.movement-worse"), "This simplified profile combines wave-like flank pain, nausea, and blood detected in urine."),
  identity("identity.blocked-stone", "Blocked Kidney Stone", "Urinary", yes("card.mild-fever", "card.low-appetite", "card.nausea", "card.flank-pain", "card.pain-waves", "card.flank-tender", "card.blood-urine"), "This simplified profile adds fever and flank tenderness to a stone-like pattern."),
  identity("identity.bladder-infection", "Bladder Infection", "Urinary", yes("card.mild-fever", "card.burning-urination", "card.lower-right-pain", "card.infection-urine", "card.low-appetite"), "This simplified profile centers on urinary burning and urine signs of infection."),
  identity("identity.kidney-infection", "Kidney Infection", "Urinary", yes("card.mild-fever", "card.low-appetite", "card.nausea", "card.burning-urination", "card.flank-pain", "card.flank-tender", "card.infection-urine"), "This simplified profile combines infection signs with fever and flank symptoms."),
  identity("identity.viral-stomach-bug", "Viral Stomach Bug", "Digestive", yes("card.mild-fever", "card.low-appetite", "card.nausea", "card.diarrhea", "card.central-pain", "card.movement-worse"), "This simplified profile combines nausea, diarrhea, low appetite, and broad abdominal discomfort."),
  identity("identity.food-poisoning", "Food Poisoning", "Digestive", yes("card.mild-fever", "card.nausea", "card.diarrhea", "card.central-pain", "card.after-eating", "card.pain-waves"), "This simplified profile emphasizes sudden digestive symptoms and cramping after eating."),
  identity("identity.constipation", "Severe Constipation", "Digestive", yes("card.low-appetite", "card.constipation", "card.central-pain", "card.pain-waves", "card.movement-worse", "card.lower-right-tender"), "This simplified profile combines constipation, appetite change, and cramping abdominal discomfort."),
  identity("identity.gallbladder-attack", "Gallbladder Attack", "Digestive", yes("card.low-appetite", "card.nausea", "card.upper-right-pain", "card.after-eating", "card.pain-waves", "card.movement-worse"), "This simplified profile combines upper-right pain, nausea, and discomfort after eating."),
  identity("identity.stomach-irritation", "Stomach Irritation", "Digestive", yes("card.low-appetite", "card.nausea", "card.constipation", "card.central-pain", "card.upper-right-pain", "card.after-eating", "card.movement-worse", "card.mild-fever"), "This simplified profile emphasizes central or upper abdominal discomfort, nausea, and symptoms related to eating."),
  identity("identity.muscle-strain", "Abdominal Muscle Strain", "Muscle", yes("card.central-pain", "card.lower-right-pain", "card.movement-worse", "card.lower-right-tender", "card.low-appetite"), "This simplified profile emphasizes localized pain and tenderness that worsens with movement."),
];

export const abdominalMysteryPack: IdentityCasePack = {
  schemaVersion: "identity-pack-v1",
  contentVersion: "1.0.0",
  id: "pack.abdominal-mystery",
  title: "The Abdominal Mystery",
  description: "A beginner identity pack about overlapping abdominal symptom patterns.",
  status: "medicalReviewRequired",
  startingInformation: "The patient has recently developed abdominal pain.",
  disclaimer: "Meducktion is educational entertainment, not medical advice or a diagnostic tool. Profiles use simplified game rules and do not represent real diagnostic certainty.",
  minimumRevealsBeforeGuess: 3,
  identities,
  cards,
};
