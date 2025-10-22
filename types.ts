
export enum OnboardingStage {
  GREETING = 0,
  PAYMENT = 1,
  NBFC = 2,
  RCA = 3,
}

export enum AgentStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  LISTENING = 'LISTENING',
  THINKING = 'THINKING',
  SPEAKING = 'SPEAKING',
  ERROR = 'ERROR',
}

export interface TranscriptEntry {
  speaker: 'user' | 'agent';
  text: string;
  isFinal: boolean;
}
