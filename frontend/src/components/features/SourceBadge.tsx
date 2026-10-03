import { StyleSheet, Text } from 'react-native';
import type { FeatureSource } from '../../types/features';
import { colors } from '../ui';

export function SourceBadge({ source }: { source: FeatureSource }) {
  return <Text style={styles.badge}>{source === 'mock' ? '시연용 예시 · AI 분석 없음' : 'AI 분석 결과'}</Text>;
}

const styles = StyleSheet.create({
  badge: { color: colors.muted, fontSize: 10, lineHeight: 14 },
});
