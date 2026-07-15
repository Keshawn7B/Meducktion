import { MultiplayerLobby } from "./MultiplayerLobby";
import { useMultiplayerLobby } from "./useMultiplayerLobby";
import { CardApp } from "../card-app/CardApp";

export function MultiplayerLobbyRoot({ onExit }: { readonly onExit: () => void }) {
  const controller = useMultiplayerLobby(onExit);
  if (controller.match) {
    return <CardApp model={controller.match.model} actions={controller.match.actions} onLeaveMatch={controller.match.leaveMatch} />;
  }
  return <MultiplayerLobby model={controller.model} actions={controller.actions} onExit={onExit} />;
}
