import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export interface ParticipantRecord {
  name: string;
  participantId: string;
  wpm: number;
  accuracy: number;
  correctCharacters: number;
  totalCharacters: number;
  submittedAt: string;
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
  typingStarted?: boolean;
}

export interface CompetitionData {
  participants: ParticipantRecord[];
  activeAttempts: ActiveAttempt[];
}

export interface LeaderboardEntry extends ParticipantRecord {
  rank: number;
  isTopFive: boolean;
}

export class CompetitionDatabase {
  private filePath: string;
  private writeLock: Promise<void> = Promise.resolve();

  constructor(filePath?: string) {
    this.filePath = filePath || path.resolve(process.cwd(), 'data', 'competition.json');
    this.ensureInitialized();
  }

  private ensureInitialized(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      const initialData: CompetitionData = {
        participants: [],
        activeAttempts: []
      };
      fs.writeFileSync(this.filePath, JSON.stringify(initialData, null, 2), 'utf-8');
    }
  }

  private normalizeId(id: string): string {
    return id.trim().toLowerCase();
  }

  private async readData(): Promise<CompetitionData> {
    try {
      this.ensureInitialized();
      const content = await fs.promises.readFile(this.filePath, 'utf-8');
      const data = JSON.parse(content);

      // Verify schema structure
      if (!data || !Array.isArray(data.participants)) {
        throw new Error('Invalid schema: participants array missing');
      }

      if (!Array.isArray(data.activeAttempts)) {
        data.activeAttempts = [];
      }

      return data as CompetitionData;
    } catch (err: unknown) {
      console.error('Error reading competition database:', err);
      // If corrupted, create a backup to prevent silent data loss
      if (fs.existsSync(this.filePath)) {
        const backupPath = `${this.filePath}.corrupt.${Date.now()}`;
        try {
          await fs.promises.copyFile(this.filePath, backupPath);
          console.warn(`Corrupt competition.json backed up to: ${backupPath}`);
        } catch (backupErr) {
          console.error('Failed to create backup of corrupt file:', backupErr);
        }
      }
      throw new Error('Database read failed. File may be corrupted. Check backup.');
    }
  }

  private async writeData(data: CompetitionData): Promise<void> {
    // Queue writes to ensure sequential, non-conflicting execution
    const previousLock = this.writeLock;
    let resolveLock!: () => void;
    this.writeLock = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });

    try {
      await previousLock;
      const jsonString = JSON.stringify(data, null, 2);
      const tmpPath = `${this.filePath}.tmp.${crypto.randomBytes(4).toString('hex')}`;

      // Write to temp file first
      await fs.promises.writeFile(tmpPath, jsonString, 'utf-8');
      // Atomic rename
      await fs.promises.rename(tmpPath, this.filePath);
    } finally {
      resolveLock();
    }
  }

  /**
   * Sort participants according to official rules:
   * 1. Highest WPM ranks first
   * 2. Higher accuracy ranks first
   * 3. Earlier submission timestamp ranks first
   */
  public sortParticipants(participants: ParticipantRecord[]): LeaderboardEntry[] {
    const sorted = [...participants].sort((a, b) => {
      // 1. Highest WPM
      if (b.wpm !== a.wpm) {
        return b.wpm - a.wpm;
      }
      // 2. Higher Accuracy
      if (b.accuracy !== a.accuracy) {
        return b.accuracy - a.accuracy;
      }
      // 3. Earlier submission
      const timeA = new Date(a.submittedAt).getTime();
      const timeB = new Date(b.submittedAt).getTime();
      return timeA - timeB;
    });

    return sorted.map((p, index) => ({
      ...p,
      rank: index + 1,
      isTopFive: index < 5
    }));
  }

  public async getLeaderboard(): Promise<LeaderboardEntry[]> {
    const data = await this.readData();
    return this.sortParticipants(data.participants);
  }

  public async getTotalParticipants(): Promise<number> {
    const data = await this.readData();
    return data.participants.length;
  }

  public async isIdTaken(participantId: string): Promise<boolean> {
    const data = await this.readData();
    const normalized = this.normalizeId(participantId);

    // Check completed participants
    const existsInCompleted = data.participants.some(
      (p) => this.normalizeId(p.participantId) === normalized
    );
    if (existsInCompleted) return true;

    // Check active or abandoned attempts (IDs cannot be reused)
    const existsInAttempts = data.activeAttempts.some(
      (a) => this.normalizeId(a.participantId) === normalized
    );
    return existsInAttempts;
  }

  public async startAttempt(rawName: string, rawParticipantId: string): Promise<ActiveAttempt> {
    const name = rawName.trim();
    const participantId = rawParticipantId.trim();

    if (!name) {
      throw new Error('Participant name is required');
    }
    if (!participantId) {
      throw new Error('Participant ID is required');
    }

    const data = await this.readData();
    const normalized = this.normalizeId(participantId);

    // Duplicate check
    const isTaken =
      data.participants.some((p) => this.normalizeId(p.participantId) === normalized) ||
      data.activeAttempts.some((a) => this.normalizeId(a.participantId) === normalized);

    if (isTaken) {
      throw new Error(`Participant ID "${participantId}" has already participated or has an active attempt.`);
    }

    const now = Date.now();
    const attempt: ActiveAttempt = {
      attemptId: crypto.randomUUID(),
      participantId: participantId, // preserve original case & format
      name: name,
      startedAt: new Date(now).toISOString(),
      startTimestamp: now,
      durationSeconds: 40,
      status: 'in_progress',
      lastActiveAt: new Date(now).toISOString(),
      typingStarted: false
    };

    data.activeAttempts.push(attempt);
    await this.writeData(data);

    return attempt;
  }

  public async recordTypingStarted(attemptId: string): Promise<void> {
    const data = await this.readData();
    const attempt = data.activeAttempts.find((a) => a.attemptId === attemptId);
    if (attempt && attempt.status === 'in_progress' && !attempt.typingStarted) {
      attempt.typingStarted = true;
      attempt.startTimestamp = Date.now();
      attempt.lastActiveAt = new Date().toISOString();
      await this.writeData(data);
    }
  }

  public async getAttempt(attemptId: string): Promise<{ attempt: ActiveAttempt; remainingSeconds: number } | null> {
    const data = await this.readData();
    const attemptIndex = data.activeAttempts.findIndex((a) => a.attemptId === attemptId);

    if (attemptIndex === -1) {
      return null;
    }

    const attempt = data.activeAttempts[attemptIndex];
    const now = Date.now();
    const elapsedSeconds = attempt.typingStarted
      ? (now - attempt.startTimestamp) / 1000
      : 0;
    const remainingSeconds = Math.max(0, attempt.durationSeconds - elapsedSeconds);

    // If typing started and more than 50 seconds have elapsed and still in_progress, mark abandoned
    if (attempt.status === 'in_progress' && attempt.typingStarted && elapsedSeconds > 50) {
      attempt.status = 'abandoned';
      attempt.lastActiveAt = new Date(now).toISOString();
      await this.writeData(data);
    }

    return {
      attempt,
      remainingSeconds: Number(remainingSeconds.toFixed(1))
    };
  }

  public async finishAttempt(
    attemptId: string,
    correctCharacters: number,
    totalCharacters: number,
    elapsedSecondsOverride?: number
  ): Promise<{
    participant: ParticipantRecord;
    rank: number;
    isTopFive: boolean;
    leaderboard: LeaderboardEntry[];
  }> {
    const data = await this.readData();
    const attemptIndex = data.activeAttempts.findIndex((a) => a.attemptId === attemptId);

    if (attemptIndex === -1) {
      throw new Error('Attempt not found');
    }

    const attempt = data.activeAttempts[attemptIndex];
    if (attempt.status !== 'in_progress') {
      throw new Error(`Attempt already ${attempt.status}`);
    }

    const now = Date.now();
    const calculatedElapsed = attempt.typingStarted
      ? (now - attempt.startTimestamp) / 1000
      : attempt.durationSeconds;
    const rawElapsed = elapsedSecondsOverride !== undefined ? elapsedSecondsOverride : calculatedElapsed;
    const elapsedSeconds = Math.min(attempt.durationSeconds, Math.max(1, rawElapsed));

    // Validate characters
    const validCorrect = Math.max(0, Math.floor(correctCharacters));
    const validTotal = Math.max(0, Math.floor(totalCharacters));

    if (validCorrect > validTotal) {
      throw new Error('Correct characters cannot exceed total characters');
    }

    // Scoring formula:
    // WPM = (Correct Characters / 5) / Elapsed Time in Minutes
    // Use actual elapsed duration, capped at 40s (which is 40/60 = 2/3 minute)
    const elapsedMinutes = elapsedSeconds / 60;
    const rawWpm = (validCorrect / 5) / elapsedMinutes;
    const wpm = Math.max(0, Math.round(rawWpm));

    // Accuracy = (Correct Characters / Total Typed Characters) * 100
    const accuracy = validTotal > 0
      ? Number(((validCorrect / validTotal) * 100).toFixed(2))
      : 0.00;

    const participantRecord: ParticipantRecord = {
      name: attempt.name,
      participantId: attempt.participantId,
      wpm,
      accuracy,
      correctCharacters: validCorrect,
      totalCharacters: validTotal,
      submittedAt: new Date().toISOString()
    };

    // Update attempt status
    attempt.status = 'completed';
    attempt.lastActiveAt = new Date().toISOString();

    // Add to participants
    data.participants.push(participantRecord);
    await this.writeData(data);

    // Compute leaderboard and rank
    const leaderboard = this.sortParticipants(data.participants);
    const entry = leaderboard.find(
      (e) => this.normalizeId(e.participantId) === this.normalizeId(participantRecord.participantId)
    );

    const rank = entry ? entry.rank : leaderboard.length;
    const isTopFive = rank <= 5;

    return {
      participant: participantRecord,
      rank,
      isTopFive,
      leaderboard
    };
  }

  public async clearAllData(): Promise<void> {
    const freshData: CompetitionData = {
      participants: [],
      activeAttempts: []
    };
    await this.writeData(freshData);
  }

  public async exportCSV(): Promise<string> {
    const leaderboard = await this.getLeaderboard();

    const escapeCsv = (val: string | number) => {
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = ['Rank', 'Participant Name', 'Participant ID', 'WPM', 'Accuracy (%)', 'Submission Timestamp'];
    const rows = leaderboard.map((p) => [
      p.rank,
      escapeCsv(p.name),
      escapeCsv(p.participantId),
      p.wpm,
      p.accuracy.toFixed(2),
      p.submittedAt
    ]);

    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}

export const db = new CompetitionDatabase();
