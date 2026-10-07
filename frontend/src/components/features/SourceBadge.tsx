import { StyleSheet, Text } from 'react-native';
import type { FeatureSource } from '../../types/features';
import { colors } from '../ui';

export function SourceBadge({ source, provider }: { source: FeatureSource; provider?: string | null }) {
  // The backend labels its keyword stand-in so it is never presented as a model result.
  const offline = provider?.startsWith('offline');
  return <Text style={styles.badge}>{source === 'mock' ? '시연용 예시 · AI 분석 없음' : offline ? '오프라인 규칙 기반 예시 · LLM 연결 전' : provider === 'prefilter' ? '사전 필터 통과 · 모델 호출 없음' : 'AI 분석 결과'}</Text>;
}

const styles = StyleSheet.create({
  badge: { color: colors.muted, fontSize: 10, lineHeight: 14 },
});
