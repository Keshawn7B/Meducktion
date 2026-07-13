export type InformationStrength = "broad" | "moderate" | "strong";
export type SymptomCategory =
  | "symptom"
  | "pain-location"
  | "pain-pattern"
  | "exam"
  | "test";

export interface SymptomCard {
  id: string;
  title: string;
  description: string;
  category: SymptomCategory;
  informationStrength: InformationStrength;
}

export interface PatientIdentity {
  id: string;
  displayName: string;
  medicalName?: string;
  family: string;
  cardResults: Record<string, boolean>;
  explanation: string;
}

export interface IdentityCasePack {
  schemaVersion: "identity-pack-v1";
  contentVersion: string;
  id: string;
  title: string;
  description: string;
  status: "draft" | "medicalReviewRequired" | "medicallyApproved";
  startingInformation: string;
  disclaimer: string;
  minimumRevealsBeforeGuess: number;
  identities: PatientIdentity[];
  cards: SymptomCard[];
}

export interface IdentityPackValidationIssue {
  code: string;
  message: string;
}
