import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from '../ui';

export function FeatureToggle({ title, enabled, onChange, disabled = false }: {
  title: string; enabled: boolean; onChange: (enabled: boolean) => void; disabled?: boolean;
}) {
  return (
    <Pressable accessibilityRole="switch" accessibilityLabel={title} accessibilityState={{ checked: enabled, disabled }} disabled={disabled} onPress={() => onChange(!enabled)} hitSlop={4} style={({ pressed }) => [styles.box, enabled && { backgroundColor: colors.light }, (disabled || pressed) && { opacity: 0.55 }]}>
      <Text style={styles.title}>{title}</Text>
      <View style={[styles.track, { backgroundColor: enabled ? colors.primary : '#B8C9BD', alignItems: enabled ? 'flex-end' : 'flex-start' }]}><View style={styles.thumb} /></View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  box: { minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6, paddingHorizontal: 9, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignSelf: 'flex-start' },
  title: { fontSize: 11, fontWeight: '700', color: colors.ink },
  track: { width: 28, height: 16, padding: 2, borderRadius: 8, justifyContent: 'center' },
  thumb: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#FFFFFF' },
});
