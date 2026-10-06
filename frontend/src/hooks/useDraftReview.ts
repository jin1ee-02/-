import { useCallback, useEffect, useRef, useState } from 'react';
import { reviewDraft } from '../api/features';
import type { AsyncState, DraftPreviewRequest, DraftReview } from '../types/features';

export function useDraftReview(input: DraftPreviewRequest | null) {
  const [snapshot, setSnapshot] = useState<{ key: string; state: AsyncState<DraftReview> } | null>(null);
  const controller = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cache = useRef<{ key: string; result: DraftReview } | null>(null);
  const key = JSON.stringify(input);
  const state: AsyncState<DraftReview> = !input ? { status: 'idle', data: null, error: '' } : snapshot?.key === key ? snapshot.state : { status: 'loading', data: null, error: '' };

  const check = useCallback(async (force = false, generate = true) => {
    if (!input) return null;
    if (cache.current?.key === key && !force && (!generate || cache.current.result.decision !== 'suggested' || cache.current.result.alternatives.length > 0)) return cache.current.result;
    if (timer.current) clearTimeout(timer.current);
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController;
    setSnapshot({ key, state: { status: 'loading', data: null, error: '' } });
    try {
      const result = await reviewDraft(input, requestController.signal, generate);
      if (!requestController.signal.aborted) {
        cache.current = { key, result };
        setSnapshot({ key, state: { status: 'ready', data: result, error: '' } });
      }
      return result;
    } catch (error) {
      if (!requestController.signal.aborted) {
        setSnapshot({ key, state: { status: 'error', data: null, error: error instanceof Error ? error.message : '표현을 확인하지 못했어요.' } });
      }
      throw error;
    }
  }, [input, key]);

  useEffect(() => {
    if (input) timer.current = setTimeout(() => { check(false, false).catch(() => {}); }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
      controller.current?.abort();
    };
  }, [input, check]);

  return { state, check };
}
