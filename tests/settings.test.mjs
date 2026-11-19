import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, restoreSettings } from '../src/timer.ts';

test('restores the times and round count from the last workout', () => {
  const settings = { work: 367, rest: 84, rounds: 9 };
  assert.deepEqual(restoreSettings(JSON.stringify(settings)), settings);
});

test('restores the 10-minute and 12-round limits and supports no rest', () => {
  const settings = { work: 600, rest: 0, rounds: 12 };
  assert.deepEqual(restoreSettings(JSON.stringify(settings)), settings);
  assert.deepEqual(restoreSettings('{"work":659,"rest":5999,"rounds":99}'), {
    work: 600, rest: 5999, rounds: 12,
  });
});

test('uses defaults for missing storage or an invalid payload', () => {
  for (const raw of [null, '{bad data}', 'null', '1']) {
    assert.deepEqual(restoreSettings(raw), defaults);
  }
});

test('invalid fields fall back independently of valid fields', () => {
  assert.deepEqual(restoreSettings('{"work":0,"rest":75,"rounds":"6"}'), {
    work: defaults.work, rest: 75, rounds: defaults.rounds,
  });
  assert.deepEqual(restoreSettings('{"work":120,"rest":-1,"rounds":2.5}'), {
    work: 120, rest: defaults.rest, rounds: defaults.rounds,
  });
});
