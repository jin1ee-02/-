import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PreviewFrame } from '../components/preview/PreviewFrame';
import { colors } from '../components/ui';
import { ChatProvider } from '../state/ChatContext';

export default function RootLayout() {
  return (
    <ChatProvider>
      <PreviewFrame>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
      </PreviewFrame>
    </ChatProvider>
  );
}
