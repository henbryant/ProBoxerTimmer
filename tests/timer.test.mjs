import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, formatTime, frameAt, isGongBoundary, prepareSession, stopSession } from '../src/timer.ts';

test('two rounds ring on start, entering rest, starting round two and finishing', () => {
  const settings = { work: 10, rest: 3, rounds: 2 };
  let previous = null;
  const cues = [];
  for (let ms = 0; ms <= 24000; ms += 100) {
    const frame = frameAt(settings, ms);
    if (isGongBoundary(previous, frame)) cues.push([ms, frame.phase, frame.round, frame.seconds]);
    previous = frame;
  }
  assert.deepEqual(cues, [
    [0, 'work', 1, 10], [10000, 'rest', 1, 3],
    [13000, 'work', 2, 10], [23000, 'finished', 2, 0],
  ]);
});

test('zero rest gives one cue for the shared end/start boundary', () => {
  const settings = { work: 3, rest: 0, rounds: 2 };
  const before = frameAt(settings, 2999);
  const after = frameAt(settings, 3000);
  assert.deepEqual(after, { phase: 'work', round: 2, seconds: 3 });
  assert.ok(isGongBoundary(before, after));
  assert.equal(frameAt(settings, 6000).phase, 'finished');
});

test('a single round ends directly and defaults display in minutes and seconds', () => {
  const settings = { ...defaults, rounds: 1 };
  const finished = { phase: 'finished', round: 1, seconds: 0 };
  assert.deepEqual(frameAt(settings, 180000), finished);
  assert.deepEqual(frameAt(settings, 200000), finished);
  assert.equal(formatTime(defaults.work), '3:00');
  assert.equal(formatTime(defaults.rest), '0:30');
});

test('a manual stop shows zero without marking the workout completed', () => {
  const session = {
    ...prepareSession(defaults),
    frame: { phase: 'rest', round: 2, seconds: 24 },
    ready: false,
    startedAt: 1000,
  };
  assert.deepEqual(stopSession(session), {
    ...session,
    frame: { phase: 'stopped', round: 2, seconds: 0 },
    startedAt: null,
  });
});

test('the timer displays minutes without zero padding and seconds with two digits', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(59), '0:59');
  assert.equal(formatTime(60), '1:00');
  assert.equal(formatTime(599), '9:59');
  assert.equal(formatTime(600), '10:00');
  assert.equal(formatTime(5999), '99:59');
});

test('reset prepares round one at the configured duration without starting the clock', () => {
  const settings = { work: 75, rest: 18, rounds: 4 };
  const ready = prepareSession(settings);
  assert.deepEqual(ready, {
    settings, elapsed: 0, startedAt: null, ready: true,
    frame: { phase: 'work', round: 1, seconds: 75 },
  });
});
