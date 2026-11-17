import React, { useRef, useEffect } from 'react';
import { useTypingTest } from '../hooks/useTypingTest.js';
import { Clock, MousePointer } from 'lucide-react';

interface TypingTestProps {
  name: string;
  participantId: string;
  initialRemainingSeconds?: number;
  durationSeconds?: number;
  onStartTyping?: () => void;
  onFinish: (result: {
    correctCharacters: number;
    totalCharacters: number;
    wpm: number;
    accuracy: number;
  }) => void;
}

export const TypingTest: React.FC<TypingTestProps> = ({
  name,
  participantId,
  initialRemainingSeconds,
  durationSeconds = 40,
  onStartTyping,
  onFinish
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const wordsContainerRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLDivElement>(null);

  const {
    words,
    currentWordIndex,
    currentInput,
    wordHistory,
    remainingTime,
    liveWpm,
    liveAccuracy,
    hasStarted,
    isFinished,
    isFocused,
    setIsFocused,
    handleKeyDown,
    handleInputChange
  } = useTypingTest({
    durationSeconds,
    initialRemainingSeconds,
    onStartTyping,
    onFinish
  });

  // Keep input focused automatically
  useEffect(() => {
    if (inputRef.current && !isFinished) {
      inputRef.current.focus();
    }
  }, [isFinished]);

  // Focus lock on window click
  const focusInput = () => {
    if (inputRef.current && !isFinished) {
      inputRef.current.focus();
      setIsFocused(true);
    }
  };

  // Auto-scroll passage when active word moves to lower lines
  useEffect(() => {
    if (activeWordRef.current && wordsContainerRef.current) {
      const container = wordsContainerRef.current;
      const activeWord = activeWordRef.current;

      const containerTop = container.offsetTop;
      const wordTop = activeWord.offsetTop;
      const relativeTop = wordTop - containerTop;

      // Keep active line roughly in view (around 40-70px from top)
      if (relativeTop > 65) {
        container.scrollTo({
          top: relativeTop - 45,
          behavior: 'smooth'
        });
      } else if (relativeTop < 20) {
        container.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      }
    }
  }, [currentWordIndex]);

  return (
    <div className="typing-screen" onClick={focusInput}>
      {/* Hidden input field for reliable keystroke capture on all keyboards */}
      <input
        ref={inputRef}
        type="text"
        className="hidden-typing-input"
        value={currentInput}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={isFinished}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck="false"
      />

      {/* Top Header with live stats & countdown */}
      <div className="typing-header">
        <div className="typing-participant-info">
          <div>
            <div className="info-name">{name}</div>
            <div className="info-id">ID: #{participantId}</div>
          </div>
        </div>

        <div className="typing-live-stats">
          <div className="stat-item">
            <span className="stat-label">LIVE WPM</span>
            <span className="stat-value">{liveWpm}</span>
          </div>

          <div className="stat-item">
            <span className="stat-label">ACCURACY</span>
            <span className="stat-value">{liveAccuracy.toFixed(1)}%</span>
          </div>

          <div className="stat-item">
            <span className="stat-label">
              <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} />
              TIME LEFT
            </span>
            <span className={`stat-value-timer ${remainingTime <= 5 && hasStarted ? 'timer-urgent' : ''}`}>
              {remainingTime}s
            </span>
          </div>
        </div>
      </div>

      {/* Words Display Area */}
      <div
        ref={wordsContainerRef}
        className="words-container"
        style={{ position: 'relative' }}
      >
        {!isFocused && !isFinished && (
          <div className="focus-overlay" onClick={focusInput}>
            <div className="focus-message">
              <MousePointer size={22} />
              CLICK TO FOCUS & CONTINUE TYPING
            </div>
            <div className="focus-subtext">
              {hasStarted ? 'Timer is running — do not lose your pace!' : 'Click to focus, then type your first key to start the 40s timer!'}
            </div>
          </div>
        )}

        <div className="words-wrapper">
          {words.map((targetWord, wordIdx) => {
            const isCurrentWord = wordIdx === currentWordIndex;
            const isCompletedWord = wordIdx < currentWordIndex;
            const typedWord = isCurrentWord
              ? currentInput
              : isCompletedWord
              ? wordHistory[wordIdx] || ''
              : '';

            const hasError = isCompletedWord && typedWord !== targetWord;

            // Character breakdown
            const maxLen = Math.max(targetWord.length, typedWord.length);
            const chars: React.ReactNode[] = [];

            for (let i = 0; i < maxLen; i++) {
              const targetChar = targetWord[i];
              const typedChar = typedWord[i];

              let charStatus: 'untyped' | 'correct' | 'incorrect' | 'extra' = 'untyped';
              let displayChar = targetChar;

              if (i < typedWord.length) {
                if (i < targetWord.length) {
                  charStatus = typedChar === targetChar ? 'correct' : 'incorrect';
                  displayChar = targetChar;
                } else {
                  charStatus = 'extra';
                  displayChar = typedChar;
                }
              }

              // Caret insertion for active word
              const showCaretHere = isCurrentWord && i === currentInput.length;

              chars.push(
                <span key={i} style={{ position: 'relative', display: 'inline-block' }}>
                  {showCaretHere && <span className="caret" />}
                  <span className={`char ${charStatus}`}>{displayChar}</span>
                </span>
              );
            }

            // Caret at the very end of the typed word if typed beyond word length
            const showCaretAtEnd = isCurrentWord && currentInput.length >= targetWord.length;

            return (
              <div
                key={wordIdx}
                ref={isCurrentWord ? activeWordRef : null}
                className={`word ${isCompletedWord ? 'completed' : isCurrentWord ? 'active' : 'untyped'} ${
                  hasError ? 'has-error' : ''
                }`}
                style={{ position: 'relative' }}
              >
                {chars}
                {showCaretAtEnd && <span className="caret" style={{ left: '100%' }} />}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
