import { useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { appealVerdict, FEATURE_SOURCE, requestVerdict } from '../api/features';
import { ScoreCard } from '../components/features/ScoreCard';
import { SourceBadge } from '../components/features/SourceBadge';
import { ActionButton, colors, ui } from '../components/ui';
import { useChat } from '../state/ChatContext';
import type { VerdictMode, VerdictRequest } from '../types/features';

const phases = ['대화와 추가 상황 확인', '검사 · 변호사 의견 정리', '근거와 양쪽 주장 비교', '판결 카드 작성'];
const roles = { prosecutor: '검사', defense: '변호사', factcheck: '팩트체크', judge: '판사' };

export default function VerdictScreen() {
  const { messages, relationship, lastVerdict, setLastVerdict, beginInteraction } = useChat();
  const [stage, setStage] = useState<'form' | 'loading' | 'result' | 'error'>(lastVerdict ? 'result' : 'form');
  const [mode, setMode] = useState<VerdictMode>(lastVerdict?.snapshot.mode ?? 'WWE');
  const [context, setContext] = useState('');
  const [appeal, setAppeal] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [showLog, setShowLog] = useState(false);
  const [showContext, setShowContext] = useState(false);
  const [isAppeal, setIsAppeal] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const running = useRef(false);
  const finishInteraction = useRef<(() => void) | null>(null);
  const lastAttempt = useRef<{ input: VerdictRequest; appealText?: string; verdictId?: string } | null>(null);
  const recent = messages.slice(-10);
  const hasBoth = recent.some((turn) => turn.speaker === 'A') && recent.some((turn) => turn.speaker === 'B');
  const result = lastVerdict?.result;

  useEffect(() => () => { controller.current?.abort(); finishInteraction.current?.(); }, []);
  useEffect(() => {
    if (stage !== 'loading' || FEATURE_SOURCE !== 'mock') return;
    const timer = setInterval(() => setStep((current) => Math.min(current + 1, phases.length - 1)), 500);
    return () => clearInterval(timer);
  }, [stage]);

  async function run(input: VerdictRequest, appealText?: string, verdictId?: string) {
    if (running.current) return;
    controller.current?.abort();
    const requestController = new AbortController();
    controller.current = requestController; running.current = true;
    const finish = beginInteraction();
    finishInteraction.current = finish;
    lastAttempt.current = { input, appealText, verdictId };
    setStage('loading'); setError(''); setStep(0); setIsAppeal(!!appealText);
    try {
      const data = appealText && verdictId ? await appealVerdict(verdictId, appealText, input, requestController.signal) : await requestVerdict(input, requestController.signal);
      if (!requestController.signal.aborted) {
        setLastVerdict({ result: data, snapshot: input }); setAppeal(''); setShowLog(false); setStage('result');
      }
    } catch (cause) {
      if (!requestController.signal.aborted) { setError(cause instanceof Error ? cause.message : '판결을 받지 못했어요.'); setStage('error'); }
    } finally { finish(); if (controller.current === requestController) running.current = false; }
  }
  function start() {
    if (!hasBoth) return;
    run({ room_id: 'presentation-room', requester: 'A', mode, relationship, context: context.trim(), recent_messages: recent.map(({ speaker, text }) => ({ speaker, text })) });
  }
  function cancel() { controller.current?.abort(); finishInteraction.current?.(); running.current = false; setStage(lastVerdict ? 'result' : 'form'); }
  function retry() { const attempt = lastAttempt.current; if (attempt) run(attempt.input, attempt.appealText, attempt.verdictId); }

  return (
    <ScrollView style={ui.page} contentContainerStyle={ui.content} keyboardShouldPersistTaps="handled">
      <View style={[ui.row, { justifyContent: 'space-between' }]}><Text style={ui.eyebrow}>KU래쪄용 · 다툼판결</Text><ActionButton title="채팅으로" secondary onPress={() => { controller.current?.abort(); router.replace('/chat'); }} style={styles.smallButton} /></View>
      <Text style={ui.title}>{stage === 'result' ? '서로의 입장을 살펴봤어요' : stage === 'loading' ? isAppeal ? '반론을 살펴보는 중' : '다툼을 살펴보는 중' : '잠깐, 판결을 부탁해요'}</Text>
      <Text style={ui.subtitle}>논리력 · 감정 조절 · 근거를 비교하고 대화를 이어갈 방법을 정리합니다.</Text>
      <SourceBadge source={FEATURE_SOURCE} />

      {stage === 'form' && <>
        <View style={ui.card}><Text style={ui.label}>어떤 분위기로 볼까요?</Text><View style={ui.row}>{(['WWE', 'UFC'] as const).map((value) => <ActionButton key={value} title={value} secondary={mode !== value} onPress={() => setMode(value)} style={{ flex: 1 }} />)}</View><Text style={ui.subtitle}>{mode === 'WWE' ? '유머를 곁들여 가볍게 돌아보는 시연입니다.' : '주장과 근거에 초점을 맞추는 시연입니다.'} 모드별 실제 분석 정책은 추후 합의합니다.</Text></View>
        <View style={ui.card}>
          <Text style={ui.label}>이번 판결에 사용할 대화</Text><Text style={ui.subtitle}>{relationship} · 최근 {recent.length}개 메시지 · 나(A) / 상대(B)</Text>
          <ActionButton title={showContext ? '대화 접기' : '전달할 대화 보기'} secondary onPress={() => setShowContext(!showContext)} disabled={!recent.length} />
          {showContext && recent.map((turn) => <View key={turn.id} style={styles.turn}><Text style={ui.eyebrow}>{turn.speaker === 'A' ? '나 (A)' : '상대 (B)'}</Text><Text style={ui.subtitle}>{turn.text}</Text></View>)}
          {!hasBoth && <><Text style={ui.subtitle}>양쪽의 말을 비교할 수 있도록 나와 상대의 메시지를 한 개 이상 입력해주세요.</Text><ActionButton title="채팅으로 돌아가기" secondary onPress={() => router.replace('/chat')} /></>}
          <Text style={ui.subtitle}>요청 시점의 대화를 고정해서 분석합니다. 나중에 추가한 메시지는 새 요청에 포함됩니다.</Text>
        </View>
        <View style={ui.card}><Text style={ui.label}>추가로 알려줄 상황 (선택)</Text><TextInput accessibilityLabel="판결에 참고할 추가 상황" multiline maxLength={1000} value={context} onChangeText={setContext} placeholder="예: 이번 주 청소는 상대 차례였어요." placeholderTextColor={colors.muted} style={styles.input} /><Text style={styles.caption}>{context.length} / 1000</Text></View>
        <ActionButton title="이 대화로 다툼판결 요청하기" onPress={start} disabled={!hasBoth} />
      </>}

      {stage === 'loading' && <View style={ui.card}>
        <ActivityIndicator size="large" color={colors.primary} accessibilityLabel="판결 응답 대기 중" />
        <Text style={ui.label}>{isAppeal ? '기존 대화와 반론을 함께 확인합니다.' : '잠시만 기다려주세요.'}</Text>
        {FEATURE_SOURCE === 'mock' ? <>{phases.map((phase, index) => <Text key={phase} style={[ui.subtitle, index === step && { color: colors.primary, fontWeight: '800' }]}>{index < step ? '✓' : index === step ? '●' : '○'} {phase}</Text>)}<Text style={styles.caption}>발표용 진행 연출입니다. 실제 AI 토론이 실행되는 것은 아닙니다.</Text></> : <Text style={ui.subtitle}>백엔드 결과를 기다리고 있어요. 현재 API 연결에서는 세부 진행률을 제공하지 않습니다.</Text>}
        <ActionButton title="요청 취소" secondary onPress={cancel} />
      </View>}

      {stage === 'error' && <View style={ui.card}><Text accessibilityRole="alert" style={ui.error}>{error}</Text><ActionButton title="같은 요청으로 다시 시도" onPress={retry} /><ActionButton title="요청 내용 수정하기" secondary onPress={() => setStage('form')} />{result && <ActionButton title="이전 결과 보기" secondary onPress={() => setStage('result')} />}</View>}

      {stage === 'result' && result && <>
        <View style={styles.resultHeader}><Text style={ui.eyebrow}>{result.mode} · {lastVerdict.snapshot.relationship}</Text><Text style={ui.subtitle}>요청한 대화 {lastVerdict.snapshot.recent_messages.length}개 기준</Text><SourceBadge source={result.source} /></View>
        <View style={styles.scores}><ScoreCard title="나 (A)" score={result.plaintiff} /><ScoreCard title="상대 (B)" score={result.defendant} accent="#397596" /></View>
        <View style={ui.card}><Text style={ui.label}>판결 요약</Text><Text style={ui.subtitle}>{result.summary}</Text><Text style={ui.eyebrow}>다음 대화를 위한 제안</Text><Text style={ui.subtitle}>{result.recommendation}</Text></View>
        <View style={[ui.card, { backgroundColor: '#FFF8DA' }]}><Text style={ui.label}>한 줄로 돌아보기</Text><Text style={ui.subtitle}>{result.humor}</Text></View>
        <View style={ui.card}><ActionButton title={showLog ? '토론 로그 접기' : '공개 토론 로그 보기'} secondary onPress={() => setShowLog(!showLog)} />{showLog && <><Text style={styles.caption}>{result.source === 'mock' ? '사용자에게 공개할 역할별 의견의 UI 예시입니다.' : '사용자에게 공개된 역할별 의견입니다.'}</Text>{result.debateLog.map((entry, index) => <View key={`${entry.role}-${index}`} style={styles.turn}><Text style={ui.eyebrow}>{roles[entry.role]} · {entry.round}라운드</Text><Text style={ui.subtitle}>{entry.text}</Text></View>)}</>}</View>
        <View style={ui.card}><Text style={ui.label}>다른 사정이 있나요? 반론하기</Text><Text style={ui.subtitle}>누락된 사실이나 내 입장을 보충해주세요. 같은 대화에 반론을 더해 다시 확인합니다.</Text><TextInput accessibilityLabel="판결에 대한 반론" style={styles.input} multiline maxLength={2000} value={appeal} onChangeText={setAppeal} placeholder="예: 지난 두 번도 내가 대신 청소했어요." placeholderTextColor={colors.muted} /><Text style={styles.caption}>{appeal.length} / 2000</Text><ActionButton title="반론 제출하고 다시 보기" disabled={!appeal.trim()} onPress={() => run(lastVerdict.snapshot, appeal.trim(), result.verdictId)} /></View>
        <ActionButton title="새 대화로 판결 요청하기" secondary onPress={() => { setContext(''); setShowContext(false); setStage('form'); }} />
        <ActionButton title="대화 이어가기" onPress={() => router.replace('/chat')} />
      </>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  smallButton: { paddingHorizontal: 12, paddingVertical: 10 },
  input: { minHeight: 100, maxHeight: 200, backgroundColor: colors.background, borderColor: colors.border, borderWidth: 1, borderRadius: 12, padding: 14, color: colors.ink, fontSize: 14, textAlignVertical: 'top' },
  caption: { color: colors.muted, fontSize: 12, lineHeight: 19 },
  turn: { padding: 12, backgroundColor: colors.background, borderRadius: 12, gap: 6 },
  scores: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  resultHeader: { gap: 6 },
});
