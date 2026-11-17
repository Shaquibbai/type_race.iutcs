export interface ParticipantRecord {
  name: string;
  participantId: string;
  wpm: number;
  accuracy: number;
  correctCharacters: number;
  totalCharacters: number;
  submittedAt: string;
}

export interface LeaderboardEntry extends ParticipantRecord {
  rank: number;
  isTopFive: boolean;
}

export interface ActiveAttempt {
  attemptId: string;
  participantId: string;
  name: string;
  startedAt: string;
  startTimestamp: number;
  durationSeconds: number;
  status: 'in_progress' | 'completed' | 'abandoned';
  lastActiveAt: string;
}

export interface CompetitionData {
  participants: ParticipantRecord[];
  activeAttempts: ActiveAttempt[];
}

export interface StartAttemptRequest {
  name: string;
  participantId: string;
}

export interface StartAttemptResponse {
  attemptId: string;
  name: string;
  participantId: string;
  startedAt: string;
  startTimestamp: number;
  durationSeconds: number;
}

export interface FinishAttemptRequest {
  attemptId: string;
  correctCharacters: number;
  totalCharacters: number;
}

export interface FinishAttemptResponse {
  participant: ParticipantRecord;
  rank: number;
  isTopFive: boolean;
  totalParticipants: number;
  leaderboard: LeaderboardEntry[];
}

export interface CompetitionSummary {
  leaderboard: LeaderboardEntry[];
  totalParticipants: number;
}
