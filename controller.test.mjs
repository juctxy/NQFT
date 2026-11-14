import assert from 'node:assert/strict';
import test from 'node:test';
import { clampJoystick, clampSpeed, determineDirection } from './controller.ts';

test('returns STOP for joystick movement inside the dead zone', () => {
  assert.equal(determineDirection(10, 10), 'STOP');
});

test('maps each joystick octant to its controller command', () => {
  assert.equal(determineDirection(40, 0), 'RIGHT');
  assert.equal(determineDirection(40, 40), 'BACKWARD_RIGHT');
  assert.equal(determineDirection(0, 40), 'BACKWARD');
  assert.equal(determineDirection(-40, 40), 'BACKWARD_LEFT');
  assert.equal(determineDirection(-40, 0), 'LEFT');
  assert.equal(determineDirection(-40, -40), 'FORWARD_LEFT');
  assert.equal(determineDirection(0, -40), 'FORWARD');
  assert.equal(determineDirection(40, -40), 'FORWARD_RIGHT');
});

test('clamps motor speed values to the PWM range', () => {
  assert.equal(clampSpeed(-5), 0);
  assert.equal(clampSpeed(256), 255);
  assert.equal(clampSpeed(132.6), 133);
});

test('treats non-finite motor speed values as zero', () => {
  assert.equal(clampSpeed(Number.NaN), 0);
  assert.equal(clampSpeed(Number.POSITIVE_INFINITY), 0);
});

test('limits joystick movement to its circular travel boundary', () => {
  assert.deepEqual(clampJoystick(100, 0, 50), { x: 50, y: 0 });

  const diagonal = clampJoystick(100, 100, 50);
  assert.ok(Math.hypot(diagonal.x, diagonal.y) <= 50);
});
