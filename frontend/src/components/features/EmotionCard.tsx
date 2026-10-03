import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import type { AsyncState, EmotionResult } from '../../types/features';
import { colors, ui } from '../ui';
import { SourceBadge } from './SourceBadge';

const stages = [
  { label: '평온', color: '#278864' },
  { label: '주의', color: '#70A96C' },
  { label: '경고', color: '#D4A324' },
  { label: '위험', color: '#DE793C' },
  { label: '폭발', color: '#C85050' },
];

export function EmotionCard({ state, onRetry, onCooldown }: {
  state: AsyncState<EmotionResult>; onRetry: () => void; onCooldown: () => void;
}) {
  const result = state.data;
  return (
    <View style={styles.card}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.label}>나의 감정 온도계</Text>
        {state.status === 'loading' ? <ActivityIndicator color={colors.primary} /> : result ? (
          <Text style={[styles.level, { color: stages[result.level - 1].color }]}>{stages[result.level - 1].label} · {result.level}/5</Text>
        ) : null}
      </View>
      <View style={styles.gauge} accessibilityLabel={result ? `나의 감정 ${stages[result.level - 1].label}, 5단계 중 ${result.level}단계` : '감정 분석 전'}>
        {stages.map((stage, index) => (
          <View key={stage.label} style={{ flex: 1, gap: 5 }}>
            <View style={[styles.segment, { backgroundColor: result && index < result.level ? stage.color : colors.border }]} />
            <Text style={[styles.caption, result?.level === index + 1 && { fontWeight: '800', color: stage.color }]}>{stage.label}</Text>
          </View>
        ))}
      </View>
      {state.status === 'error' ? (
        <Pressable accessibilityRole="button" onPress={onRetry}><Text style={ui.error}>{state.error} · 다시 확인</Text></Pressable>
      ) : result ? (
        <>
          <Text style={styles.caption}>최근 {result.contextCount}개 메시지 · 나(A) · {result.trend === 'up' ? '상승 중 ↑' : result.trend === 'down' ? '낮아지는 중 ↓' : '유지 중 →'}</Text>
          <SourceBadge source={result.source} />
          {result.level >= 3 && <Pressable accessibilityRole="button" onPress={onCooldown} style={styles.notice}><Text style={styles.noticeText}>잠깐 쉬어갈까요? · 쿨다운 →</Text></Pressable>}
        </>
      ) : <Text style={styles.caption}>대화가 시작되면 나(A)의 상태를 표시합니다.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.surface, borderBottomWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
  level: { fontSize: 12, fontWeight: '800' },
  gauge: { flexDirection: 'row', gap: 4 },
  segment: { height: 5, borderRadius: 3 },
  caption: { fontSize: 10, color: colors.muted, lineHeight: 14 },
  notice: { backgroundColor: '#FFF4DD', paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 },
  noticeText: { color: '#825D12', fontSize: 11, fontWeight: '700' },
});
