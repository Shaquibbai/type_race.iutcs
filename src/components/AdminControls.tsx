import React, { useState } from 'react';
import { Settings, Download, Trash2, X, AlertTriangle, Users } from 'lucide-react';
import { api } from '../services/api.js';

interface AdminControlsProps {
  totalParticipants: number;
  onDataCleared: () => Promise<void>;
}

export const AdminControls: React.FC<AdminControlsProps> = ({
  totalParticipants,
  onDataCleared
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);
  const [confirmInput, setConfirmInput] = useState<string>('');
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [adminError, setAdminError] = useState<string | null>(null);

  const handleClearAll = async () => {
    if (confirmInput.trim() !== 'RESET') {
      setAdminError('You must type RESET exactly to confirm data wipe.');
      return;
    }

    setIsClearing(true);
    setAdminError(null);
    try {
      await onDataCleared();
      setIsConfirmingClear(false);
      setConfirmInput('');
      setIsOpen(false);
    } catch (err: any) {
      setAdminError(err.message || 'Failed to clear competition data');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      {/* Unobtrusive footer trigger */}
      <button
        className="admin-trigger-btn"
        onClick={() => {
          setIsOpen(true);
          setIsConfirmingClear(false);
          setAdminError(null);
        }}
        title="Admin Settings"
      >
        <Settings size={14} />
        <span>Admin</span>
      </button>

      {/* Admin Modal */}
      {isOpen && (
        <div className="modal-overlay" onClick={() => setIsOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                <Settings size={18} color="var(--accent)" />
                Kiosk Administration
              </h3>
              <button
                className="btn-close-modal"
                onClick={() => setIsOpen(false)}
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Total Participant Count */}
              <div className="admin-metric-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Users size={18} color="var(--text-muted)" />
                  <span className="metric-label">Total Completed Attempts:</span>
                </div>
                <span className="metric-val">{totalParticipants}</span>
              </div>

              {adminError && (
                <div className="form-error-banner">
                  <AlertTriangle size={16} />
                  <span>{adminError}</span>
                </div>
              )}

              {/* Actions */}
              <div className="admin-actions-stack">
                <a
                  href={api.getExportUrl()}
                  className="btn-admin-action"
                  download
                >
                  <Download size={16} />
                  Export Leaderboard to CSV
                </a>

                {!isConfirmingClear ? (
                  <button
                    className="btn-admin-action btn-admin-danger"
                    onClick={() => setIsConfirmingClear(true)}
                  >
                    <Trash2 size={16} />
                    Reset Competition Data
                  </button>
                ) : (
                  <div className="confirm-delete-box">
                    <p className="confirm-text">
                      <strong>WARNING:</strong> This permanently deletes all participant records and reset the leaderboard.
                      Type <strong>RESET</strong> below to confirm.
                    </p>
                    <input
                      type="text"
                      className="confirm-input"
                      placeholder="Type RESET here"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      autoFocus
                    />
                    <div className="confirm-buttons">
                      <button
                        className="btn-confirm-delete"
                        onClick={handleClearAll}
                        disabled={confirmInput.trim() !== 'RESET' || isClearing}
                      >
                        {isClearing ? 'Clearing...' : 'Confirm Reset'}
                      </button>
                      <button
                        className="btn-cancel-delete"
                        onClick={() => {
                          setIsConfirmingClear(false);
                          setConfirmInput('');
                          setAdminError(null);
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
