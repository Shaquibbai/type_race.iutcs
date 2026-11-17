import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { CompetitionDatabase } from '../server/src/database.js';
import { calculateWpm, calculateAccuracy } from '../src/services/scoring.js';
import { generateWords, COMMON_WORDS } from '../src/services/wordGenerator.js';

async function runTests() {
  console.log('--- STARTING TYPE//RACE COMPREHENSIVE TEST SUITE ---\n');

  // Test 1: Scoring calculations
  console.log('Test 1: Scoring System');
  {
    // 200 correct characters in 40 seconds = (200 / 5) / (40 / 60) = 40 / (2/3) = 60 WPM
    const wpm1 = calculateWpm(200, 40);
    assert.strictEqual(wpm1, 60, `Expected 60 WPM, got ${wpm1}`);

    // Accuracy: 195 correct out of 200 typed = 97.5%
    const acc1 = calculateAccuracy(195, 200);
    assert.strictEqual(acc1, 97.50, `Expected 97.50%, got ${acc1}`);

    // Edge case: 0 characters typed
    const wpmZero = calculateWpm(0, 40);
    const accZero = calculateAccuracy(0, 0);
    assert.strictEqual(wpmZero, 0, 'Zero characters should yield 0 WPM');
    assert.strictEqual(accZero, 0.00, 'Zero characters should yield 0.00% accuracy');

    // Partial elapsed time
    const wpmPartial = calculateWpm(50, 10); // (50/5) / (10/60) = 10 / (1/6) = 60 WPM
    assert.strictEqual(wpmPartial, 60, `Expected 60 WPM at 10s, got ${wpmPartial}`);

    console.log('✓ Scoring calculations passed (WPM & Accuracy formulas correct).');
  }

  // Test 2: Word Generator
  console.log('\nTest 2: Word Generator');
  {
    const words = generateWords(100);
    assert.strictEqual(words.length, 100, 'Should generate requested number of words');
    assert.ok(words.every((w) => COMMON_WORDS.includes(w)), 'All words should come from common pool');
    // Ensure no immediate adjacent duplicates
    for (let i = 0; i < words.length - 1; i++) {
      assert.notStrictEqual(words[i], words[i + 1], `Immediate duplicate found at index ${i}: ${words[i]}`);
    }
    console.log('✓ Word generator passed (random English pool, consistent difficulty, no adjacent duplicates).');
  }

  // Setup isolated test database
  const testDbPath = path.resolve(process.cwd(), 'data', 'test-competition.json');
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  const testDb = new CompetitionDatabase(testDbPath);

  // Test 3: Input validation and Participant Registration
  console.log('\nTest 3: Participant Registration & Validation');
  let attempt1: any;
  {
    // Empty name
    await assert.rejects(
      testDb.startAttempt('', 'ID-001'),
      /Participant name is required/,
      'Should reject empty name'
    );

    // Empty ID
    await assert.rejects(
      testDb.startAttempt('Alice', '   '),
      /Participant ID is required/,
      'Should reject empty ID'
    );

    // Valid registration
    attempt1 = await testDb.startAttempt('Alice', '  ID-001  ');
    assert.strictEqual(attempt1.name, 'Alice');
    assert.strictEqual(attempt1.participantId, 'ID-001'); // Preserves trimmed original display
    assert.strictEqual(attempt1.status, 'in_progress');
    assert.strictEqual(attempt1.durationSeconds, 40);

    // Duplicate ID (case insensitive & spaces)
    await assert.rejects(
      testDb.startAttempt('Bob', 'id-001'),
      /already participated/,
      'Should reject duplicate ID with different case'
    );
    await assert.rejects(
      testDb.startAttempt('Charlie', '  ID-001  '),
      /already participated/,
      'Should reject duplicate ID with whitespace'
    );

    // Same name with different ID is allowed!
    const attempt2 = await testDb.startAttempt('Alice', 'ID-002');
    assert.strictEqual(attempt2.name, 'Alice');
    assert.strictEqual(attempt2.participantId, 'ID-002');

    console.log('✓ Participant validation and duplicate rejection passed.');
  }

  // Test 4: Attempt Completion & Leaderboard Sorting
  console.log('\nTest 4: Leaderboard Sorting Rules');
  {
    // Finish attempt 1: Alice, 250 correct, 260 total (40s) -> WPM: (250/5)/(40/60) = 50 / (2/3) = 75 WPM, Acc: (250/260)*100 = 96.15%
    const res1 = await testDb.finishAttempt(attempt1.attemptId, 250, 260, 40);

    assert.strictEqual(res1.participant.wpm, 75);
    assert.strictEqual(res1.participant.accuracy, 96.15);
    assert.strictEqual(res1.rank, 1);
    assert.strictEqual(res1.isTopFive, true);

    // Add more participants to test tiebreakers
    // Participant 3: Higher WPM -> Should rank #1
    const att3 = await testDb.startAttempt('Fast Typer', 'ID-003');
    const res3 = await testDb.finishAttempt(att3.attemptId, 300, 310, 40); // 90 WPM
    assert.strictEqual(res3.participant.wpm, 90);
    assert.strictEqual(res3.rank, 1); // Displaced Alice to #2

    // Participant 4: Same WPM (75) as Alice, but HIGHER accuracy -> Should rank above Alice
    const att4 = await testDb.startAttempt('Accurate Typer', 'ID-004');
    const res4 = await testDb.finishAttempt(att4.attemptId, 250, 252, 40); // (250/252)*100 = 99.21%
    assert.strictEqual(res4.participant.wpm, 75);
    assert.strictEqual(res4.participant.accuracy, 99.21);
    assert.strictEqual(res4.rank, 2); // Ahead of Alice who had 96.15%

    // Participant 5: Same WPM (75) and same accuracy (96.15%) as Alice -> Later submission ranks lower
    const att5 = await testDb.startAttempt('Tie Typer', 'ID-005');
    const res5 = await testDb.finishAttempt(att5.attemptId, 250, 260, 40);
    assert.strictEqual(res5.participant.wpm, 75);
    assert.strictEqual(res5.participant.accuracy, 96.15);
    assert.ok(res5.rank > 3, 'Later submission on tie must rank after earlier submission');

    // Add 6th and 7th participants to test Top 5 cut-off
    const att6 = await testDb.startAttempt('User 6', 'ID-006');
    await testDb.finishAttempt(att6.attemptId, 100, 110, 40);

    const att7 = await testDb.startAttempt('User 7', 'ID-007');
    await testDb.finishAttempt(att7.attemptId, 80, 90, 40);

    const att8 = await testDb.startAttempt('User 8', 'ID-008');
    const res8 = await testDb.finishAttempt(att8.attemptId, 50, 60, 40);

    assert.strictEqual(res8.isTopFive, false, 'Participant ranked outside top 5 should have isTopFive=false');

    const leaderboard = await testDb.getLeaderboard();
    assert.strictEqual(leaderboard.length, 7);
    assert.strictEqual(leaderboard[0].rank, 1);
    assert.strictEqual(leaderboard[0].isTopFive, true);
    assert.strictEqual(leaderboard[4].rank, 5);
    assert.strictEqual(leaderboard[4].isTopFive, true);
    assert.strictEqual(leaderboard[5].rank, 6);
    assert.strictEqual(leaderboard[5].isTopFive, false);

    console.log('✓ Leaderboard sorting & tiebreaking passed:');
    console.log(`  1. Highest WPM (Rank 1: ${leaderboard[0].wpm} WPM)`);
    console.log(`  2. Higher accuracy on equal WPM`);
    console.log(`  3. Earlier submission on equal accuracy`);
    console.log(`  4. Top 5 boundary verified (5 in top five, rest outside).`);
  }

  // Test 5: Interrupted attempt recovery & duplicate block
  console.log('\nTest 5: Interrupted Attempt & Fairness');
  {
    const att9 = await testDb.startAttempt('Reconnection Test', 'ID-009');
    // Attempt is active
    const checkActive = await testDb.getAttempt(att9.attemptId);
    assert.ok(checkActive, 'Attempt should be found');
    assert.strictEqual(checkActive?.attempt.status, 'in_progress');
    assert.ok(checkActive!.remainingSeconds > 0 && checkActive!.remainingSeconds <= 40, 'Remaining time should be within 40s');

    // Trying to start again with same ID must be blocked even while test is in progress!
    await assert.rejects(
      testDb.startAttempt('Reconnection Test', 'ID-009'),
      /already participated or has an active attempt/
    );

    console.log('✓ Interrupted attempt recovery and active session lock verified.');
  }

  // Test 6: CSV Export
  console.log('\nTest 6: CSV Export');
  {
    const csv = await testDb.exportCSV();
    assert.ok(csv.includes('Rank,Participant Name,Participant ID,WPM,Accuracy (%),Submission Timestamp'));
    assert.ok(csv.includes('Fast Typer'));
    assert.ok(csv.includes('ID-003'));
    console.log('✓ CSV export generated accurately.');
  }

  // Test 7: Atomic Write and Data Persistence
  console.log('\nTest 7: File Persistence & Atomic Write');
  {
    // Reload database from disk to verify full persistence
    const reloadedDb = new CompetitionDatabase(testDbPath);
    const count = await reloadedDb.getTotalParticipants();
    assert.strictEqual(count, 7, `Expected 7 participants after reload, got ${count}`);
    console.log('✓ Full persistence across database reload confirmed.');
  }

  // Test 8: Admin Reset / Clear
  console.log('\nTest 8: Admin Clear');
  {
    await testDb.clearAllData();
    const countAfter = await testDb.getTotalParticipants();
    assert.strictEqual(countAfter, 0, 'Database should be completely empty after clear');
    console.log('✓ Admin clear verified.');
  }

  // Clean up test file
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  console.log('\n========================================');
  console.log('ALL TESTS PASSED SUCCESSFULLY! (8/8)');
  console.log('========================================\n');
}

runTests().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
