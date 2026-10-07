import { requestJson } from './client';
import type { RoomSession, RoomSettings, RoomState, VerdictRequest, VerdictResult } from '../types/features';

export const createRoom = (relationship: string) => requestJson<RoomSession>('/v1/rooms', { relationship });
export const joinRoom = (invite_code: string) => requestJson<RoomSession>('/v1/rooms/join', { invite_code });
export const getRoom = (roomId: string, signal?: AbortSignal) => requestJson<RoomState>(`/v1/rooms/${encodeURIComponent(roomId)}`, undefined, { signal });
export const postMessage = (roomId: string, text: string, request_id: string) => requestJson<RoomState>(`/v1/rooms/${encodeURIComponent(roomId)}/messages`, { text, request_id });
export const saveSettings = (roomId: string, relationship: string, settings: RoomSettings) => requestJson<RoomState>(`/v1/rooms/${encodeURIComponent(roomId)}/settings`, { relationship, settings });
export const requestMediation = (roomId: string) => requestJson<{ text: string; provider: string }>(`/v1/rooms/${encodeURIComponent(roomId)}/mediation`, {});
export const getVerdictHistory = (roomId: string) => requestJson<Omit<VerdictResult, 'source'>[]>(`/v1/rooms/${encodeURIComponent(roomId)}/verdicts`);
export const getSavedVerdict = (verdictId: string, signal?: AbortSignal) => requestJson<{ result: Omit<VerdictResult, 'source'>; snapshot: VerdictRequest }>(`/v1/verdicts/${encodeURIComponent(verdictId)}`, undefined, { signal });
