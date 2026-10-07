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

export function EmotionCard({ state, partner, onRetry, onCooldown }: {
  state: AsyncState<EmotionResult>; partner?: EmotionResult | null; onRetry: () => void; onCooldown: () => void;
}) {
  const result = state.data;
  const level = result?.level ?? null;
  return (
    <View style={styles.card}>
      <View style={[ui.row, { justifyContent: 'space-between' }]}>
        <Text style={ui.label}>감정 온도계 · 나</Text>
        {state.status === 'loading' ? <ActivityIndicator color={colors.primary} /> : level ? (
          <Text style={[styles.level, { color: stages[level - 1].color }]}>{stages[level - 1].label} · {level}/5</Text>
        ) : null}
      </View>
      <View style={styles.gauge} accessibilityLabel={level ? `나의 감정 ${stages[level - 1].label}, 5단계 중 ${level}단계` : '감정 단계 미확정'}>
        {stages.map((stage, index) => (
          <View key={stage.label} style={{ flex: 1, gap: 5 }}>
            <View style={[styles.segment, { backgroundColor: level && index < level ? stage.color : colors.border }]} />
            <Text style={[styles.caption, result?.level === index + 1 && { fontWeight: '800', color: stage.color }]}>{stage.label}</Text>
          </View>
        ))}
      </View>
      {state.status === 'error' ? (
        <Pressable accessibilityRole="button" onPress={onRetry}><Text style={ui.error}>{state.error} · 다시 확인</Text></Pressable>
      ) : result ? (
        <>
          <Text style={styles.caption}>최근 {result.contextCount}개 메시지 · 나({result.subject}) · {result.trend === 'up' ? '상승 중 ↑' : result.trend === 'down' ? '낮아지는 중 ↓' : result.trend === 'flat' ? '유지 중 →' : '추세 비교 문맥 부족'}</Text>
          <Text style={styles.caption}>{result.recommendation}</Text>
          {partner ? <Text style={styles.caption}>상대({partner.subject}) · {partner.level ? <Text style={{ fontWeight: '800', color: stages[partner.level - 1].color }}>{stages[partner.level - 1].label} {partner.level}/5</Text> : '판단 보류'}{partner.trend === 'up' ? ' · 상승 중 ↑' : partner.trend === 'down' ? ' · 낮아지는 중 ↓' : ''} · 메시지에 표현된 정도이며 실제 마음과 다를 수 있어요</Text> : null}
          {result.status === 'insufficient_context' ? null : <SourceBadge source={result.source} provider={result.provider} />}
          {level !== null && level >= (result.cooldownLevel ?? 3) && <Pressable accessibilityRole="button" onPress={onCooldown} style={styles.notice}><Text style={styles.noticeText}>잠깐 쉬어갈까요? · 쿨다운 →</Text></Pressable>}
        </>
      ) : <Text style={styles.caption}>대화가 시작되면 나의 표현된 감정 상태를 표시합니다.</Text>}
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
