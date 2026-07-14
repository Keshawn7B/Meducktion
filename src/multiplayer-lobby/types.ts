export interface LobbyMemberView {
  readonly uid: string;
  readonly displayName: string;
  readonly isHost: boolean;
  readonly isCurrentPlayer: boolean;
  readonly ready: boolean;
}

export interface MultiplayerLobbyModel {
  readonly screen: "entry" | "room" | "ready";
  readonly busy: boolean;
  readonly operation: "create" | "join" | "ready" | "start" | "leave" | null;
  readonly errorMessage?: string;
  readonly roomCode?: string;
  readonly maximumPlayers: 2 | 3 | 4;
  readonly isHost: boolean;
  readonly currentPlayerReady: boolean;
  readonly canStart: boolean;
  readonly members: readonly LobbyMemberView[];
}

export interface MultiplayerLobbyActions {
  readonly createRoom: (displayName: string, maximumPlayers: 2 | 3 | 4) => Promise<void>;
  readonly joinRoom: (displayName: string, roomCode: string) => Promise<void>;
  readonly toggleReady: () => Promise<void>;
  readonly startLobby: () => Promise<void>;
  readonly leaveRoom: () => Promise<boolean>;
  readonly clearError: () => void;
}

export interface MultiplayerLobbyProps {
  readonly model: MultiplayerLobbyModel;
  readonly actions: MultiplayerLobbyActions;
  readonly onExit: () => void;
}
