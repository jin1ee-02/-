import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { AsyncState, ReactionEmotion, ReactionResult } from '../../types/features';
import { colors, ui } from '../ui';
import { SourceBadge } from './SourceBadge';

const labels: Record<ReactionEmotion, string> = { neutral: '😐 중립', happy: '🙂 기쁨', sad: '😢 슬픔', angry: '😠 분노', surprised: '😮 놀람', fear: '😟 두려움', disgust: '😣 불쾌', contempt: '🙄 경멸' };

export function ReactionCard({ state, onRetry, compact = false }: { state: AsyncState<ReactionResult>; onRetry: () => void; compact?: boolean }) {
  if (state.status === 'idle') return null;
  const result = state.data;
  return <View style={{ padding: compact ? 0 : 10, gap: 5, backgroundColor: compact ? 'transparent' : colors.light, borderRadius: 10 }}>
    <Text style={ui.eyebrow}>상대 반응 미리보기</Text>
    {state.status === 'loading' ? <View style={ui.row}><ActivityIndicator size="small" color={colors.primary} /><Text style={ui.subtitle}>현재 문장의 반응을 예상하고 있어요…</Text></View> : null}
    {state.status === 'error' ? <Pressable accessibilityRole="button" onPress={onRetry}><Text style={ui.error}>{state.error} · 재시도</Text></Pressable> : null}
    {result ? <>
      {result.status === 'ok' && result.emotion && result.intensity !== null ? <>
        <Text style={ui.label}>{labels[result.emotion]} · 전체 반응 강도 {Math.round(result.intensity * 100)}%</Text>
        <View style={{ height: 4, backgroundColor: colors.border, borderRadius: 2 }}><View style={{ height: 4, width: `${Math.round(result.intensity * 100)}%`, backgroundColor: colors.primary, borderRadius: 2 }} /></View>
        {result.confidence !== null && <Text style={ui.subtitle}>모델 신뢰도 {Math.round(result.confidence * 100)}%</Text>}
      </> : null}
      <Text style={ui.subtitle}>{result.explanation}</Text><SourceBadge source={result.source} provider={result.provider} />
    </> : null}
  </View>;
}
