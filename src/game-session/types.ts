import type { GameCommand, GameEvent, GameState } from "../game-engine";
export const CURRENT_SESSION_VERSION=1 as const;
export interface GameSession{sessionVersion:typeof CURRENT_SESSION_VERSION;sessionId:string;caseId:string;variantId:string;schemaVersion:number;contentVersion:string;commandSequence:number;appliedCommandIds:string[];gameState:GameState}
export interface SessionCommandEnvelope{commandId:string;expectedRevision:number;commandSequence:number;command:GameCommand}
export type SessionErrorCode="DUPLICATE_SEQUENCE"|"INVALID_SEQUENCE"|"REVISION_CONFLICT"|"ENGINE_ERROR"|"MALFORMED_JSON"|"INVALID_SNAPSHOT"|"UNSUPPORTED_SESSION_VERSION"|"UNKNOWN_CASE"|"UNKNOWN_VARIANT"|"SCHEMA_VERSION_MISMATCH"|"CONTENT_VERSION_MISMATCH"|"STORAGE_ERROR";
export interface SessionError{code:SessionErrorCode;message:string;details?:string}
export interface SessionTransitionResult{session:GameSession;events:GameEvent[];duplicate:boolean;error?:SessionError}
export interface SessionStorageAdapter{load(key:string):string|null;save(key:string,value:string):void;remove(key:string):void}
