/**
 * Official TYPE//RACE Scoring Utilities
 */

/**
 * Calculates Words Per Minute (WPM) using the standard 5-character word convention:
 * WPM = (Correct Characters / 5) / Elapsed Time in Minutes
 *
 * @param correctChars Number of correctly typed characters
 * @param elapsedSeconds Time elapsed in seconds (capped at 40)
 */
export function calculateWpm(correctChars: number, elapsedSeconds: number): number {
  if (elapsedSeconds <= 0 || correctChars <= 0) {
    return 0;
  }
  const cappedElapsedSeconds = Math.min(40, Math.max(0.1, elapsedSeconds));
  const elapsedMinutes = cappedElapsedSeconds / 60;
  const wpm = (correctChars / 5) / elapsedMinutes;
  return Math.max(0, Math.round(wpm));
}

/**
 * Calculates typing accuracy percentage:
 * Accuracy = (Correct Characters / Total Typed Characters) * 100
 *
 * @param correctChars Number of correctly typed characters
 * @param totalTypedChars Total characters typed (including mistakes & spaces)
 */
export function calculateAccuracy(correctChars: number, totalTypedChars: number): number {
  if (totalTypedChars <= 0 || correctChars <= 0) {
    return 0.00;
  }
  const accuracy = (correctChars / totalTypedChars) * 100;
  // Capped at 100% and rounded to 2 decimal places
  return Number(Math.min(100, Math.max(0, accuracy)).toFixed(2));
}

/**
 * Formats accuracy percentage string
 */
export function formatAccuracy(accuracy: number): string {
  return `${accuracy.toFixed(2)}%`;
}
