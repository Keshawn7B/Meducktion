import { cardCaseRegistry, thePainThatMovedCardCase, type CardCaseContent } from "../card-content";
import { createSeededRandomState, seededChoice } from "../card-game-engine";

export function selectMultiplayerCase(
  seed: string,
  excludedCaseId?: string,
): CardCaseContent {
  const candidates = excludedCaseId
    ? cardCaseRegistry.filter((cardCase) => cardCase.caseId !== excludedCaseId)
    : cardCaseRegistry;
  return seededChoice(candidates, createSeededRandomState(`multiplayer-case:${seed}`))?.value
    ?? candidates[0]
    ?? thePainThatMovedCardCase;
}
