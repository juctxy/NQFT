import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampJoystick,
  clampSpeed,
  determineDirection,
  getMatchingSpeedPreset,
} from './controller.ts';
import * as controller from './controller.ts';

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

test('does not republish a joystick command when its direction is unchanged', () => {
  assert.equal(controller.getChangedCommand('FORWARD', 'FORWARD'), null);
});

test('publishes joystick direction changes and the first STOP command', () => {
  assert.equal(controller.getChangedCommand('FORWARD', 'RIGHT'), 'RIGHT');
  assert.equal(controller.getChangedCommand('FORWARD', 'STOP'), 'STOP');
});

test('does not republish STOP when the joystick is already stopped', () => {
  assert.equal(controller.getChangedCommand('STOP', 'STOP'), null);
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

test('matches the unique preset shared by both motor speeds', () => {
  assert.equal(
    getMatchingSpeedPreset(190, 190, {
      slow: 130,
      medium: 190,
      fast: 255,
    }),
    'medium',
  );
});

test('returns no preset when motor speeds are unequal', () => {
  assert.equal(
    getMatchingSpeedPreset(190, 130, {
      slow: 130,
      medium: 190,
      fast: 255,
    }),
    null,
  );
});

test('returns no preset when neither motor speed matches a configured value', () => {
  assert.equal(
    getMatchingSpeedPreset(140, 140, {
      slow: 130,
      medium: 190,
      fast: 255,
    }),
    null,
  );
});

test('returns no preset when multiple presets share the motor speed', () => {
  assert.equal(
    getMatchingSpeedPreset(190, 190, {
      slow: 190,
      medium: 190,
      fast: 255,
    }),
    null,
  );
});

test('matches against the current preset values', () => {
  const updatedPresets = { slow: 130, medium: 205, fast: 255 };

  assert.equal(
    getMatchingSpeedPreset(205, 205, updatedPresets),
    'medium',
  );
  assert.equal(
    getMatchingSpeedPreset(190, 190, updatedPresets),
    null,
  );
});

test('uses Vietnamese labels for preset and custom speeds', () => {
  assert.equal(typeof controller.getSpeedPresetLabel, 'function');
  assert.deepEqual(
    [
      controller.getSpeedPresetLabel('slow'),
      controller.getSpeedPresetLabel('medium'),
      controller.getSpeedPresetLabel('fast'),
      controller.getSpeedPresetLabel(null),
    ],
    ['Chậm', 'Vừa', 'Nhanh', 'Tùy chỉnh'],
  );
});
