import type { ConversationInput, DeliveryResult, MessageResult, ReceiptResult } from '../types/api';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000').replace(/\/+$/, '');
const configuredMode = process.env.EXPO_PUBLIC_API_MODE ?? 'ai';
if (configuredMode !== 'local' && configuredMode !== 'receipt' && configuredMode !== 'ai') {
  throw new Error('EXPO_PUBLIC_API_MODE는 local, receipt 또는 ai여야 합니다.');
}
export const API_MODE = configuredMode;

let roomToken: string | null = null;
export function setRoomToken(token: string | null) { roomToken = token; }
export function newRequestId() { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`; }

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function requestJson<T>(path: string, payload?: unknown, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener('abort', abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(abort, options.timeoutMs ?? (payload ? 70_000 : 5_000));
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: payload ? 'POST' : 'GET',
      headers: { ...(payload ? { 'Content-Type': 'application/json' } : {}), ...(roomToken ? { Authorization: `Bearer ${roomToken}` } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
      signal: controller.signal,
    });
    if (!response.ok) {
      const body = await response.json().catch(() => null);
      const detail = typeof body?.detail === 'string' ? body.detail : `요청 실패 (${response.status})`;
      throw new ApiError(detail, response.status);
    }
    return await response.json() as T;
  } catch (error) {
    if (options.signal?.aborted) {
      const cancelled = new Error('Request cancelled');
      cancelled.name = 'AbortError';
      throw cancelled;
    }
    if (error instanceof ApiError) throw error;
    if (controller.signal.aborted) {
      throw new ApiError('응답을 기다리는 시간이 초과됐어요. 연결 상태를 확인하고 다시 시도해주세요.');
    }
    throw new ApiError('백엔드에 연결할 수 없어요. 서버 실행 상태와 API 주소를 확인해주세요.');
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener('abort', abort);
  }
}

export async function checkHealth(): Promise<void> {
  const result = await requestJson<{ status: string }>('/health');
  if (result.status !== 'ok') throw new ApiError('서버 상태를 확인할 수 없어요.');
}

export async function deliverMessage(input: ConversationInput): Promise<DeliveryResult> {
  if (API_MODE === 'local') return { mode: 'local' };
  if (API_MODE === 'ai') {
    return { mode: 'ai', data: await requestJson<MessageResult>('/v1/messages/analyze', input) };
  }
  return { mode: 'receipt', data: await requestJson<ReceiptResult>('/v1/demo/messages', input) };
}
