// Temporary integration contract matching backend/app/schemas.py.
// The handoff document's /analyze and /verdict contracts are still proposals.
export type Speaker = 'A' | 'B';

export interface ChatTurn {
  speaker: Speaker;
  text: string;
}

export interface ConversationInput {
  recent_messages: ChatTurn[];
  speaker: Speaker;
  text: string;
  relationship: string;
  summary?: string | null;
  previous_temperature: number;
}

export interface FeatureScores {
  hostility: number;
  sarcasm: number;
  blame: number;
  repair: number;
  escalation_delta: number;
  confidence: number;
  rationale: string;
}

export interface MessageResult {
  features: FeatureScores;
  raw_conflict: number;
  previous_temperature: number;
  temperature: number;
}

export interface ReceiptResult {
  status: 'received';
  received: ConversationInput;
}

export type DeliveryResult =
  | { mode: 'local' }
  | { mode: 'receipt'; data: ReceiptResult }
  | { mode: 'ai'; data: MessageResult };

export interface Message extends ChatTurn {
  id: string;
  createdAt: string;
  result: DeliveryResult;
}
