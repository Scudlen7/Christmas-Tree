import assert from 'node:assert/strict';
import test from 'node:test';
import { createHandInteraction, readHand } from '../src/handInteraction.ts';

function hand(indexX = 0.5, gap = 0.02) {
  const landmarks = Array.from({ length: 21 }, () => ({ x: indexX, y: 0.7 }));
  landmarks[4] = { x: indexX + gap, y: 0.45 };
  landmarks[5] = { x: indexX - 0.05, y: 0.58 };
  landmarks[8] = { x: indexX, y: 0.45 };
  landmarks[17] = { x: indexX + 0.05, y: 0.58 };
  return landmarks;
}

test('a pinch grabs once, tolerates small movements and rearms after release', () => {
  const state = createHandInteraction();
  const read = (gap, viewing = false) => readHand(state, hand(0.4, gap), undefined, 4 / 3, viewing, 0);
  assert.deepEqual(read(0.041), { aim: { x: 0.6, y: 0.45 }, command: 'grab', rotation: 0, pinched: true });
  assert.equal(read(0.05, true).pinched, true);
  assert.equal(read(0.02, true).command, undefined);
  assert.equal(read(0.065, true).pinched, false);
  assert.equal(read(0.02).command, 'grab');
});

test('a held palm closes the preview without scattering the tree on the next frame', () => {
  const state = createHandInteraction();
  const palm = (time, viewing) => readHand(state, hand(0.5, 0.1), 'Open_Palm', 1, viewing, time);
  assert.equal(palm(0, true).command, undefined);
  assert.equal(palm(500, true).command, 'close');
  assert.equal(palm(600, false).command, undefined);
  readHand(state, undefined, undefined, 1, false, 700);
  assert.equal(palm(800, false).command, 'scatter');
});

test('pointing swipes once per stroke with mirrored directions', () => {
  const state = createHandInteraction();
  const point = (x, time, viewing = true) => readHand(state, hand(x, 0.09), 'Pointing_Up', 1, viewing, time);
  assert.equal(point(0.4, 0).command, undefined);
  assert.equal(point(0.62, 200).command, 'next');
  assert.equal(point(0.9, 300).command, undefined);
  readHand(state, undefined, undefined, 1, true, 400);
  assert.equal(point(0.7, 500).command, undefined);
  assert.equal(point(0.4, 600).command, 'previous');
  assert.equal(point(0.8, 700, false).rotation, 0);
});

test('a closed fist keeps assembling the tree and does not trigger a grab', () => {
  const state = createHandInteraction();
  const fist = (viewing) => readHand(state, hand(0.2), 'Closed_Fist', 1, viewing, 0);
  assert.equal(fist(false).command, 'assemble');
  assert.ok(fist(false).rotation > 0);
  assert.equal(fist(true).command, undefined);
  assert.equal(fist(true).rotation, 0);
});
