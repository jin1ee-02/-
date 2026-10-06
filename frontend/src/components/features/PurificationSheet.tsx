import { useMemo, useState } from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { newRequestId } from '../../api/client';
import { useReactionPreview } from '../../hooks/useReactionPreview';
import type { AsyncState, DraftPreviewRequest, DraftReview, ReactionRequest, ReactionResult } from '../../types/features';
import { ActionButton, colors, ui } from '../ui';
import { FeatureSheet } from './FeatureSheet';
import { SourceBadge } from './SourceBadge';
import { ReactionCard } from './ReactionCard';

export function PurificationSheet({ visible, original, state, busy, onChoose, onOriginal, onClose, onRetry, input, originalReaction }: {
  visible: boolean; original: string; state: AsyncState<DraftReview>; busy: boolean;
  onChoose: (text: string) => void; onOriginal: () => void; onClose: () => void; onRetry: () => void;
  input?: DraftPreviewRequest | null; originalReaction?: AsyncState<ReactionResult>;
}) {
  const checking = state.status === 'loading';
  const [comparison, setComparison] = useState<{ original: string; text: string } | null>(null);
  const comparisonInput = useMemo<ReactionRequest | null>(() => visible && input && comparison?.original === original ? {
    recent_messages: input.recent_messages, speaker: input.speaker, text: comparison.text, relationship: input.relationship, previous_temperature: input.previous_temperature,
    recipient: input.speaker === 'A' ? 'B' : 'A', draft_revision: newRequestId(),
  } : null, [visible, input, comparison, original]);
  const reaction = useReactionPreview(comparisonInput);
  return (
    <FeatureSheet visible={visible} title="언어 순화 · 표현을 다듬어볼까요?" onClose={onClose} locked={busy}>
      <Text style={ui.subtitle}>원래 하고 싶은 말은 유지하면서 전달할 표현을 직접 선택하세요.</Text>
      <View style={[ui.card, { backgroundColor: '#FFF8E6' }]}><Text style={ui.label}>작성한 문장</Text><Text style={{ color: colors.ink, lineHeight: 23 }}>{original}</Text>{originalReaction && <ReactionCard compact state={originalReaction} onRetry={onRetry} />}</View>
      {checking ? <View style={[ui.row, { padding: 16 }]}><ActivityIndicator color={colors.primary} /><Text style={ui.subtitle}>대안 표현을 확인하고 있어요…</Text></View> : null}
      {state.status === 'error' ? <><Text style={ui.error}>{state.error}</Text><ActionButton title="다시 확인하기" onPress={onRetry} disabled={busy} /></> : null}
      {state.data ? <>
        <SourceBadge source={state.data.source} />
        <Text style={ui.subtitle}>{state.data.explanation}</Text>
        {state.data.alternatives.map((text, index) => <View key={`${index}-${text}`} style={ui.card}><Text style={ui.eyebrow}>대안 {index + 1}</Text><Text style={ui.subtitle}>{text}</Text>{input && <ActionButton title="상대 반응 비교하기" secondary onPress={() => setComparison({ original, text })} disabled={busy || checking} />}{comparison?.original === original && comparison.text === text && <ReactionCard compact state={reaction.state} onRetry={reaction.retry} />}<ActionButton title="이 표현으로 보내기" onPress={() => onChoose(text)} disabled={busy || checking} /></View>)}
        {state.data.decision === 'uncertain' ? <Text style={ui.subtitle}>문맥이 충분하지 않아 대안을 제시하지 않았어요.</Text> : null}
      </> : null}
      <ActionButton title={busy ? '전달 중…' : '원문 그대로 보내기'} secondary onPress={onOriginal} disabled={busy || checking} />
      <ActionButton title="돌아가서 직접 수정하기" secondary onPress={onClose} disabled={busy} />
    </FeatureSheet>
  );
}
