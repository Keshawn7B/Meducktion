export { thePainThatMovedCardCase } from "./thePainThatMovedCardCase";
export type * from "./types";

import { thePainThatMovedCardCase } from "./thePainThatMovedCardCase";
import type { CardCaseContent } from "./types";

export const cardCaseRegistry: readonly CardCaseContent[] = [
  thePainThatMovedCardCase,
];

export function getCardCaseById(caseId: string): CardCaseContent | undefined {
  return cardCaseRegistry.find((cardCase) => cardCase.caseId === caseId);
}
