import { useState, useEffect, useCallback } from 'react';
import { LeaderboardEntry, FinishAttemptResponse, StartAttemptResponse } from '../types/index.js';
import { api } from '../services/api.js';

const ACTIVE_ATTEMPT_KEY = 'type_race_active_attempt_id';

export interface RecoveredAttempt {
  attemptId: string;
  name: string;
  participantId: string;
  remainingSeconds: number;
  durationSeconds: number;
  startedAt: string;
  typingStarted?: boolean;
}

export function useCompetition() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [recoveredAttempt, setRecoveredAttempt] = useState<RecoveredAttempt | null>(null);

  const loadLeaderboard = useCallback(async () => {
    try {
      setError(null);
      const data = await api.getLeaderboard();
      setLeaderboard(data.leaderboard);
      setTotalParticipants(data.totalParticipants);
    } catch (err: any) {
      console.error('Failed to load competition data:', err);
      setError(err.message || 'Unable to connect to competition server');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Check for interrupted attempt on mount
  const checkActiveAttempt = useCallback(async () => {
    const savedAttemptId = sessionStorage.getItem(ACTIVE_ATTEMPT_KEY);
    if (!savedAttemptId) return;

    try {
      const data = await api.getAttempt(savedAttemptId);
      const localStartedAt = sessionStorage.getItem('type_race_test_started_at');
      let effectiveRemaining = data.remainingSeconds;

      if (localStartedAt) {
        const localElapsed = (Date.now() - parseInt(localStartedAt, 10)) / 1000;
        effectiveRemaining = Math.min(effectiveRemaining, Math.max(0, 40 - localElapsed));
      }

      if (data.status === 'in_progress' && effectiveRemaining > 0) {
        setRecoveredAttempt({
          attemptId: data.attemptId,
          name: data.name,
          participantId: data.participantId,
          remainingSeconds: Number(effectiveRemaining.toFixed(1)),
          durationSeconds: data.durationSeconds,
          startedAt: data.startedAt,
          typingStarted: data.typingStarted || !!localStartedAt
        });
      } else {
        // Expired or finished
        sessionStorage.removeItem(ACTIVE_ATTEMPT_KEY);
        sessionStorage.removeItem('type_race_test_started_at');
      }
    } catch {
      sessionStorage.removeItem(ACTIVE_ATTEMPT_KEY);
      sessionStorage.removeItem('type_race_test_started_at');
    }
  }, []);

  useEffect(() => {
    loadLeaderboard();
    checkActiveAttempt();
  }, [loadLeaderboard, checkActiveAttempt]);

  const startTest = async (name: string, participantId: string): Promise<StartAttemptResponse> => {
    setError(null);
    try {
      const attempt = await api.startAttempt(name, participantId);
      sessionStorage.setItem(ACTIVE_ATTEMPT_KEY, attempt.attemptId);
      return attempt;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const finishTest = async (
    attemptId: string,
    correctCharacters: number,
    totalCharacters: number
  ): Promise<FinishAttemptResponse> => {
    try {
      const result = await api.finishAttempt(attemptId, correctCharacters, totalCharacters);
      sessionStorage.removeItem(ACTIVE_ATTEMPT_KEY);
      setRecoveredAttempt(null);
      // Update local leaderboard
      setLeaderboard(result.leaderboard);
      setTotalParticipants(result.totalParticipants);
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  const clearAll = async () => {
    await api.clearAllData();
    sessionStorage.removeItem(ACTIVE_ATTEMPT_KEY);
    sessionStorage.removeItem('type_race_test_started_at');
    setRecoveredAttempt(null);
    await loadLeaderboard();
  };

  const dismissRecoveredAttempt = () => {
    sessionStorage.removeItem(ACTIVE_ATTEMPT_KEY);
    setRecoveredAttempt(null);
  };

  return {
    leaderboard,
    totalParticipants,
    isLoading,
    error,
    setError,
    loadLeaderboard,
    startTest,
    finishTest,
    clearAll,
    recoveredAttempt,
    dismissRecoveredAttempt
  };
}
