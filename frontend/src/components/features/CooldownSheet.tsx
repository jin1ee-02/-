import { useState } from 'react';
import { Text, View } from 'react-native';
import type { EmotionResult } from '../../types/features';
import { ActionButton, ui } from '../ui';
import { FeatureSheet } from './FeatureSheet';
import { SourceBadge } from './SourceBadge';

export function CooldownSheet({ visible, emotion, hasDraft, onPause, onRewrite, onOriginal, onClose, onMediate }: {
  visible: boolean; emotion: EmotionResult | null; hasDraft: boolean;
  onPause: () => void; onRewrite: () => void; onOriginal: () => void; onClose: () => void;
  onMediate?: () => Promise<{ text: string; provider: string }>;
}) {
  const [advice, setAdvice] = useState<{ status: 'idle' | 'loading' | 'ready' | 'error'; text: string; provider?: string }>({ status: 'idle', text: '' });
  async function mediate() {
    if (!onMediate || advice.status === 'loading') return;
    setAdvice({ status: 'loading', text: '' });
    try { const result = await onMediate(); setAdvice({ status: 'ready', ...result }); }
    catch (cause) { setAdvice({ status: 'error', text: cause instanceof Error ? cause.message : '제안을 받지 못했어요.' }); }
  }
  return (
    <FeatureSheet visible={visible} title="잠깐 숨을 고르는 시간" onClose={onClose}>
      <Text style={ui.subtitle}>{emotion?.recommendation ?? '보내기 전에 내가 원하는 점을 차분히 정리해보세요.'}</Text>
      {emotion ? <SourceBadge source={emotion.source} /> : null}
      {onMediate ? <ActionButton title={advice.status === 'loading' ? '제안을 준비하고 있어요…' : '중재자의 한마디 받기'} secondary disabled={advice.status === 'loading'} onPress={mediate} /> : null}
      {advice.status === 'ready' ? <View style={[ui.card, { backgroundColor: '#F4F1FB' }]}><Text style={ui.eyebrow}>중립적인 중재 제안</Text><Text style={ui.subtitle}>{advice.text}</Text><SourceBadge source="api" provider={advice.provider} /><Text style={ui.subtitle}>나에게만 보이는 참고용 제안이에요. 대화방에는 전송되지 않습니다.</Text></View> : null}
      {advice.status === 'error' ? <Text style={ui.error}>{advice.text}</Text> : null}
      <ActionButton title="3분 뒤 답장하기" onPress={onPause} />
      <Text style={ui.subtitle}>3분 동안 입력을 보관합니다. 시간이 지나도 자동으로 전송하지 않아요.</Text>
      <ActionButton title="부드럽게 다시 말하기" secondary onPress={onRewrite} />
      <ActionButton title="원문 그대로 보내기" secondary disabled={!hasDraft} onPress={onOriginal} />
      <ActionButton title="대화로 돌아가기" secondary onPress={onClose} />
    </FeatureSheet>
  );
}
