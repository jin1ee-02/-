import { StyleSheet, Text, View } from 'react-native';
import type { SideScore } from '../../types/features';
import { colors, ui } from '../ui';

export function ScoreCard({ title, score, accent = colors.primary }: { title: string; score: SideScore; accent?: string }) {
  const rows = [{ label: '논리력', value: score.logic, reason: score.logicReason }, { label: '감정 조절', value: score.emotionControl, reason: score.emotionControlReason }, { label: '근거', value: score.evidence, reason: score.evidenceReason }];
  return (
    <View style={styles.card}>
      <Text style={[ui.label, { color: accent }]}>{title}</Text>
      {rows.map(({ label, value, reason }) => <View key={label} style={{ gap: 6 }}><View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.subtitle}>{label}</Text><Text style={[ui.label, { color: accent }]}>{value}<Text style={ui.subtitle}> / 100</Text></Text></View><View style={styles.track}><View style={{ height: 7, borderRadius: 4, backgroundColor: accent, width: `${Math.min(100, Math.max(0, value))}%` }} /></View>{reason ? <Text style={styles.reason}>{reason}</Text> : null}</View>)}
      <Text style={ui.eyebrow}>잘 전달한 점</Text><Text style={ui.subtitle}>{score.strength}</Text>
      <Text style={ui.eyebrow}>더 나아질 점</Text><Text style={ui.subtitle}>{score.improvement}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, flexBasis: 175, backgroundColor: colors.surface, borderRadius: 14, padding: 12, gap: 10, borderWidth: 1, borderColor: colors.border },
  track: { height: 7, borderRadius: 4, backgroundColor: colors.border, overflow: 'hidden' },
  reason: { color: colors.muted, fontSize: 11, lineHeight: 16 },
});
