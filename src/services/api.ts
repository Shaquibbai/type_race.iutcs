import {
  CompetitionSummary,
  StartAttemptResponse,
  FinishAttemptResponse
} from '../types/index.js';

const API_BASE = '/api/competition';

export class ApiError extends Error {
  public status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const api = {
  /**
   * Fetches the entire leaderboard and total participants count.
   */
  async getLeaderboard(): Promise<CompetitionSummary> {
    const res = await fetch(`${API_BASE}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Failed to load leaderboard' }));
      throw new ApiError(err.error || 'Failed to load leaderboard', res.status);
    }
    return res.json();
  },

  /**
   * Starts a new 40-second attempt and reserves the participant ID.
   */
  async startAttempt(name: string, participantId: string): Promise<StartAttemptResponse> {
    const res = await fetch(`${API_BASE}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, participantId })
    });

    const data = await res.json().catch(() => ({ error: 'Failed to start attempt' }));
    if (!res.ok) {
      throw new ApiError(data.error || 'Failed to start attempt', res.status);
    }
    return data;
  },

  /**
   * Checks or recovers an active attempt by its ID.
   */
  async getAttempt(attemptId: string): Promise<{
    attemptId: string;
    name: string;
    participantId: string;
    startedAt: string;
    startTimestamp: number;
    durationSeconds: number;
    status: 'in_progress' | 'completed' | 'abandoned';
    remainingSeconds: number;
    typingStarted?: boolean;
  }> {
    const res = await fetch(`${API_BASE}/attempt/${encodeURIComponent(attemptId)}`);
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Attempt not found' }));
      throw new ApiError(err.error || 'Attempt not found', res.status);
    }
    return res.json();
  },

  /**
   * Notifies the server that the participant has typed their first valid key.
   */
  async recordTypingStarted(attemptId: string): Promise<void> {
    try {
      await fetch(`${API_BASE}/attempt/${encodeURIComponent(attemptId)}/start-typing`, {
        method: 'POST'
      });
    } catch (err) {
      console.warn('Failed to notify server of typing start:', err);
    }
  },

  /**
   * Finalizes and submits the test results to the server.
   */
  async finishAttempt(
    attemptId: string,
    correctCharacters: number,
    totalCharacters: number
  ): Promise<FinishAttemptResponse> {
    const res = await fetch(`${API_BASE}/finish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId,
        correctCharacters,
        totalCharacters
      })
    });

    const data = await res.json().catch(() => ({ error: 'Failed to finalize test' }));
    if (!res.ok) {
      throw new ApiError(data.error || 'Failed to finalize test', res.status);
    }
    return data;
  },

  /**
   * Clears all competition data with explicit confirmation code.
   */
  async clearAllData(): Promise<void> {
    const res = await fetch(`${API_BASE}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirmation: 'CONFIRM_CLEAR_COMPETITION' })
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Failed to clear data' }));
      throw new ApiError(data.error || 'Failed to clear data', res.status);
    }
  },

  /**
   * Direct download link for CSV export.
   */
  getExportUrl(): string {
    return `${API_BASE}/export`;
  },

  /**
   * Checks if local backend is online.
   */
  async checkHealth(): Promise<boolean> {
    try {
      const res = await fetch('/api/health');
      return res.ok;
    } catch {
      return false;
    }
  }
};
