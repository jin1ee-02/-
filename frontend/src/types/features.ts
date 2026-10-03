import type { ChatTurn, ConversationInput, Speaker } from './api';

export type FeatureSource = 'mock' | 'api';
export type EmotionLevel = 1 | 2 | 3 | 4 | 5;
export type EmotionTrend = 'up' | 'flat' | 'down';
export type VerdictMode = 'WWE' | 'UFC';

export interface RoomSettings {
  purifyEnabled: boolean;
  thermometerEnabled: boolean;
  sensitivity: number; // Temporary UI value: 0.25 / 0.5 / 0.75, pending team agreement.
}

export interface DraftPreviewRequest extends ConversationInput {
  sensitivity: number;
}

export interface DraftReview {
  draft: string;
  decision: 'safe' | 'suggested' | 'uncertain';
  alternatives: string[];
  explanation: string;
  source: FeatureSource;
}

export interface EmotionRequest {
  speaker: Speaker;
  relationship: string;
  recent_messages: ChatTurn[];
}

export interface EmotionResult {
  subject: Speaker;
  level: EmotionLevel;
  trend: EmotionTrend;
  recommendation: string;
  contextCount: number;
  source: FeatureSource;
}

export interface VerdictRequest {
  room_id: string;
  requester: Speaker;
  mode: VerdictMode;
  relationship: string;
  recent_messages: ChatTurn[];
  context: string;
}

export interface SideScore {
  logic: number;
  emotionControl: number;
  evidence: number;
  strength: string;
  improvement: string;
}

export interface DebateEntry {
  role: 'prosecutor' | 'defense' | 'factcheck' | 'judge';
  round: number;
  text: string;
}

export interface VerdictResult {
  verdictId: string;
  mode: VerdictMode;
  plaintiff: SideScore;
  defendant: SideScore;
  summary: string;
  recommendation: string;
  humor: string;
  debateLog: DebateEntry[];
  source: FeatureSource;
}

export interface AsyncState<T> {
  status: 'idle' | 'loading' | 'ready' | 'error';
  data: T | null;
  error: string;
}
