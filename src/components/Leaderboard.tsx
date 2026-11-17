import React from 'react';
import { LeaderboardEntry } from '../types/index.js';
import { Trophy, Award, Medal, Users } from 'lucide-react';

interface LeaderboardProps {
  entries: LeaderboardEntry[];
  totalParticipants: number;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ entries, totalParticipants }) => {
  const getRankClass = (rank: number): string => {
    switch (rank) {
      case 1:
        return 'row-rank-1';
      case 2:
        return 'row-rank-2';
      case 3:
        return 'row-rank-3';
      case 4:
        return 'row-rank-4';
      case 5:
        return 'row-rank-5';
      default:
        return 'row-subdued';
    }
  };

  const renderRankBadge = (rank: number) => {
    if (rank === 1) {
      return (
        <span className="rank-badge" title="1st Place">
          <Trophy size={16} />
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="rank-badge" title="2nd Place">
          <Medal size={16} />
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="rank-badge" title="3rd Place">
          <Award size={16} />
        </span>
      );
    }
    return <span className="rank-badge">#{rank}</span>;
  };

  const renderTopPill = (rank: number) => {
    switch (rank) {
      case 1:
        return <span className="top-five-pill pill-gold">1ST PLACE</span>;
      case 2:
        return <span className="top-five-pill pill-silver">2ND PLACE</span>;
      case 3:
        return <span className="top-five-pill pill-bronze">3RD PLACE</span>;
      case 4:
      case 5:
        return <span className="top-five-pill pill-accent">TOP 5</span>;
      default:
        return null;
    }
  };

  return (
    <section className="leaderboard-section">
      <div className="section-header">
        <h2 className="section-title">
          <Trophy size={18} color="var(--accent)" />
          OFFICIAL LEADERBOARD
        </h2>
        <div className="participant-counter">
          TOTAL COMPETITORS: <span>{totalParticipants}</span>
        </div>
      </div>

      <div className="leaderboard-table-container">
        {entries.length === 0 ? (
          <div className="leaderboard-empty">
            <Users size={44} className="empty-icon" />
            <h3 className="empty-title">NO COMPETITION ENTRIES YET</h3>
            <p className="empty-desc">
              Be the first to step up! Enter your name and participant ID below to complete the 40-second typing test.
            </p>
          </div>
        ) : (
          <div className="leaderboard-scroll">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: '80px', textAlign: 'center' }}>Rank</th>
                  <th>Participant</th>
                  <th>ID</th>
                  <th style={{ textAlign: 'right' }}>WPM</th>
                  <th style={{ textAlign: 'right' }}>Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.participantId}-${entry.submittedAt}`} className={getRankClass(entry.rank)}>
                    <td style={{ textAlign: 'center' }}>
                      {renderRankBadge(entry.rank)}
                    </td>
                    <td>
                      <div className="participant-name-wrapper">
                        <span className="participant-name">{entry.name}</span>
                        {renderTopPill(entry.rank)}
                      </div>
                    </td>
                    <td>
                      <span className="participant-id">#{entry.participantId}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="participant-wpm">{entry.wpm}</span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <span className="participant-acc">{entry.accuracy.toFixed(2)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
};
