import { useState } from "react";
import { useCardMatch } from "../card-hooks/useCardMatch";
import { MultiplayerLobbyRoot } from "../multiplayer-lobby";
import { CardApp } from "./CardApp";

export function CardGameRoot() {
  const [lobbyOpen, setLobbyOpen] = useState(false);
  const controller = useCardMatch();
  if (lobbyOpen) {
    return <MultiplayerLobbyRoot onExit={() => setLobbyOpen(false)} />;
  }
  return (
    <CardApp
      model={controller.model}
      actions={controller.actions}
      onOpenMultiplayer={() => setLobbyOpen(true)}
    />
  );
}
