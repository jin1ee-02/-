import { router } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { ActionButton, ui } from '../components/ui';
import { useChat } from '../state/ChatContext';

export default function ChatListScreen() {
  const { messages, relationship } = useChat();
  const lastMessage = messages[messages.length - 1];
  return (
    <ScrollView style={ui.page} contentContainerStyle={ui.content}>
      <Text style={ui.eyebrow}>KU래쪄용 · 중간 발표</Text>
      <Text style={ui.title}>대화의 시작</Text>
      <Text style={ui.subtitle}>서로의 말을 이해하는 채팅을 만들어가요.</Text>
      <View style={ui.card}>
        <Text style={ui.label}>발표용 대화방</Text>
        <Text style={ui.subtitle}>사용자 A · 사용자 B / {relationship}</Text>
        <Text style={ui.subtitle} numberOfLines={2}>{lastMessage?.text ?? '첫 메시지를 입력해보세요.'}</Text>
        <ActionButton title="대화 시작하기 →" onPress={() => router.push('/chat')} />
      </View>
      <View style={ui.card}>
        <Text style={ui.label}>세 가지 기능을 체험해보세요</Text>
        <Text style={ui.subtitle}>언어 순화로 표현을 다듬고, 온도계로 나의 감정을 돌아보세요. 다툼판결에서는 서로의 입장과 다음 대화를 위한 제안을 확인할 수 있어요.</Text>
      </View>
    </ScrollView>
  );
}
