import { StyleSheet, Text, View } from 'react-native';
import type { Message } from '../types/api';
import { colors } from './ui';

export function MessageBubble({ message }: { message: Message }) {
  // The presentation keeps user A as the viewer; B simulates the other person.
  const isMine = message.speaker === 'A';
  return (
    <View style={[styles.wrap, { alignItems: isMine ? 'flex-end' : 'flex-start' }]}>
      <Text style={styles.sender}>{isMine ? '나' : '상대'} · 사용자 {message.speaker}</Text>
      <View style={[styles.bubble, isMine && styles.outgoingBubble]}>
        <Text style={styles.text}>{message.text}</Text>
      </View>
      <Text style={[styles.confirmation, { textAlign: isMine ? 'right' : 'left' }]}>
        {message.result.mode === 'ai' ? 'AI 분석 완료' : message.result.mode === 'local' ? '시연 메시지' : '입력 수신 확인'}
        {' · '}{new Date(message.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  // Keep metadata in its own full-width row so it cannot stretch the bubble.
  wrap: { width: '100%', gap: 4 },
  sender: { fontSize: 10, color: colors.muted },
  bubble: {
    maxWidth: '80%',
    backgroundColor: colors.incomingBubble,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  outgoingBubble: { backgroundColor: colors.outgoingBubble, borderColor: colors.outgoingBubble },
  text: { color: colors.ink, fontSize: 13, lineHeight: 20 },
  confirmation: { maxWidth: '100%', fontSize: 9, lineHeight: 13, color: colors.muted },
});
