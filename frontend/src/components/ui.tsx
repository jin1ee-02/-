import { Pressable, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

export const colors = {
  background: '#EDF5EF',
  surface: '#FFFFFF',
  ink: '#1F3028',
  muted: '#6B7E72',
  primary: '#1F7A50',
  light: '#E2F1E7',
  border: '#D5E3D9',
  success: '#1F7A50',
  error: '#A83F4C',
  outgoingBubble: '#FEE500',
  incomingBubble: '#FFFFFF',
};

export function ActionButton({ title, onPress, disabled = false, secondary = false, style, accessibilityLabel }: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={4}
      onPress={onPress}
      style={({ pressed }) => [
        ui.button, secondary && ui.secondaryButton,
        (disabled || pressed) && { opacity: 0.55 }, style,
      ]}
    >
      <Text style={[ui.buttonText, secondary && { color: colors.primary }]}>{title}</Text>
    </Pressable>
  );
}

export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { width: '100%', maxWidth: 440, alignSelf: 'center', padding: 16, gap: 16 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '700', letterSpacing: 1.1 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border, gap: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  button: { backgroundColor: colors.primary, borderRadius: 11, minHeight: 40, paddingHorizontal: 14, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  secondaryButton: { backgroundColor: colors.light },
  buttonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  error: { color: colors.error, fontSize: 13, lineHeight: 20 },
});
