import { useState, useEffect, useRef, useCallback } from 'react';
import { generateWords } from '../services/wordGenerator.js';
import { calculateWpm, calculateAccuracy } from '../services/scoring.js';

export interface UseTypingTestOptions {
  durationSeconds?: number;
  initialRemainingSeconds?: number;
  onStartTyping?: () => void;
  onFinish: (result: { correctCharacters: number; totalCharacters: number; wpm: number; accuracy: number }) => void;
}

export function useTypingTest({
  durationSeconds = 40,
  initialRemainingSeconds,
  onStartTyping,
  onFinish
}: UseTypingTestOptions) {
  // Generate initial words
  const [words, setWords] = useState<string[]>(() => generateWords(200));
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [currentInput, setCurrentInput] = useState<string>('');
  const [wordHistory, setWordHistory] = useState<string[]>([]);

  // Keystroke statistics
  const [correctCharacters, setCorrectCharacters] = useState<number>(0);
  const [totalTypedCharacters, setTotalTypedCharacters] = useState<number>(0);

  // Realtime metrics
  const [liveWpm, setLiveWpm] = useState<number>(0);
  const [liveAccuracy, setLiveAccuracy] = useState<number>(100);

  // Timer & state
  const targetDuration = initialRemainingSeconds ?? durationSeconds;
  // If recovered attempt where time has already elapsed, start running immediately
  const isRecoveredActive = initialRemainingSeconds !== undefined && initialRemainingSeconds < durationSeconds;

  const [hasStarted, setHasStarted] = useState<boolean>(isRecoveredActive);
  const [remainingTime, setRemainingTime] = useState<number>(targetDuration);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isFocused, setIsFocused] = useState<boolean>(true);

  // Mutable refs to keep interval callbacks fast without stale closures
  const hasStartedRef = useRef<boolean>(isRecoveredActive);
  const startTimeRef = useRef<number>(Date.now());
  const endTimeRef = useRef<number>(Date.now() + targetDuration * 1000);
  const isFinishedRef = useRef<boolean>(false);

  const currentWordIndexRef = useRef<number>(0);
  const currentInputRef = useRef<string>('');
  const wordHistoryRef = useRef<string[]>([]);
  const wordsRef = useRef<string[]>(words);

  // Character timestamps map: `${wordIndex}:${charIndex}` or `${wordIndex}:space` -> timestamp ms
  const charTimestampsRef = useRef<Map<string, number>>(new Map());

  const onStartTypingRef = useRef(onStartTyping);
  onStartTypingRef.current = onStartTyping;

  const onFinishRef = useRef(onFinish);
  onFinishRef.current = onFinish;

  // Sync state refs whenever state changes
  useEffect(() => {
    wordsRef.current = words;
  }, [words]);

  // Compute overall character counts for scoring & live accuracy
  const computeLiveStats = useCallback((
    history: string[],
    activeInput: string,
    wordList: string[]
  ) => {
    let correct = 0;
    let totalTyped = 0;

    // Process completed words
    for (let w = 0; w < history.length; w++) {
      const targetWord = wordList[w] || '';
      const typed = history[w] || '';

      totalTyped += typed.length + 1; // +1 for the space key

      let wordCorrect = 0;
      const minLen = Math.min(targetWord.length, typed.length);
      for (let i = 0; i < minLen; i++) {
        if (typed[i] === targetWord[i]) {
          wordCorrect++;
        }
      }
      correct += wordCorrect;

      // If the word was typed completely correctly, the space is also counted as correct
      if (typed === targetWord) {
        correct += 1;
      }
    }

    // Process current word
    const activeTarget = wordList[history.length] || '';
    totalTyped += activeInput.length;
    const minLenActive = Math.min(activeTarget.length, activeInput.length);
    for (let i = 0; i < minLenActive; i++) {
      if (activeInput[i] === activeTarget[i]) {
        correct++;
      }
    }

    return { correct, totalTyped };
  }, []);

  /**
   * Rolling-window live WPM calculation:
   * - Uses correct characters typed during the most recent 5 seconds.
   * - Formula: (Correct characters in the last 5 seconds / 5) * 12
   * - If the participant stops typing, drops gradually toward zero.
   * - Incorrect characters do not contribute.
   */
  const computeRollingLiveWpm = useCallback((now: number): number => {
    if (!hasStartedRef.current || isFinishedRef.current) {
      return 0;
    }

    const windowStart = now - 5000;
    let correctInWindow = 0;

    const history = wordHistoryRef.current;
    const wordList = wordsRef.current;
    const currWordIdx = currentWordIndexRef.current;
    const currInput = currentInputRef.current;

    // Scan recent completed words
    const startWord = Math.max(0, currWordIdx - 35);
    for (let w = startWord; w < history.length; w++) {
      const target = wordList[w] || '';
      const typed = history[w] || '';

      const minLen = Math.min(target.length, typed.length);
      for (let i = 0; i < minLen; i++) {
        // Only currently correct characters count
        if (typed[i] === target[i]) {
          const ts = charTimestampsRef.current.get(`${w}:${i}`);
          if (ts !== undefined && ts >= windowStart && ts <= now) {
            correctInWindow++;
          }
        }
      }

      // Space after completed word
      if (typed === target) {
        const spaceTs = charTimestampsRef.current.get(`${w}:space`);
        if (spaceTs !== undefined && spaceTs >= windowStart && spaceTs <= now) {
          correctInWindow++;
        }
      }
    }

    // Scan current active word
    const currentTarget = wordList[currWordIdx] || '';
    const currentMinLen = Math.min(currentTarget.length, currInput.length);
    for (let i = 0; i < currentMinLen; i++) {
      if (currInput[i] === currentTarget[i]) {
        const ts = charTimestampsRef.current.get(`${currWordIdx}:${i}`);
        if (ts !== undefined && ts >= windowStart && ts <= now) {
          correctInWindow++;
        }
      }
    }

    // Formula: (Correct characters in the last 5 seconds / 5) * 12
    return Math.round((correctInWindow / 5) * 12);
  }, []);

  // Finalize test handler
  const finalizeTest = useCallback(() => {
    if (isFinishedRef.current) return;
    isFinishedRef.current = true;
    setIsFinished(true);

    // Compute final character stats
    const { correct, totalTyped } = computeLiveStats(
      wordHistoryRef.current,
      currentInputRef.current,
      wordsRef.current
    );
    const finalWpm = calculateWpm(correct, durationSeconds);
    const finalAccuracy = calculateAccuracy(correct, totalTyped);

    onFinishRef.current({
      correctCharacters: correct,
      totalCharacters: totalTyped,
      wpm: finalWpm,
      accuracy: finalAccuracy
    });
  }, [computeLiveStats, durationSeconds]);

  // Starts the timer when the first valid typing key is pressed
  const startTestTimer = useCallback(() => {
    if (hasStartedRef.current || isFinishedRef.current) return;
    hasStartedRef.current = true;
    setHasStarted(true);

    const now = Date.now();
    startTimeRef.current = now;
    endTimeRef.current = now + targetDuration * 1000;

    if (onStartTypingRef.current) {
      onStartTypingRef.current();
    }
  }, [targetDuration]);

  // Interval loop: runs every 250ms to refresh remaining time and rolling live WPM
  useEffect(() => {
    const timer = setInterval(() => {
      // Do nothing until participant has typed their first valid key
      if (!hasStartedRef.current || isFinishedRef.current) {
        return;
      }

      const now = Date.now();
      const remainingMs = endTimeRef.current - now;
      const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000));
      setRemainingTime(secondsLeft);

      // Refresh rolling live WPM approximately every 250ms
      const rollingWpm = computeRollingLiveWpm(now);
      setLiveWpm(rollingWpm);

      if (remainingMs <= 0) {
        clearInterval(timer);
        finalizeTest();
      }
    }, 250);

    return () => clearInterval(timer);
  }, [computeRollingLiveWpm, finalizeTest]);

  // Handle keyboard events
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (isFinishedRef.current) {
        e.preventDefault();
        return;
      }

      // Ignore modifier keys
      if (e.ctrlKey || e.altKey || e.metaKey) {
        return;
      }

      // Check if test needs to start on this first valid typing key
      if (!hasStartedRef.current) {
        // Only single printable characters or Space can start the test
        if (e.key.length === 1) {
          // If Space on empty input, ignore (don't advance or start)
          if (e.key === ' ' && currentInputRef.current.length === 0) {
            e.preventDefault();
            return;
          }
          startTestTimer();
        } else {
          // Non-character keys (Shift, Tab, CapsLock, Escape, Arrow keys, etc.) do not start timer
          return;
        }
      }

      // Space key: submit current word and move to next
      if (e.key === ' ') {
        e.preventDefault();
        if (currentInputRef.current.length === 0) {
          // Do not advance on empty space
          return;
        }

        const completedWord = currentInputRef.current;
        const wordIdx = currentWordIndexRef.current;
        const now = Date.now();

        // Record space timestamp
        charTimestampsRef.current.set(`${wordIdx}:space`, now);

        const newHistory = [...wordHistoryRef.current, completedWord];
        const nextIndex = wordIdx + 1;

        wordHistoryRef.current = newHistory;
        currentWordIndexRef.current = nextIndex;
        currentInputRef.current = '';

        setWordHistory(newHistory);
        setCurrentWordIndex(nextIndex);
        setCurrentInput('');

        // Generate more words dynamically if approaching the end
        if (nextIndex > wordsRef.current.length - 30) {
          setWords((prev) => {
            const added = [...prev, ...generateWords(100)];
            wordsRef.current = added;
            return added;
          });
        }

        // Update overall stats & live accuracy
        const { correct, totalTyped } = computeLiveStats(newHistory, '', wordsRef.current);
        setCorrectCharacters(correct);
        setTotalTypedCharacters(totalTyped);
        setLiveAccuracy(calculateAccuracy(correct, totalTyped));

        // Update live WPM immediately
        setLiveWpm(computeRollingLiveWpm(now));
        return;
      }

      // Backspace key
      if (e.key === 'Backspace') {
        const activeInput = currentInputRef.current;
        const wordIdx = currentWordIndexRef.current;

        if (activeInput.length > 0) {
          // Normal backspace: remove character timestamp
          charTimestampsRef.current.delete(`${wordIdx}:${activeInput.length - 1}`);
          return;
        }

        // Backspace to previous word if allowed
        if (activeInput.length === 0 && wordIdx > 0) {
          e.preventDefault();
          const prevIndex = wordIdx - 1;
          const previousWordInput = wordHistoryRef.current[prevIndex] || '';
          const newHistory = wordHistoryRef.current.slice(0, prevIndex);
          const now = Date.now();

          // Remove trailing space timestamp of previous word
          charTimestampsRef.current.delete(`${prevIndex}:space`);

          wordHistoryRef.current = newHistory;
          currentWordIndexRef.current = prevIndex;
          currentInputRef.current = previousWordInput;

          setWordHistory(newHistory);
          setCurrentWordIndex(prevIndex);
          setCurrentInput(previousWordInput);

          const { correct, totalTyped } = computeLiveStats(newHistory, previousWordInput, wordsRef.current);
          setCorrectCharacters(correct);
          setTotalTypedCharacters(totalTyped);
          setLiveAccuracy(calculateAccuracy(correct, totalTyped));
          setLiveWpm(computeRollingLiveWpm(now));
          return;
        }
      }
    },
    [computeLiveStats, computeRollingLiveWpm, startTestTimer]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isFinishedRef.current) return;
    const value = e.target.value;
    // Don't allow spaces to be typed directly into word string
    if (value.endsWith(' ')) return;

    // Safety check: ensure timer starts on first input change if not started yet
    if (!hasStartedRef.current && value.length > 0) {
      startTestTimer();
    }

    const wordIdx = currentWordIndexRef.current;
    const prevLen = currentInputRef.current.length;
    const newLen = value.length;
    const now = Date.now();

    if (newLen > prevLen) {
      // Record timestamps for newly added character(s)
      for (let i = prevLen; i < newLen; i++) {
        charTimestampsRef.current.set(`${wordIdx}:${i}`, now);
      }
    } else if (newLen < prevLen) {
      // Remove timestamps for deleted character(s)
      for (let i = newLen; i < prevLen; i++) {
        charTimestampsRef.current.delete(`${wordIdx}:${i}`);
      }
    }

    currentInputRef.current = value;
    setCurrentInput(value);

    // Update overall stats & live accuracy
    const { correct, totalTyped } = computeLiveStats(
      wordHistoryRef.current,
      value,
      wordsRef.current
    );
    setCorrectCharacters(correct);
    setTotalTypedCharacters(totalTyped);
    setLiveAccuracy(calculateAccuracy(correct, totalTyped));

    // Update live WPM
    setLiveWpm(computeRollingLiveWpm(now));
  };

  return {
    words,
    currentWordIndex,
    currentInput,
    wordHistory,
    remainingTime,
    liveWpm,
    liveAccuracy,
    correctCharacters,
    totalTypedCharacters,
    hasStarted,
    isFinished,
    isFocused,
    setIsFocused,
    handleKeyDown,
    handleInputChange
  };
}
