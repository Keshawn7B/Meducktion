import { MultiplayerLobby } from "./MultiplayerLobby";
import { useMultiplayerLobby } from "./useMultiplayerLobby";

export function MultiplayerLobbyRoot({ onExit }: { readonly onExit: () => void }) {
  const controller = useMultiplayerLobby();
  return <MultiplayerLobby model={controller.model} actions={controller.actions} onExit={onExit} />;
}
