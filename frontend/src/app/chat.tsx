import ChatScreen from '../screens/ChatScreen';
import { useChat } from '../state/ChatContext';

export default function ChatRoute() {
  const { demoRevision } = useChat();
  return <ChatScreen key={demoRevision} />;
}
