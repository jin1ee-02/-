import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../ui';

export function FeatureSheet({ visible, title, onClose, children, locked = false }: PropsWithChildren<{
  visible: boolean; title: string; onClose: () => void; locked?: boolean;
}>) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => { if (!locked) onClose(); }}>
      <SafeAreaView style={styles.overlay}>
        <KeyboardAvoidingView style={styles.overlayContent} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.sheet}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="닫기" disabled={locked} onPress={onClose} hitSlop={12}><Text style={[styles.close, locked && { opacity: 0.4 }]}>닫기</Text></Pressable>
            </View>
            <ScrollView style={{ flexGrow: 0, flexShrink: 1 }} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>{children}</ScrollView>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20, 38, 28, 0.42)' },
  overlayContent: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 440, maxHeight: '88%', backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: 16, borderBottomWidth: 1, borderColor: colors.border },
  title: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '800' },
  close: { color: colors.primary, fontWeight: '700', paddingVertical: 6 },
  body: { padding: 16, gap: 12 },
});
