import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { FeatureToggle } from '../components/features/FeatureToggle';
import { ActionButton, ui } from '../components/ui';
import { useChat } from '../state/ChatContext';

const relationships = ['친구', '연인', '직장 동료', '룸메이트', '기타'];
const sensitivities = [{ label: '낮음', value: 0.25 }, { label: '보통', value: 0.5 }, { label: '높음', value: 0.75 }];

export default function RoomSettingsScreen() {
  const { relationship, setRelationship, interactionBusy, settings, updateSettings } = useChat();
  return (
    <ScrollView style={ui.page} contentContainerStyle={ui.content}>
      <Text style={ui.eyebrow}>대화방 설정</Text><Text style={ui.title}>더 편안한 대화</Text>
      <View style={ui.card}>
        <View style={[ui.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1 }}><Text style={ui.label}>언어 순화</Text><Text style={ui.subtitle}>전하고 싶은 말을 부드럽게 다듬어요.</Text></View><FeatureToggle title="순화" enabled={settings.purifyEnabled} disabled={interactionBusy} onChange={(enabled) => updateSettings({ purifyEnabled: enabled })} /></View>
        <View style={[ui.row, { justifyContent: 'space-between' }]}><View style={{ flex: 1 }}><Text style={ui.label}>감정 온도계</Text><Text style={ui.subtitle}>대화 속 나의 감정을 돌아봐요.</Text></View><FeatureToggle title="온도계" enabled={settings.thermometerEnabled} disabled={interactionBusy} onChange={(enabled) => updateSettings({ thermometerEnabled: enabled })} /></View>
      </View>
      <View style={ui.card}><Text style={ui.label}>순화 민감도</Text><View style={ui.row}>{sensitivities.map(({ label, value }) => <ActionButton key={value} title={label} secondary={settings.sensitivity !== value} onPress={() => updateSettings({ sensitivity: value })} disabled={interactionBusy} style={{ flex: 1 }} />)}</View><Text style={ui.subtitle}>높음으로 설정하면 대안을 더 자주 제안합니다.</Text></View>
      <View style={ui.card}><Text style={ui.label}>어떤 사이인가요?</Text><Text style={ui.subtitle}>관계에 맞는 표현으로 대화를 이어가요.</Text><View style={[ui.row, { flexWrap: 'wrap' }]}>{relationships.map((value) => <ActionButton key={value} title={`${relationship === value ? '✓ ' : ''}${value}`} secondary={relationship !== value} disabled={interactionBusy} onPress={() => setRelationship(value)} />)}</View></View>
      <ActionButton title="채팅으로 돌아가기" secondary onPress={() => router.replace('/chat')} />
    </ScrollView>
  );
}
