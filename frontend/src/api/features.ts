import { mockDraftReview, mockEmotion, mockVerdict } from '../mocks/features';
import type { DraftPreviewRequest, DraftReview, EmotionRequest, EmotionResult, VerdictRequest, VerdictResult } from '../types/features';
import type { FeatureScores } from '../types/api';
import { requestJson } from './client';

const configuredSource = process.env.EXPO_PUBLIC_FEATURE_MODE ?? 'mock';
if (configuredSource !== 'mock' && configuredSource !== 'api') throw new Error('EXPO_PUBLIC_FEATURE_MODE는 mock 또는 api여야 합니다.');
export const FEATURE_SOURCE = configuredSource;

function previewDelay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const cancel = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      const error = new Error('Preview cancelled');
      error.name = 'AbortError';
      reject(error);
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    if (signal?.aborted) cancel();
    else signal?.addEventListener('abort', cancel, { once: true });
  });
}

export async function reviewDraft(input: DraftPreviewRequest, signal?: AbortSignal): Promise<DraftReview> {
  if (FEATURE_SOURCE === 'mock') {
    await previewDelay(220, signal);
    return mockDraftReview(input);
  }
  // Current backend supports a single rewrite; sensitivity is not in its schema.
  const { sensitivity: _sensitivity, ...conversation } = input;
  const result = await requestJson<{
    features: FeatureScores; decision: 'rewrite_suggested' | 'below_threshold' | 'low_confidence'; rewritten_text: string | null;
  }>('/v1/drafts/analyze', { ...conversation, suggest_rewrite: true }, { signal });
  if (!result.features || !['rewrite_suggested', 'below_threshold', 'low_confidence'].includes(result.decision)) throw new Error('순화 응답 형식을 확인해주세요.');
  return {
    draft: input.text,
    decision: result.decision === 'rewrite_suggested' ? 'suggested' : result.decision === 'low_confidence' ? 'uncertain' : 'safe',
    alternatives: result.rewritten_text ? [result.rewritten_text] : [],
    explanation: result.features.rationale,
    source: 'api',
  };
}

export async function analyzeMyEmotion(input: EmotionRequest, signal?: AbortSignal): Promise<EmotionResult> {
  if (FEATURE_SOURCE === 'mock') {
    await previewDelay(250, signal);
    return mockEmotion(input);
  }
  // Proposed endpoint: must be agreed and implemented by the backend team.
  const result = await requestJson<Omit<EmotionResult, 'source'>>('/v1/emotions/analyze', input, { signal });
  if (result.subject !== input.speaker || ![1, 2, 3, 4, 5].includes(result.level) || !['up', 'flat', 'down'].includes(result.trend) || typeof result.recommendation !== 'string' || !Number.isInteger(result.contextCount) || result.contextCount < 0) throw new Error('나의 감정 응답 형식을 확인해주세요.');
  return { ...result, source: 'api' };
}

function validateVerdict(result: Omit<VerdictResult, 'source'>): VerdictResult {
  const scores = [result.plaintiff, result.defendant];
  if (typeof result.verdictId !== 'string' || !result.verdictId || !['WWE', 'UFC'].includes(result.mode) ||
      ![result.summary, result.recommendation, result.humor].every((text) => typeof text === 'string') ||
      scores.some((score) => !score || ![score.logic, score.emotionControl, score.evidence].every((value) => Number.isFinite(value) && value >= 0 && value <= 100) || typeof score.strength !== 'string' || typeof score.improvement !== 'string') ||
      !Array.isArray(result.debateLog) || result.debateLog.some((entry) => !entry || !['prosecutor', 'defense', 'factcheck', 'judge'].includes(entry.role) || !Number.isInteger(entry.round) || entry.round < 1 || typeof entry.text !== 'string')) {
    throw new Error('판결 응답 형식을 확인해주세요.');
  }
  return { ...result, source: 'api' };
}

export async function requestVerdict(input: VerdictRequest, signal?: AbortSignal): Promise<VerdictResult> {
  if (FEATURE_SOURCE === 'mock') {
    await previewDelay(2200, signal);
    return mockVerdict(input);
  }
  return validateVerdict(await requestJson<Omit<VerdictResult, 'source'>>('/v1/verdicts', input, { signal, timeoutMs: 120_000 }));
}

export async function appealVerdict(verdictId: string, text: string, snapshot: VerdictRequest, signal?: AbortSignal): Promise<VerdictResult> {
  if (FEATURE_SOURCE === 'mock') {
    await previewDelay(1800, signal);
    return mockVerdict(snapshot, text);
  }
  return validateVerdict(await requestJson<Omit<VerdictResult, 'source'>>(`/v1/verdicts/${encodeURIComponent(verdictId)}/appeals`, { text }, { signal, timeoutMs: 120_000 }));
}
