import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, formatTime, frameAt, isGongBoundary, parseSetting } from '../src/timer.ts';

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
  assert.equal(frameAt({ ...defaults, rounds: 1 }, 180000).phase, 'finished');
  assert.equal(formatTime(defaults.work), '03:00');
  assert.equal(formatTime(defaults.rest), '00:30');
});

test('the timer keeps the same five-character display up to the maximum duration', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(59), '00:59');
  assert.equal(formatTime(60), '01:00');
  assert.equal(formatTime(5999), '99:59');
});

test('accepts only whole numbers inside the allowed range', () => {
  for (const input of ['', ' ', '-1', '1.5', '1e1', '100']) {
    assert.equal(parseSetting(input, 1, 99), null);
  }
  assert.equal(parseSetting('0', 0, 5999), 0);
  assert.equal(parseSetting('03', 1, 99), 3);
});
