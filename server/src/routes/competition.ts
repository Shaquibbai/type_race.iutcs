import { Router, Request, Response } from 'express';
import { db } from '../database.js';

export const competitionRouter = Router();

// GET /api/competition - Get all participant records in leaderboard order & count
competitionRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const leaderboard = await db.getLeaderboard();
    const totalParticipants = leaderboard.length;
    res.json({
      leaderboard,
      totalParticipants
    });
  } catch (error: any) {
    console.error('Error fetching competition data:', error);
    res.status(500).json({ error: 'Failed to retrieve competition records' });
  }
});

// POST /api/competition/start - Start a new typing attempt
competitionRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const { name, participantId } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Participant name is required' });
    }

    if (!participantId || typeof participantId !== 'string' || !participantId.trim()) {
      return res.status(400).json({ error: 'Participant ID is required' });
    }

    const trimmedName = name.trim();
    const trimmedId = participantId.trim();

    // Check duplicate ID
    const alreadyTaken = await db.isIdTaken(trimmedId);
    if (alreadyTaken) {
      return res.status(409).json({
        error: `Participant ID "${trimmedId}" has already participated or has an active session.`
      });
    }

    const attempt = await db.startAttempt(trimmedName, trimmedId);

    res.status(201).json({
      attemptId: attempt.attemptId,
      name: attempt.name,
      participantId: attempt.participantId,
      startedAt: attempt.startedAt,
      startTimestamp: attempt.startTimestamp,
      durationSeconds: attempt.durationSeconds
    });
  } catch (error: any) {
    console.error('Error starting attempt:', error);
    res.status(400).json({ error: error.message || 'Failed to start attempt' });
  }
});

// GET /api/competition/attempt/:id - Check/recover an attempt
competitionRouter.get('/attempt/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.getAttempt(id);

    if (!result) {
      return res.status(404).json({ error: 'Attempt not found' });
    }

    res.json({
      attemptId: result.attempt.attemptId,
      name: result.attempt.name,
      participantId: result.attempt.participantId,
      startedAt: result.attempt.startedAt,
      startTimestamp: result.attempt.startTimestamp,
      durationSeconds: result.attempt.durationSeconds,
      status: result.attempt.status,
      remainingSeconds: result.remainingSeconds,
      typingStarted: result.attempt.typingStarted ?? false
    });
  } catch (error: any) {
    console.error('Error checking attempt:', error);
    res.status(500).json({ error: error.message || 'Failed to check attempt status' });
  }
});

// POST /api/competition/attempt/:id/start-typing - Record when the participant presses their first key
competitionRouter.post('/attempt/:id/start-typing', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.recordTypingStarted(id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error recording typing start:', error);
    res.status(400).json({ error: error.message || 'Failed to record typing start' });
  }
});

// POST /api/competition/finish - Finalize and submit an attempt
competitionRouter.post('/finish', async (req: Request, res: Response) => {
  try {
    const { attemptId, correctCharacters, totalCharacters } = req.body;

    if (!attemptId || typeof attemptId !== 'string') {
      return res.status(400).json({ error: 'Valid attemptId is required' });
    }

    if (typeof correctCharacters !== 'number' || typeof totalCharacters !== 'number') {
      return res.status(400).json({ error: 'correctCharacters and totalCharacters must be numbers' });
    }

    const result = await db.finishAttempt(attemptId, correctCharacters, totalCharacters);

    res.json({
      participant: result.participant,
      rank: result.rank,
      isTopFive: result.isTopFive,
      totalParticipants: result.leaderboard.length,
      leaderboard: result.leaderboard
    });
  } catch (error: any) {
    console.error('Error finishing attempt:', error);
    res.status(400).json({ error: error.message || 'Failed to finalize attempt' });
  }
});

// GET /api/competition/export - Export results as CSV
competitionRouter.get('/export', async (_req: Request, res: Response) => {
  try {
    const csvContent = await db.exportCSV();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `type-race-results-${timestamp}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error: any) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// DELETE /api/competition - Clear all competition data
competitionRouter.delete('/', async (req: Request, res: Response) => {
  try {
    const { confirmation } = req.body;
    if (confirmation !== 'CONFIRM_CLEAR_COMPETITION') {
      return res.status(400).json({
        error: 'Confirmation code required to clear competition data. Use CONFIRM_CLEAR_COMPETITION.'
      });
    }

    await db.clearAllData();
    res.json({ success: true, message: 'All competition records cleared successfully' });
  } catch (error: any) {
    console.error('Error clearing competition data:', error);
    res.status(500).json({ error: 'Failed to clear competition data' });
  }
});
