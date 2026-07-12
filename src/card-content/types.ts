export type CardCategory = "ask" | "check" | "test" | "special";
export type CardVisibility = "private" | "public";
export type CardRarity = "common" | "uncommon" | "rare";

export interface CardCompatibility {
  caseIds: string[];
  variantIds?: string[];
}

export type SpecialCardEffect =
  | { type: "draw_two_keep_one" }
  | { type: "swap_one_card" }
  | { type: "repeat_check" }
  | { type: "second_opinion"; clueId: string }
  | { type: "share_clue"; clueId: string };

export type InvestigationCardResult =
  | { type: "reveal_clue"; clueId: string }
  | { type: "special"; effect: SpecialCardEffect };

export interface InvestigationCard {
  id: string;
  displayName: string;
  category: CardCategory;
  description: string;
  iconKey: string;
  compatibility: CardCompatibility;
  result: InvestigationCardResult;
  visibility: CardVisibility;
  duplicatePolicy: "allow" | "unique_per_deck";
  copies: number;
  caseValue: "meaningful" | "irrelevant";
  rarity?: CardRarity;
  beginnerHint?: string;
}

export interface CardClueDefinition {
  id: string;
  displayText: string;
  expandedText: string;
  supportsConditionIds: string[];
  conflictsConditionIds: string[];
  meaningful: boolean;
}

export interface CardConditionDefinition {
  id: string;
  displayName: string;
  learnMore: string;
  iconKey: string;
}

export interface CaseVariant {
  id: string;
  displayName: string;
  startingClueId: string;
  initiallyStrongAlternativeId: string;
  especiallyValuableCardIds: string[];
}

export type SharedEventEffect =
  | { type: "draw_category"; category: "ask" }
  | { type: "replace_one" }
  | { type: "reveal_public_clue"; clueId: string }
  | { type: "draw_two_keep_one" };

export interface SharedEventDefinition {
  id: string;
  displayName: string;
  description: string;
  effect: SharedEventEffect;
}

export interface CardCaseContent {
  schemaVersion: "card-case-v1";
  contentVersion: string;
  caseId: string;
  title: string;
  status: "draft" | "medicalReviewRequired" | "medicallyApproved";
  patient: {
    id: string;
    displayName: string;
    age: number;
    pronouns: string;
    portraitKey: string;
    introduction: string;
  };
  disclaimer: string;
  correctConditionId: string;
  conditions: CardConditionDefinition[];
  clues: CardClueDefinition[];
  cards: InvestigationCard[];
  variants: CaseVariant[];
  sharedEvents: SharedEventDefinition[];
  clueCollectorSet: string[];
  educationalExplanation: string;
}
