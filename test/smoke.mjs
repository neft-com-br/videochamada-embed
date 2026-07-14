// Minimal, browser-free smoke test for the pure helpers.
// Run: npm test
import assert from 'node:assert/strict';
import { buildCallUrl, FEATURE_ALIASES } from '../src/index.js';

let passed = 0;
const ok = (name) => { console.log(`  ✓ ${name}`); passed++; };

// Base URL + call id -> /chamada/:id
{
  const url = buildCallUrl({ baseUrl: 'https://acme.videochamada.com.br', callId: 'abc-123' });
  assert.equal(url, 'https://acme.videochamada.com.br/chamada/abc-123');
  ok('builds the /chamada/:id url');
}

// Trailing slash on baseUrl is normalized
{
  const url = buildCallUrl({ baseUrl: 'https://acme.videochamada.com.br/', callId: 'x' });
  assert.equal(url, 'https://acme.videochamada.com.br/chamada/x');
  ok('normalizes trailing slash');
}

// username + userId
{
  const url = new URL(buildCallUrl({ baseUrl: 'https://a.com', callId: 'x', username: 'Maria Silva', userId: 'u1' }));
  assert.equal(url.searchParams.get('username'), 'Maria Silva');
  assert.equal(url.searchParams.get('userid'), 'u1');
  ok('adds username and userid');
}

// hideControls -> controlBar=0
{
  const url = new URL(buildCallUrl({ baseUrl: 'https://a.com', callId: 'x', hideControls: true }));
  assert.equal(url.searchParams.get('controlBar'), '0');
  ok('hideControls disables the control bar');
}

// features: only false emits a param; true/undefined do not
{
  const url = new URL(buildCallUrl({ baseUrl: 'https://a.com', callId: 'x', features: { chat: false, clock: true, recording: false } }));
  assert.equal(url.searchParams.get('chat'), '0');
  assert.equal(url.searchParams.get('recording'), '0');
  assert.equal(url.searchParams.get('clock'), null, 'true must not emit a param');
  ok('features: only false disables');
}

// explicit features.controlBar wins over hideControls default
{
  const url = new URL(buildCallUrl({ baseUrl: 'https://a.com', callId: 'x', hideControls: true, features: { controlBar: true } }));
  assert.equal(url.searchParams.get('controlBar'), null);
  ok('explicit controlBar overrides hideControls');
}

// every documented alias maps to itself (guards against docs/code drift)
{
  const expected = ['chat','clock','controlBar','closeButton','raiseHand','screenShare','recording','transcription','virtualBackground','hardwareTest','pendingCallCard','nameInput','waitingRoom','summary'];
  assert.deepEqual(Object.keys(FEATURE_ALIASES).sort(), expected.slice().sort());
  ok('feature aliases match the call app toggle set');
}

// missing required opts throw
{
  assert.throws(() => buildCallUrl({ callId: 'x' }), /baseUrl/);
  assert.throws(() => buildCallUrl({ baseUrl: 'https://a.com' }), /callId/);
  ok('throws on missing baseUrl / callId');
}

console.log(`\n${passed} checks passed.`);
