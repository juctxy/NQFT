import assert from 'node:assert/strict';
import test from 'node:test';
import {
  clampJoystick,
  clampSpeed,
  determineDirection,
  getMatchingSpeedPreset,
  scaleControllerCanvas,
} from './controller.ts';
import { loadDriveSettings, saveDriveSettings } from './context/driveSettingsStorage.ts';
import * as controller from './controller.ts';
import * as drive from './drive.ts';

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

test('uses viewport dimensions for web canvas scale when layout measurement is zero', () => {
  assert.equal(
    scaleControllerCanvas('web', { width: 646, height: 382 }, { width: 0, height: 0 }, 840, 380),
    0.7382857142857143,
  );
});

test('falls back to measured layout dimensions before the web viewport is ready', () => {
  assert.equal(
    scaleControllerCanvas('web', { width: 0, height: 0 }, { width: 646, height: 382 }, 840, 380),
    0.7382857142857143,
  );
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

test('provides default drive settings and three wheel-specific profiles', () => {
  assert.deepEqual(controller.DEFAULT_DRIVE_CONFIG, {
    mode: 'standard',
    vMain: 190,
    vSide: 190,
    vSub: 90,
    trim: 0,
    softStartMs: 0,
  });
  assert.deepEqual(controller.DEFAULT_DRIVE_PROFILES, {
    preset1: { ...controller.DEFAULT_DRIVE_CONFIG, vMain: 130, vSide: 130 },
    preset2: { ...controller.DEFAULT_DRIVE_CONFIG },
    preset3: { ...controller.DEFAULT_DRIVE_CONFIG, vMain: 255, vSide: 255 },
  });
});

test('normalizes drive config modes and values to safe ranges without mutating input', () => {
  const input = {
    mode: 'mecanum',
    vMain: 256,
    vSide: -4,
    vSub: Number.NaN,
    trim: 50,
    softStartMs: 401,
  };

  assert.deepEqual(controller.normalizeDriveConfig(input), {
    mode: 'mecanum',
    vMain: 255,
    vSide: 0,
    vSub: 90,
    trim: 30,
    softStartMs: 400,
  });
  assert.deepEqual(input, {
    mode: 'mecanum',
    vMain: 256,
    vSide: -4,
    vSub: Number.NaN,
    trim: 50,
    softStartMs: 401,
  });
  assert.deepEqual(controller.normalizeDriveConfig({ mode: 'unknown' }), {
    ...controller.DEFAULT_DRIVE_CONFIG,
  });
  assert.deepEqual(controller.normalizeDriveConfig(null), {
    ...controller.DEFAULT_DRIVE_CONFIG,
  });
});

test('normalizes missing and malformed drive profiles to each slot default', () => {
  assert.deepEqual(
    controller.normalizeDriveProfiles({
      preset1: { mode: 'omni', vMain: 128 },
      preset2: 'invalid',
    }),
    {
      preset1: {
        ...controller.DEFAULT_DRIVE_PROFILES.preset1,
        mode: 'omni',
        vMain: 128,
      },
      preset2: { ...controller.DEFAULT_DRIVE_PROFILES.preset2 },
      preset3: { ...controller.DEFAULT_DRIVE_PROFILES.preset3 },
    },
  );
});

test('ignores edits before hydration and saves profiles as independent snapshots', () => {
  const initial = controller.DEFAULT_DRIVE_SETTINGS_STATE;
  const earlyEdit = controller.driveSettingsReducer(initial, {
    type: 'changeConfig',
    key: 'vMain',
    value: 10,
  });
  assert.equal(earlyEdit, initial);

  const hydrated = controller.driveSettingsReducer(initial, {
    type: 'hydrate',
    config: controller.DEFAULT_DRIVE_CONFIG,
    profiles: controller.DEFAULT_DRIVE_PROFILES,
  });
  const changed = controller.driveSettingsReducer(hydrated, {
    type: 'changeConfig',
    key: 'vMain',
    value: 77,
  });
  const saved = controller.driveSettingsReducer(changed, {
    type: 'saveProfile',
    id: 'preset2',
  });
  const editedAgain = controller.driveSettingsReducer(saved, {
    type: 'changeConfig',
    key: 'vMain',
    value: 88,
  });

  assert.equal(saved.profiles.preset2.vMain, 77);
  assert.equal(editedAgain.profiles.preset2.vMain, 77);
  assert.equal(
    controller.driveSettingsReducer(editedAgain, {
      type: 'loadProfile',
      id: 'preset2',
    }).config.vMain,
    77,
  );
});

test('loads default drive settings when no local configuration exists', async () => {
  const storage = {
    async getItem() {
      return null;
    },
    async setItem() {},
  };

  assert.deepEqual(await loadDriveSettings(storage), drive.DEFAULT_DRIVE_SETTINGS);
});

test('persists and normalizes drive settings through local storage', async () => {
  const values = new Map();
  const storage = {
    async getItem(key) {
      return values.get(key) ?? null;
    },
    async setItem(key, value) {
      values.set(key, value);
    },
  };
  const settings = {
    ...drive.DEFAULT_DRIVE_SETTINGS,
    profiles: [
      drive.setDriveWheelType(drive.DEFAULT_DRIVE_SETTINGS.profiles[0], 'omni'),
      drive.DEFAULT_DRIVE_SETTINGS.profiles[1],
    ],
  };

  await saveDriveSettings(storage, settings);

  assert.deepEqual(await loadDriveSettings(storage), settings);

  values.set(
    '@nqft/robot-drive-settings',
    JSON.stringify({
      ...settings,
      profiles: [{ ...settings.profiles[0], minPwm: 200, maxLimit: 100 }],
    }),
  );
  assert.equal((await loadDriveSettings(storage)).profiles[0].minPwm, 100);
});

test('migrates existing locally saved drive presets to editable robot profiles', async () => {
  const legacy = JSON.stringify({
    config: { mode: 'mecanum', vMain: 180, vSide: 210, vSub: 80 },
    profiles: {
      preset1: { mode: 'standard', vMain: 130, vSide: 120 },
      preset2: { mode: 'omni', vMain: 190, vSide: 200 },
    },
  });
  const loaded = await loadDriveSettings({
    async getItem(key) {
      return key === '@nqft/drive-settings' ? legacy : null;
    },
    async setItem() {},
  });

  assert.equal(loaded.profiles.length, 2);
  assert.equal(loaded.profiles[1].wheelType, 'omni');
  assert.equal(loaded.profiles[1].levels.medium.vFwd, 190);
  assert.equal(loaded.profiles[1].levels.medium.vTurn, 200);
});

test('propagates local storage read and write failures', async () => {
  const readError = new Error('read failed');
  const writeError = new Error('write failed');

  await assert.rejects(
    loadDriveSettings({
      async getItem() {
        throw readError;
      },
      async setItem() {},
    }),
    readError,
  );
  await assert.rejects(
    saveDriveSettings(
      {
        async getItem() {
          return null;
        },
        async setItem() {
          throw writeError;
        },
      },
      { config: controller.DEFAULT_DRIVE_CONFIG, profiles: controller.DEFAULT_DRIVE_PROFILES },
    ),
    writeError,
  );
});

test('matches one drive profile only when both motor speeds identify it uniquely', () => {
  const profiles = controller.DEFAULT_DRIVE_PROFILES;

  assert.equal(controller.getMatchingDriveProfile(130, 130, profiles), 'preset1');
  assert.equal(controller.getMatchingDriveProfile(130, 120, profiles), null);
  assert.equal(controller.getMatchingDriveProfile(200, 200, profiles), null);
  assert.equal(
    controller.getMatchingDriveProfile(130, 130, {
      ...profiles,
      preset2: { ...profiles.preset2, vMain: 130 },
    }),
    null,
  );
});

test('uses the selected profile V_main for both motor speed controls', () => {
  assert.deepEqual(
    controller.getDriveProfileMotorSpeeds(
      controller.DEFAULT_DRIVE_PROFILES,
      'preset3',
    ),
    { motor1Speed: 255, motor2Speed: 255 },
  );
});

test('marks slider settings for persistence only after commit', () => {
  const hydrated = controller.driveSettingsReducer(
    controller.DEFAULT_DRIVE_SETTINGS_STATE,
    {
      type: 'hydrate',
      ...drive.DEFAULT_DRIVE_SETTINGS,
    },
  );
  const draft = controller.driveSettingsReducer(hydrated, {
    type: 'changeConfig',
    key: 'vMain',
    value: 111,
  });
  assert.equal(draft.config.vMain, 111);
  assert.equal(draft.revision, hydrated.revision);

  const committed = controller.driveSettingsReducer(draft, { type: 'commit' });
  assert.equal(committed.revision, draft.revision + 1);
  assert.equal(committed.config.vMain, 111);
});

test('clips analog joystick input to a unit circle and applies a radial deadzone', () => {
    assert.deepEqual(drive.normalizeJoystick(0.02, -0.02), { x: 0, y: 0 });

    const clipped = drive.normalizeJoystick(2, 2);
    assert.ok(Math.hypot(clipped.x, clipped.y) <= 1);
    assert.ok(clipped.x > 0 && clipped.y > 0);
  });

test('stores independent speed values for each level in every profile', () => {
    const profile = drive.createDefaultDriveProfile('robot-a', 'Xe sân');
    assert.deepEqual(profile.levels.slow, { vFwd: 130, vSide: 130, vTurn: 130 });
    assert.deepEqual(profile.levels.medium, { vFwd: 190, vSide: 190, vTurn: 190 });
    assert.deepEqual(profile.levels.fast, { vFwd: 255, vSide: 255, vTurn: 255 });

    const changed = drive.updateLevelSpeed(profile, 'slow', 'vFwd', 77);
    assert.equal(changed.levels.slow.vFwd, 77);
    assert.equal(changed.levels.medium.vFwd, 190);
  });

  test('changing wheel type applies the type defaults and resets matrix customization', () => {
    const profile = drive.createDefaultDriveProfile('robot-a', 'Xe sân');
    const custom = drive.setMatrixSign(profile, 'fwd', 'fl', -1);
    assert.equal(custom.customMatrix, true);

    const omni = drive.setDriveWheelType(custom, 'omni');
    assert.equal(omni.customMatrix, false);
    assert.deepEqual(omni.matrix.side, { fl: 1, fr: -1, rl: -1, rr: 1 });
  });

test('mixes standard forward and turn axes using the editable wheel matrix', () => {
    const profile = drive.createDefaultDriveProfile('robot-a', 'Xe sân');
    assert.deepEqual(
      drive.mixDrive(profile, 'medium', { x: 0, y: 1 }, 0),
      { fl: 190, fr: 190, rl: 190, rr: 190 },
    );
    assert.deepEqual(
      drive.mixDrive(profile, 'medium', { x: 1, y: 0 }, 0),
      { fl: 190, fr: -190, rl: 190, rr: -190 },
    );
  });

test('mixes omni sideways motion, applies compensation and motor inversion independently', () => {
    const standardProfile = drive.createDefaultDriveProfile('robot-a', 'Xe sân');
    const omniProfile = drive.setDriveWheelType(standardProfile, 'omni');
    const profile = {
      ...omniProfile,
      motors: { ...omniProfile.motors, fl: { compensation: 80, inverted: true } },
    };
    assert.deepEqual(
      drive.mixDrive(profile, 'medium', { x: 0, y: 0 }, 1),
      { fl: -152, fr: -190, rl: 190, rr: -190 },
    );
    assert.deepEqual(
      drive.mixDrive(profile, 'medium', { x: 1, y: 0 }, 0),
      { fl: -152, fr: -190, rl: -190, rr: 190 },
    );
  });

test('applies one global ceiling, then deadzone, without exceeding the ceiling', () => {
    const base = drive.createDefaultDriveProfile('robot-a', 'Xe sân');
    const profile = {
      ...drive.setDriveWheelType(base, 'mecanum'),
      maxLimit: 120,
      minPwm: 30,
    };
    const wheels = drive.mixDrive(profile, 'medium', { x: 1, y: 1 }, 0);
    assert.deepEqual(wheels, { fl: 120, fr: 0, rl: 0, rr: 120 });
    assert.ok(Object.values(wheels).every((pwm) => Math.abs(pwm) <= profile.maxLimit));

    const deadzone = drive.applyMotorLimits(
      { fl: 12, fr: -12, rl: 0, rr: 0 },
      { ...profile, maxLimit: 80, minPwm: 25 },
    );
    assert.deepEqual(deadzone, { fl: 25, fr: -25, rl: 0, rr: 0 });
  });

test('clamps min PWM to max limit while normalizing imported profiles', () => {
    const profile = drive.normalizeDriveProfile({
      ...drive.createDefaultDriveProfile('x', 'Xe'),
      minPwm: 200,
      maxLimit: 100,
      motors: { fl: { compensation: 140, inverted: true } },
    });
    assert.equal(profile.minPwm, 100);
    assert.equal(profile.maxLimit, 100);
    assert.equal(profile.motors.fl.compensation, 100);
    assert.equal(profile.motors.fl.inverted, true);
    assert.equal(profile.motors.fr.compensation, 100);
  });

test('creates checksummed protocol frames and rejects corrupted frames', () => {
    const frame = drive.encodeDriveFrame(0x10, 7, [1, 2, 3]);
    assert.deepEqual(drive.decodeDriveFrame(frame), {
      type: 0x10,
      sequence: 7,
      payload: [1, 2, 3],
    });
    const corrupted = [...frame];
    corrupted[corrupted.length - 1] ^= 0xff;
    assert.equal(drive.decodeDriveFrame(corrupted), null);
  });

  test('encodes motor-test release as zero PWM instead of a minimum drive value', () => {
    const start = drive.decodeDriveFrame(drive.encodeMotorTestPacket('fl', 45, 1));
    const release = drive.decodeDriveFrame(drive.encodeMotorTestPacket('fl', 0, 2));
    assert.deepEqual(start?.payload, [0, 45]);
    assert.deepEqual(release?.payload, [0, 0]);
  });

  test('encodes joystick axes as signed thousandths and selects a speed level by index', () => {
    const control = drive.decodeDriveFrame(
      drive.encodeControlPacket({ x: 0.5, y: -1 }, -1, 10),
    );
    const level = drive.decodeDriveFrame(drive.encodeLevelPacket('fast', 11));
    assert.deepEqual(control?.payload, [0xbf, 0x01, 0x82, 0xfc, 0xff]);
    assert.deepEqual(level?.payload, [2]);
  });

  test('encodes every axis speed and motor setting in the fixed config payload', () => {
    const profile = drive.createDefaultDriveProfile('robot-a', 'Xe sân');
    const frame = drive.decodeDriveFrame(drive.encodeProfilePacket(profile, 12));
    assert.equal(frame?.type, drive.DRIVE_PACKET_TYPES.applyConfig);
    assert.equal(frame?.payload.length, 32);
    assert.deepEqual(frame?.payload.slice(6, 15), [130, 130, 130, 190, 190, 190, 255, 255, 255]);
  });
