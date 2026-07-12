import { useCardMatch } from "../card-hooks/useCardMatch";
import { CardApp } from "./CardApp";

export function CardGameRoot() {
  const controller = useCardMatch();
  return <CardApp model={controller.model} actions={controller.actions} />;
}
