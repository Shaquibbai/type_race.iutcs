import { useState } from 'react';
import { useCompetition } from './hooks/useCompetition.js';
import { Leaderboard } from './components/Leaderboard.js';
import { ParticipantForm } from './components/ParticipantForm.js';
import { TypingTest } from './components/TypingTest.js';
import { ResultScreen } from './components/ResultScreen.js';
import { AdminControls } from './components/AdminControls.js';
import { FinishAttemptResponse } from './types/index.js';
import { Keyboard, RotateCcw } from 'lucide-react';
import { api } from './services/api.js';
import iutcsLogo from './assets/iutcs-logo.png';

type ScreenState = 'main' | 'test' | 'result';

interface ActiveRaceState {
  attemptId: string;
  name: string;
  participantId: string;
  durationSeconds: number;
  initialRemainingSeconds?: number;
}

export function App() {
  const {
    leaderboard,
    totalParticipants,
    error,
    setError,
    startTest,
    finishTest,
    clearAll,
    recoveredAttempt,
    dismissRecoveredAttempt
  } = useCompetition();

  const [currentScreen, setCurrentScreen] = useState<ScreenState>('main');
  const [activeRace, setActiveRace] = useState<ActiveRaceState | null>(null);
  const [lastResult, setLastResult] = useState<FinishAttemptResponse | null>(null);
  const [isStarting, setIsStarting] = useState<boolean>(false);

  // Handle starting a new race from the participant form
  const handleStartRace = async (name: string, participantId: string) => {
    setIsStarting(true);
    try {
      const attempt = await startTest(name, participantId);
      setActiveRace({
        attemptId: attempt.attemptId,
        name: attempt.name,
        participantId: attempt.participantId,
        durationSeconds: attempt.durationSeconds,
        initialRemainingSeconds: attempt.durationSeconds
      });
      setCurrentScreen('test');
    } catch {
      // Error handled inside useCompetition hook
    } finally {
      setIsStarting(false);
    }
  };

  // Resume an interrupted attempt detected on page refresh / crash
  const handleResumeAttempt = () => {
    if (!recoveredAttempt) return;
    setActiveRace({
      attemptId: recoveredAttempt.attemptId,
      name: recoveredAttempt.name,
      participantId: recoveredAttempt.participantId,
      durationSeconds: recoveredAttempt.durationSeconds,
      initialRemainingSeconds: recoveredAttempt.remainingSeconds
    });
    setCurrentScreen('test');
  };

  // Handle completion of the 40-second test
  const handleTestFinished = async (result: {
    correctCharacters: number;
    totalCharacters: number;
    wpm: number;
    accuracy: number;
  }) => {
    if (!activeRace) return;

    try {
      sessionStorage.removeItem('type_race_test_started_at');
      const serverResult = await finishTest(
        activeRace.attemptId,
        result.correctCharacters,
        result.totalCharacters
      );

      setLastResult(serverResult);
      setCurrentScreen('result');
    } catch (err: any) {
      console.error('Failed to submit race result:', err);
      sessionStorage.removeItem('type_race_test_started_at');
      // Return to main with error displayed
      setCurrentScreen('main');
    }
  };

  // Return to leaderboard
  const handleReturnToMain = () => {
    setActiveRace(null);
    setLastResult(null);
    setCurrentScreen('main');
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-logo">
            <Keyboard size={32} />
          </div>
          <div>
            <h1 className="brand-title">
              type_race<span>.iutcs</span>
            </h1>
            <p className="brand-tagline">Offline Competition Kiosk</p>
          </div>
        </div>

        <div className="header-status">
          <img
            src={iutcsLogo}
            alt="IUTCS Logo"
            className="header-logo-image"
          />
        </div>
      </header>

      {/* Interrupted Attempt Recovery Banner */}
      {currentScreen === 'main' && recoveredAttempt && (
        <div className="recovery-banner" style={{ marginBottom: '24px' }}>
          <div className="recovery-info">
            <div className="recovery-title">
              <RotateCcw size={16} />
              INTERRUPTED TEST DETECTED
            </div>
            <div className="recovery-desc">
              Participant <strong>{recoveredAttempt.name}</strong> (ID: #{recoveredAttempt.participantId}) has an unfinished attempt with <strong>{recoveredAttempt.remainingSeconds}s</strong> remaining.
            </div>
          </div>
          <div className="recovery-actions">
            <button className="btn-resume" onClick={handleResumeAttempt}>
              Resume Attempt
            </button>
            <button className="btn-dismiss" onClick={dismissRecoveredAttempt}>
              Abandon
            </button>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        {currentScreen === 'main' && (
          <div className="dashboard-layout">
            <Leaderboard
              entries={leaderboard}
              totalParticipants={totalParticipants}
            />

            <ParticipantForm
              onStartRace={handleStartRace}
              isStarting={isStarting}
              externalError={error}
              onClearError={() => setError(null)}
            />
          </div>
        )}

        {currentScreen === 'test' && activeRace && (
          <TypingTest
            name={activeRace.name}
            participantId={activeRace.participantId}
            durationSeconds={activeRace.durationSeconds}
            initialRemainingSeconds={activeRace.initialRemainingSeconds}
            onStartTyping={() => {
              sessionStorage.setItem('type_race_test_started_at', Date.now().toString());
              api.recordTypingStarted(activeRace.attemptId);
            }}
            onFinish={handleTestFinished}
          />
        )}

        {currentScreen === 'result' && lastResult && (
          <ResultScreen
            participant={lastResult.participant}
            rank={lastResult.rank}
            isTopFive={lastResult.isTopFive}
            onReturnToMain={handleReturnToMain}
          />
        )}
      </main>

      {/* Minimal Footer with Admin Controls */}
      <footer className="app-footer">
        <div>vibe coded by shaquibbai</div>
        <AdminControls
          totalParticipants={totalParticipants}
          onDataCleared={clearAll}
        />
      </footer>
    </div>
  );
}

export default App;
