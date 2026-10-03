import { useEffect, useRef, type KeyboardEvent, type PropsWithChildren } from 'react';
import { createPortal } from 'react-dom';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePreviewOverlayHost } from '../preview/PreviewOverlayContext';
import { PREVIEW_DEVICE } from '../preview/device';
import { colors } from '../ui';

export function FeatureSheet({ visible, title, onClose, children, locked = false }: PropsWithChildren<{
  visible: boolean; title: string; onClose: () => void; locked?: boolean;
}>) {
  const host = usePreviewOverlayHost();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!visible || !host) return;
    const previous = document.activeElement;
    dialog.current?.focus();
    return () => { if (previous instanceof HTMLElement && previous.isConnected) previous.focus(); };
  }, [visible, host]);
  if (!visible || !host) return null;

  function keyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); if (!locked) onClose();
    }
    if (event.key !== 'Tab') return;
    const items = Array.from(dialog.current?.querySelectorAll<HTMLElement>('button, input, textarea, a[href], [tabindex="0"]') ?? []).filter((element) => element.getAttribute('aria-disabled') !== 'true' && !element.hasAttribute('disabled') && element.getClientRects().length > 0);
    const first = items[0]; const last = items[items.length - 1];
    if (!first) { event.preventDefault(); return; }
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) { event.preventDefault(); first.focus(); }
  }

  return createPortal(
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingTop: PREVIEW_DEVICE.topInset, paddingBottom: PREVIEW_DEVICE.bottomInset, boxSizing: 'border-box', background: 'rgba(20, 38, 28, 0.42)' }}>
      <div ref={dialog} role="dialog" aria-label={title} aria-modal="true" tabIndex={-1} onKeyDown={keyDown} style={{ display: 'flex', flexDirection: 'column', maxHeight: '88%', minHeight: 0, overflow: 'hidden', outline: 'none', background: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24 }}>
        <View style={styles.header}><Text style={styles.title}>{title}</Text><Pressable accessibilityRole="button" accessibilityLabel="닫기" disabled={locked} onPress={onClose} hitSlop={8}><Text style={[styles.close, locked && { opacity: 0.4 }]}>닫기</Text></Pressable></View>
        <ScrollView style={{ flexGrow: 0, flexShrink: 1, minHeight: 0 }} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>{children}</ScrollView>
      </div>
    </div>, host,
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16, borderBottomWidth: 1, borderColor: colors.border },
  title: { flex: 1, color: colors.ink, fontSize: 16, fontWeight: '800' },
  close: { color: colors.primary, fontSize: 12, fontWeight: '700', paddingVertical: 8 },
  body: { padding: 16, gap: 12 },
});
