export { expandedCardCaseRegistry, thePainThatMovedCardCase, breathlessAfternoonCardCase, scratchyMysteryCardCase, spinningRoomCardCase } from "./caseCatalog";
export type * from "./types";

import { expandedCardCaseRegistry } from "./caseCatalog";
import type { CardCaseContent } from "./types";

export const cardCaseRegistry: readonly CardCaseContent[] = expandedCardCaseRegistry;

export function getCardCaseById(caseId: string): CardCaseContent | undefined {
  return cardCaseRegistry.find((cardCase) => cardCase.caseId === caseId);
}
