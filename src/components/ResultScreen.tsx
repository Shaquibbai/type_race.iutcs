import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, Frown } from 'lucide-react';
import { ParticipantRecord } from '../types/index.js';

interface ResultScreenProps {
  participant: ParticipantRecord;
  rank: number;
  isTopFive: boolean;
  onReturnToMain: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({
  participant,
  rank,
  isTopFive,
  onReturnToMain
}) => {
  const [secondsRemaining, setSecondsRemaining] = useState<number>(5);

  useEffect(() => {
    // If top 5, trigger subtle golden celebration
    if (isTopFive) {
      try {
        confetti({
          particleCount: 70,
          spread: 60,
          origin: { y: 0.65 },
          colors: ['#e2b714', '#ffd700', '#ffffff', '#d1d0c5']
        });
      } catch (e) {
        console.warn('Confetti effect unavailable:', e);
      }
    }

    // 5-second automatic return countdown
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onReturnToMain();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isTopFive, onReturnToMain]);

  return (
    <div className="result-screen">
      <div className="result-card">
        {/* Celebration / Status Banner */}
        <div>
          {isTopFive ? (
            <div className="result-celebration-badge badge-top-five">
              <Trophy size={28} />
              YOU MADE THE TOP FIVE!
            </div>
          ) : (
            <div className="result-celebration-badge badge-not-top-five">
              <Frown size={24} />
              NOT IN THE TOP FIVE — KEEP PRACTICING.
            </div>
          )}
        </div>

        {/* Participant Identification */}
        <div className="result-participant-header">
          <div className="result-name">{participant.name}</div>
          <div className="result-id">ID: #{participant.participantId}</div>
        </div>

        {/* Metrics Grid */}
        <div className="result-stats-grid">
          <div className="result-stat-box">
            <span className="result-stat-title">FINAL RANK</span>
            <span className="result-stat-val accent">#{rank}</span>
          </div>

          <div className="result-stat-box">
            <span className="result-stat-title">WPM</span>
            <span className="result-stat-val">{participant.wpm}</span>
          </div>

          <div className="result-stat-box">
            <span className="result-stat-title">ACCURACY</span>
            <span className="result-stat-val">{participant.accuracy.toFixed(2)}%</span>
          </div>
        </div>

        {/* Auto Return Indicator */}
        <div className="result-auto-return">
          <div className="auto-return-text">
            Returning to leaderboard in <span>{secondsRemaining}s</span>
          </div>
          <button className="btn-return-now" onClick={onReturnToMain}>
            Continue to Leaderboard <ArrowRight size={14} style={{ display: 'inline', marginLeft: '6px' }} />
          </button>
        </div>
      </div>
    </div>
  );
};
