import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { deliverMessage } from '../api/client';
import { analyzeMyEmotion } from '../api/features';
import { DEMO_CONVERSATION, DEMO_DRAFT } from '../mocks/features';
import type { Message, Speaker } from '../types/api';
import type { AsyncState, EmotionResult, RoomSettings, VerdictRequest, VerdictResult } from '../types/features';

interface ChatState {
  messages: Message[];
  relationship: string;
  setRelationship: (value: string) => void;
  temperature: number;
  sending: boolean;
  speaker: Speaker;
  setSpeaker: (value: Speaker) => void;
  draft: string;
  setDraft: (value: string) => void;
  demoRevision: number;
  interactionBusy: boolean;
  beginInteraction: () => () => void;
  sendMessage: (text: string, speaker: Speaker) => Promise<void>;
  settings: RoomSettings;
  updateSettings: (patch: Partial<RoomSettings>) => void;
  emotion: AsyncState<EmotionResult>;
  refreshEmotion: () => void;
  loadDemo: () => void;
  resetConversation: () => void;
  cooldownUntil: number | null;
  setCooldownUntil: (value: number | null) => void;
  lastVerdict: { result: VerdictResult; snapshot: VerdictRequest } | null;
  setLastVerdict: (value: { result: VerdictResult; snapshot: VerdictRequest } | null) => void;
}

const ChatContext = createContext<ChatState | undefined>(undefined);

export function ChatProvider({ children }: PropsWithChildren) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [relationship, setRelationship] = useState('친구');
  const [temperature, setTemperature] = useState(0);
  const [sending, setSending] = useState(false);
  const [speaker, setSpeaker] = useState<Speaker>('A');
  const [draft, setDraft] = useState('');
  const [demoRevision, setDemoRevision] = useState(0);
  const [interactionCount, setInteractionCount] = useState(0);
  const [settings, setSettings] = useState<RoomSettings>({ purifyEnabled: true, thermometerEnabled: true, sensitivity: 0.5 });
  const [emotionSnapshot, setEmotionSnapshot] = useState<{ key: string; state: AsyncState<EmotionResult> } | null>(null);
  const [emotionRevision, setEmotionRevision] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [lastVerdict, setLastVerdict] = useState<{ result: VerdictResult; snapshot: VerdictRequest } | null>(null);
  const inFlight = useRef(false);
  const sequence = useRef(0);
  const interactionCountRef = useRef(0);
  const emotionInput = useMemo(() => settings.thermometerEnabled && messages.length > 0 ? {
    speaker: 'A' as const, relationship,
    recent_messages: messages.slice(-10).map(({ speaker, text }) => ({ speaker, text })),
  } : null, [settings.thermometerEnabled, messages, relationship]);
  const emotionKey = JSON.stringify([emotionInput, emotionRevision]);
  const emotion: AsyncState<EmotionResult> = !emotionInput ? { status: 'idle', data: null, error: '' } : emotionSnapshot?.key === emotionKey ? emotionSnapshot.state : { status: 'loading', data: null, error: '' };

  useEffect(() => {
    if (!emotionInput) return;
    const controller = new AbortController();
    analyzeMyEmotion(emotionInput, controller.signal).then((data) => {
      if (!controller.signal.aborted) setEmotionSnapshot({ key: emotionKey, state: { status: 'ready', data, error: '' } });
    }).catch((error) => {
      if (!controller.signal.aborted) setEmotionSnapshot({ key: emotionKey, state: { status: 'error', data: null, error: error instanceof Error ? error.message : '감정을 확인하지 못했어요.' } });
    });
    return () => controller.abort();
  }, [emotionInput, emotionKey]);

  function loadDemo() {
    if (inFlight.current || interactionCountRef.current) return;
    const timestamp = Date.now();
    setMessages(DEMO_CONVERSATION.map((turn, index) => ({
      ...turn, id: `demo-${timestamp}-${index}`, createdAt: new Date(timestamp - (DEMO_CONVERSATION.length - index) * 60_000).toISOString(), result: { mode: 'local' },
    })));
    setRelationship('룸메이트');
    setTemperature(0);
    setSettings((current) => ({ ...current, purifyEnabled: true, thermometerEnabled: true }));
    setCooldownUntil(null);
    setLastVerdict(null);
    setSpeaker('A');
    setDraft(DEMO_DRAFT);
    setDemoRevision((value) => value + 1);
  }

  function resetConversation() {
    if (inFlight.current || interactionCountRef.current) return;
    setMessages([]); setTemperature(0); setCooldownUntil(null); setLastVerdict(null);
    setDraft(''); setSpeaker('A'); setDemoRevision((value) => value + 1);
  }

  function beginInteraction() {
    interactionCountRef.current += 1;
    setInteractionCount((value) => value + 1);
    let finished = false;
    return () => {
      if (finished) return;
      finished = true;
      interactionCountRef.current -= 1;
      setInteractionCount((value) => value - 1);
    };
  }

  async function sendMessage(text: string, speaker: Speaker) {
    const value = text.trim();
    if (!value || value.length > 2000) throw new Error('메시지를 1~2000자로 입력해주세요.');
    if (inFlight.current) throw new Error('이전 메시지의 전달을 기다려주세요.');
    inFlight.current = true;
    setSending(true);
    try {
      const result = await deliverMessage({
        recent_messages: messages.slice(-10).map(({ speaker, text }) => ({ speaker, text })),
        speaker,
        text: value,
        relationship,
        previous_temperature: temperature,
      });
      const message: Message = {
        id: `${Date.now()}-${++sequence.current}`,
        createdAt: new Date().toISOString(),
        speaker,
        text: value,
        result,
      };
      setMessages((current) => [...current, message]);
      if (result.mode === 'ai') setTemperature(result.data.temperature);
    } finally {
      inFlight.current = false;
      setSending(false);
    }
  }

  return (
    <ChatContext.Provider value={{
      messages, relationship, setRelationship, temperature, sending, sendMessage,
      speaker, setSpeaker, draft, setDraft, demoRevision,
      interactionBusy: sending || interactionCount > 0, beginInteraction,
      settings, updateSettings: (patch) => setSettings((current) => ({ ...current, ...patch })),
      emotion, refreshEmotion: () => setEmotionRevision((value) => value + 1), loadDemo, resetConversation,
      cooldownUntil, setCooldownUntil, lastVerdict, setLastVerdict,
    }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('ChatProvider is required');
  return context;
}
