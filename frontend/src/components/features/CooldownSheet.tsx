import { Text } from 'react-native';
import type { EmotionResult } from '../../types/features';
import { ActionButton, ui } from '../ui';
import { FeatureSheet } from './FeatureSheet';
import { SourceBadge } from './SourceBadge';

export function CooldownSheet({ visible, emotion, hasDraft, onPause, onRewrite, onOriginal, onClose }: {
  visible: boolean; emotion: EmotionResult | null; hasDraft: boolean;
  onPause: () => void; onRewrite: () => void; onOriginal: () => void; onClose: () => void;
}) {
  return (
    <FeatureSheet visible={visible} title="잠깐 숨을 고르는 시간" onClose={onClose}>
      <Text style={ui.subtitle}>{emotion?.recommendation ?? '보내기 전에 내가 원하는 점을 차분히 정리해보세요.'}</Text>
      {emotion ? <SourceBadge source={emotion.source} /> : null}
      <ActionButton title="3분 뒤 답장하기" onPress={onPause} />
      <Text style={ui.subtitle}>3분 동안 입력을 보관합니다. 시간이 지나도 자동으로 전송하지 않아요.</Text>
      <ActionButton title="부드럽게 다시 말하기" secondary onPress={onRewrite} />
      <ActionButton title="원문 그대로 보내기" secondary disabled={!hasDraft} onPress={onOriginal} />
      <ActionButton title="대화로 돌아가기" secondary onPress={onClose} />
    </FeatureSheet>
  );
}
