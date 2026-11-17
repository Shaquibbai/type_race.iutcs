import React, { useState } from 'react';
import { Play, AlertCircle, User, Hash } from 'lucide-react';

interface ParticipantFormProps {
  onStartRace: (name: string, participantId: string) => Promise<void>;
  isStarting: boolean;
  externalError?: string | null;
  onClearError?: () => void;
}

export const ParticipantForm: React.FC<ParticipantFormProps> = ({
  onStartRace,
  isStarting,
  externalError,
  onClearError
}) => {
  const [name, setName] = useState('');
  const [participantId, setParticipantId] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (onClearError) onClearError();

    const trimmedName = name.trim();
    const trimmedId = participantId.trim();

    if (!trimmedName) {
      setLocalError('Participant name is required.');
      return;
    }

    if (!trimmedId) {
      setLocalError('Participant ID is required.');
      return;
    }

    try {
      await onStartRace(trimmedName, trimmedId);
    } catch {
      // Backend error is passed via externalError or handled in hook
    }
  };

  const currentError = localError || externalError;

  return (
    <section className="new-game-section">
      <div className="new-game-header">
        <div>
          <h2 className="new-game-title">START NEW 40-SECOND TEST</h2>
          <p className="new-game-subtitle">
            Each participant has exactly ONE 40-second attempt. Enter your details to begin.
          </p>
        </div>
      </div>

      {currentError && (
        <div className="form-error-banner" role="alert">
          <AlertCircle size={18} />
          <span>{currentError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="form-inputs-row">
        <div className="input-field-group">
          <label htmlFor="participant-name" className="input-label">
            Participant Name
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="participant-name"
              type="text"
              className="input-control"
              style={{ width: '100%', paddingLeft: '40px' }}
              placeholder="your name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (localError) setLocalError(null);
              }}
              disabled={isStarting}
              autoComplete="off"
              autoFocus
            />
            <User
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
            />
          </div>
        </div>

        <div className="input-field-group">
          <label htmlFor="participant-id" className="input-label">
            Participant ID (Unique)
          </label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input
              id="participant-id"
              type="text"
              className="input-control"
              style={{ width: '100%', paddingLeft: '40px' }}
              placeholder="your student id"
              value={participantId}
              onChange={(e) => {
                setParticipantId(e.target.value);
                if (localError) setLocalError(null);
              }}
              disabled={isStarting}
              autoComplete="off"
            />
            <Hash
              size={18}
              color="var(--text-muted)"
              style={{ position: 'absolute', left: '14px', pointerEvents: 'none' }}
            />
          </div>
        </div>

        <button
          type="submit"
          className="btn-start-race"
          disabled={isStarting || !name.trim() || !participantId.trim()}
        >
          <Play size={18} fill="currentColor" />
          {isStarting ? 'RESERVING...' : 'START TYPING'}
        </button>
      </form>
    </section>
  );
};
