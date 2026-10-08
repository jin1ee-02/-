import { useEffect, useRef, useState } from 'react';
import { previewReaction } from '../api/features';
import type { AsyncState, ReactionRequest, ReactionResult } from '../types/features';

export function useReactionPreview(input: ReactionRequest | null) {
  const [snapshot, setSnapshot] = useState<{ key: string; state: AsyncState<ReactionResult> } | null>(null);
  const [revision, setRevision] = useState(0);
  const cache = useRef<{ key: string; value: ReactionResult } | null>(null);
  const inputKey = JSON.stringify(input);
  const key = JSON.stringify([inputKey, revision]);
  const state: AsyncState<ReactionResult> = !input ? { status: 'idle', data: null, error: '' } : snapshot?.key === key ? snapshot.state : { status: 'loading', data: null, error: '' };
  useEffect(() => {
    if (!input) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const value = revision === 0 && cache.current?.key === inputKey ? cache.current.value : await previewReaction(input, controller.signal);
        if (!controller.signal.aborted && value.draft_revision === input.draft_revision) {
          cache.current = { key: inputKey, value };
          setSnapshot({ key, state: { status: 'ready', data: value, error: '' } });
        }
      } catch (cause) {
        if (!controller.signal.aborted) setSnapshot({ key, state: { status: 'error', data: null, error: cause instanceof Error ? cause.message : '상대 반응을 확인하지 못했어요.' } });
      }
    }, 1000);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [input, inputKey, key, revision]);
  return { state, retry: () => setRevision((value) => value + 1) };
}
