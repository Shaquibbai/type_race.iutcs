import assert from 'assert';

/**
 * Unit tests for:
 * 1. Rolling-window live WPM calculation:
 *    Formula: (Correct characters in the last 5 seconds / 5) * 12
 * 2. Gradual decay when typing stops
 * 3. Handling incorrect characters and backspaces
 */
function testRollingLiveWpmLogic() {
  console.log('--- Testing Rolling-Window Live WPM Calculation ---');

  // Helper simulating the rolling window calculation
  function calculateRollingLiveWpm(
    charTimestamps: Map<string, number>,
    activeText: { wordIndex: number; charIndex: number; isCorrect: boolean }[],
    now: number
  ): number {
    const windowStart = now - 5000;
    let correctInWindow = 0;

    for (const item of activeText) {
      if (item.isCorrect) {
        const key = `${item.wordIndex}:${item.charIndex}`;
        const ts = charTimestamps.get(key);
        if (ts !== undefined && ts >= windowStart && ts <= now) {
          correctInWindow++;
        }
      }
    }

    // Official Formula: (Correct characters in the last 5 seconds / 5) * 12
    return Math.round((correctInWindow / 5) * 12);
  }

  const timestamps = new Map<string, number>();
  const activeChars: { wordIndex: number; charIndex: number; isCorrect: boolean }[] = [];

  // Scenario A: 0 characters -> 0 WPM
  const wpmZero = calculateRollingLiveWpm(timestamps, activeChars, 10000);
  assert.strictEqual(wpmZero, 0, 'Zero characters should yield 0 WPM');
  console.log('✓ Scenario A: Zero characters correctly produces 0 WPM');

  // Scenario B: Typing 25 correct characters across 5 seconds (5 chars per second = 60 WPM)
  // Timestamps at 1000, 2000, 3000, 4000, 5000 (5 per sec)
  let charCount = 0;
  for (let sec = 1; sec <= 5; sec++) {
    for (let c = 0; c < 5; c++) {
      const idx = charCount++;
      const timeMs = sec * 1000;
      timestamps.set(`0:${idx}`, timeMs);
      activeChars.push({ wordIndex: 0, charIndex: idx, isCorrect: true });
    }
  }

  // At now = 5000ms: all 25 chars are in [0, 5000]
  const wpm60 = calculateRollingLiveWpm(timestamps, activeChars, 5000);
  assert.strictEqual(wpm60, 60, `Expected 60 WPM for 25 chars in 5s, got ${wpm60}`);
  console.log('✓ Scenario B: 25 correct characters in 5 seconds yields exactly 60 WPM');

  // Scenario C: Typing stops for 2 seconds (now = 7000ms)
  // Window is [2000, 7000]. Characters from sec 1 (1000ms) have aged out (5 characters aged out, 20 left)
  // (20 / 5) * 12 = 48 WPM
  const wpmDecay1 = calculateRollingLiveWpm(timestamps, activeChars, 7000);
  assert.strictEqual(wpmDecay1, 48, `Expected 48 WPM at t=7000, got ${wpmDecay1}`);
  console.log('✓ Scenario C: Live WPM gradually decreases when typing pauses (60 -> 48 WPM)');

  // Scenario D: Typing stops for 5.1 seconds (now = 10100ms)
  // Window is [5100, 10100]. All characters aged out!
  const wpmDecayFull = calculateRollingLiveWpm(timestamps, activeChars, 10100);
  assert.strictEqual(wpmDecayFull, 0, `Expected 0 WPM after 5s pause, got ${wpmDecayFull}`);
  console.log('✓ Scenario D: Live WPM reaches 0 when no characters in the last 5 seconds');

  // Scenario E: Incorrect characters do NOT contribute
  const testNow = 15000;
  timestamps.set(`1:0`, testNow);
  activeChars.push({ wordIndex: 1, charIndex: 0, isCorrect: false }); // Incorrect 'x'
  const wpmWithIncorrect = calculateRollingLiveWpm(timestamps, activeChars, testNow);
  assert.strictEqual(wpmWithIncorrect, 0, 'Incorrect character must not contribute to live WPM');
  console.log('✓ Scenario E: Incorrect characters do not contribute to live WPM');

  // Scenario F: Backspace and correction
  // User backspaces the incorrect character (removed from activeChars and timestamps)
  activeChars.pop();
  timestamps.delete(`1:0`);
  // User types correct character 'c' at testNow + 200
  timestamps.set(`1:0`, testNow + 200);
  activeChars.push({ wordIndex: 1, charIndex: 0, isCorrect: true });
  const wpmCorrected = calculateRollingLiveWpm(timestamps, activeChars, testNow + 200);
  assert.strictEqual(wpmCorrected, 2, `(1 / 5) * 12 = 2.4 rounded to 2, got ${wpmCorrected}`);
  console.log('✓ Scenario F: Corrected character contributes after backspacing incorrect character');

  console.log('\nALL ROLLING LIVE WPM TESTS PASSED SUCCESSFULLY!\n');
}

testRollingLiveWpmLogic();
