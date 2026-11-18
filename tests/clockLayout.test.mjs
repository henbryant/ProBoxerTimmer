import assert from 'node:assert/strict';
import test from 'node:test';
import { clockLayout } from '../src/clockLayout.ts';

test('landscape uses extra vertical space without changing the digit width', () => {
  const bounds = { width: 730, height: 320 };
  const normal = clockLayout(bounds, false);
  const stretched = clockLayout(bounds, true);

  assert.equal(stretched.fontSize, normal.fontSize);
  assert.ok(stretched.scaleY >= 1.3);
  assert.ok(stretched.scaleY <= 1.4);
  assert.ok(stretched.fontSize * stretched.scaleY <= bounds.height);
});

test('landscape also fits shorter displays and respects the available height', () => {
  const bounds = { width: 880, height: 285 };
  const { fontSize, scaleY } = clockLayout(bounds, true);

  assert.ok(scaleY > 1 && scaleY < 1.4);
  assert.ok(fontSize * scaleY >= bounds.height * 0.95);
  assert.ok(fontSize * scaleY <= bounds.height * 0.96);
});

test('a very short landscape layout shrinks the font before stretching', () => {
  const { fontSize, scaleY } = clockLayout({ width: 880, height: 120 }, true);

  assert.equal(fontSize, 115);
  assert.ok(fontSize * scaleY <= 120 * 0.96);
});

test('portrait and the fallback font use proportional digits', () => {
  assert.deepEqual(clockLayout({ width: 360, height: 630 }, false), { fontSize: 103, scaleY: 1 });
  assert.equal(clockLayout({ width: 730, height: 320 }, false).scaleY, 1);
});

test('the clock waits for the first layout measurement', () => {
  assert.deepEqual(clockLayout({ width: 0, height: 0 }, true), { fontSize: 0, scaleY: 1 });
});
