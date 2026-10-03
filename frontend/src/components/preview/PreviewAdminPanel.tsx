import { useState } from 'react';
import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { API_MODE, API_URL, checkHealth } from '../../api/client';
import { FEATURE_SOURCE } from '../../api/features';
import { DEMO_DRAFT } from '../../mocks/features';
import { useChat } from '../../state/ChatContext';
import { ActionButton, colors, ui } from '../ui';
import { PREVIEW_DEVICE } from './device';

export function PreviewAdminPanel({ scale, fit, onFitChange }: { scale: number; fit: boolean; onFitChange: (value: boolean) => void }) {
  const { messages, speaker, setSpeaker, setDraft, loadDemo, resetConversation, interactionBusy, temperature } = useChat();
  const [connection, setConnection] = useState('연결 확인 전');
  const [checking, setChecking] = useState(false);
  async function connect() {
    setChecking(true);
    try { await checkHealth(); setConnection('서버 응답 확인됨'); }
    catch (cause) { setConnection(cause instanceof Error ? cause.message : '연결 실패'); }
    finally { setChecking(false); }
  }
  return (
    <View style={styles.panel}>
      <Text style={styles.eyebrow}>PRESENTATION TOOLS</Text>
      <Text style={styles.title}>관리자 · 시연 컨트롤</Text>
      <Text style={styles.description}>휴대폰 바깥에서 발표용 대화와 입력 화자를 조작합니다.</Text>
      <View style={styles.section}>
        <Text style={ui.label}>미리보기 크기</Text><Text style={styles.description}>{PREVIEW_DEVICE.name} · 440 × 956</Text>
        <View style={ui.row}><ActionButton title="화면에 맞추기" secondary={!fit} onPress={() => onFitChange(true)} style={{ flex: 1 }} /><ActionButton title="100%" secondary={fit} onPress={() => onFitChange(false)} /></View>
        <Text style={styles.caption}>현재 표시 배율 {Math.round(scale * 100)}%</Text>
      </View>
      <View style={styles.section}>
        <Text style={ui.label}>시연 대화</Text>
        <ActionButton title="예시 대화로 바꾸기" disabled={interactionBusy} onPress={() => { loadDemo(); router.replace('/chat'); }} />
        <ActionButton title="순화 대상 문장 넣기" secondary disabled={interactionBusy} onPress={() => { setSpeaker('A'); setDraft(DEMO_DRAFT); router.replace('/chat'); }} />
        <ActionButton title="대화 초기화" secondary disabled={interactionBusy} onPress={() => { resetConversation(); router.replace('/chat'); }} />
        <Text style={styles.caption}>예시 불러오기는 현재 대화를 교체합니다. 현재 {messages.length}개 메시지</Text>
      </View>
      <View style={styles.section}>
        <Text style={ui.label}>채팅 입력 화자</Text>
        <View style={ui.row}>{(['A', 'B'] as const).map((value) => <ActionButton key={value} title={value === 'A' ? '나 (A)' : '상대 (B)'} secondary={speaker !== value} disabled={interactionBusy} onPress={() => setSpeaker(value)} style={{ flex: 1 }} />)}</View>
        <Text style={styles.caption}>나: 오른쪽 노란 말풍선 · 상대: 왼쪽 흰 말풍선</Text>
      </View>
      <View style={styles.section}>
        <Text style={ui.label}>서버 연결</Text>
        <Text style={styles.caption}>채팅: {API_MODE} · 기능: {FEATURE_SOURCE}</Text><Text style={styles.caption} selectable>{API_URL}</Text>
        <ActionButton title={checking ? '확인 중…' : '백엔드 연결 확인'} secondary disabled={checking || interactionBusy} onPress={connect} />
        <Text accessibilityLiveRegion="polite" style={styles.caption}>{connection}</Text>
        {API_MODE === 'ai' && <Text style={styles.caption}>대화 전체 갈등 점수 {temperature} / 100</Text>}
      </View>
      <Text style={styles.caption}>{FEATURE_SOURCE === 'mock' ? '현재 기능 결과는 프론트 시연 예시입니다.' : '현재 기능은 실제 백엔드 API를 호출합니다.'} 관리자 도구는 웹 미리보기에서만 표시됩니다.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { width: 300, maxWidth: '100%', gap: 10, padding: 20, borderRadius: 22, backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: colors.border },
  eyebrow: { fontSize: 10, fontWeight: '700', letterSpacing: 1.6, color: colors.primary },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  description: { fontSize: 12, lineHeight: 19, color: colors.muted },
  caption: { fontSize: 11, lineHeight: 17, color: colors.muted },
  section: { paddingTop: 14, marginTop: 4, borderTopWidth: 1, borderColor: colors.border, gap: 9 },
});
