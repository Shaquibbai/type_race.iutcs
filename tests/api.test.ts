import assert from 'assert';
import fs from 'fs';
import path from 'path';
import appServer from '../server/src/index.js';

async function testApi() {
  console.log('Testing Express server and API endpoints directly...');

  const dbPath = path.resolve(process.cwd(), 'data', 'competition.json');
  const backup = fs.existsSync(dbPath) ? fs.readFileSync(dbPath, 'utf8') : null;

  try {
    // 1. Health check
    const healthRes = await fetch('http://127.0.0.1:3001/api/health');
    assert.strictEqual(healthRes.status, 200);
    const healthData = await healthRes.json();
    assert.strictEqual(healthData.status, 'ok');
    console.log('✓ Health endpoint /api/health returned 200 OK');

    // 2. Initial competition state
    const compRes = await fetch('http://127.0.0.1:3001/api/competition');
    assert.strictEqual(compRes.status, 200);
    const compData = await compRes.json();
    assert.ok(Array.isArray(compData.leaderboard));
    assert.strictEqual(typeof compData.totalParticipants, 'number');
    console.log('✓ Competition endpoint /api/competition returned valid structure');

    // 3. Start attempt validation
    const invalidStart = await fetch('http://127.0.0.1:3001/api/competition/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', participantId: '' })
    });
    assert.strictEqual(invalidStart.status, 400);
    console.log('✓ POST /api/competition/start rejected empty fields with 400 Bad Request');

    // 4. Start valid attempt
    const uniqueId = `TEST-${Date.now()}`;
    const validStart = await fetch('http://127.0.0.1:3001/api/competition/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Integration Tester', participantId: uniqueId })
    });
    assert.strictEqual(validStart.status, 201);
    const startData = await validStart.json();
    assert.ok(startData.attemptId);
    assert.strictEqual(startData.name, 'Integration Tester');
    assert.strictEqual(startData.participantId, uniqueId);
    console.log('✓ POST /api/competition/start created active attempt with 201 Created');

    // 5. Duplicate ID check
    const dupStart = await fetch('http://127.0.0.1:3001/api/competition/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Another User', participantId: uniqueId.toLowerCase() })
    });
    assert.strictEqual(dupStart.status, 409);
    console.log('✓ POST /api/competition/start rejected duplicate ID with 409 Conflict');

    // 6. Finish attempt
    const finishRes = await fetch('http://127.0.0.1:3001/api/competition/finish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        attemptId: startData.attemptId,
        correctCharacters: 200,
        totalCharacters: 200
      })
    });
    assert.strictEqual(finishRes.status, 200);
    const finishData = await finishRes.json();
    assert.strictEqual(finishData.participant.name, 'Integration Tester');
    assert.strictEqual(finishData.participant.accuracy, 100);
    assert.ok(finishData.rank >= 1, 'Rank should be a positive integer');
    console.log('✓ POST /api/competition/finish finalized attempt with 200 OK');

    // 7. Export CSV
    const exportRes = await fetch('http://127.0.0.1:3001/api/competition/export');
    assert.strictEqual(exportRes.status, 200);
    assert.ok(exportRes.headers.get('content-type')?.includes('text/csv'));
    const csvText = await exportRes.text();
    assert.ok(csvText.includes('Integration Tester'));
    console.log('✓ GET /api/competition/export returned CSV file');
  } finally {
    // Restore backup
    if (backup !== null) {
      fs.writeFileSync(dbPath, backup, 'utf8');
    }
    // Close server
    appServer.close();
  }

  console.log('\n✓ ALL SERVER ENDPOINTS TESTED AND VERIFIED SUCCESSFULLY!');
  process.exit(0);
}

testApi().catch((err) => {
  console.error('API Test Failed:', err);
  if (appServer && appServer.close) appServer.close();
  process.exit(1);
});
