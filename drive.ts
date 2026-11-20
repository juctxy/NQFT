import type { DriveMode } from './controller.ts';

export const WHEEL_IDS = ['fl', 'fr', 'rl', 'rr'] as const;
export type WheelId = (typeof WHEEL_IDS)[number];
export const DRIVE_AXES = ['fwd', 'side', 'turn'] as const;
export type DriveAxis = (typeof DRIVE_AXES)[number];
export type DriveSign = -1 | 0 | 1;
export type SpeedLevel = 'slow' | 'medium' | 'fast';

export interface WheelMatrix {
  fwd: Record<WheelId, DriveSign>;
  side: Record<WheelId, DriveSign>;
  turn: Record<WheelId, DriveSign>;
}

export interface AxisSpeeds {
  vFwd: number;
  vSide: number;
  vTurn: number;
}

export interface WheelMotorSettings {
  inverted: boolean;
  compensation: number;
}

export interface DriveProfile {
  id: string;
  name: string;
  wheelType: DriveMode;
  matrix: WheelMatrix;
  customMatrix: boolean;
  levels: Record<SpeedLevel, AxisSpeeds>;
  motors: Record<WheelId, WheelMotorSettings>;
  minPwm: number;
  maxLimit: number;
  softAccelMs: number;
}

export interface DriveSettingsSnapshot {
  profiles: DriveProfile[];
  activeProfileId: string;
  activeLevel: SpeedLevel;
}

export interface JoystickVector {
  x: number;
  y: number;
}

export type WheelPwm = Record<WheelId, number>;

export const SPEED_LEVELS: SpeedLevel[] = ['slow', 'medium', 'fast'];
export const SPEED_LEVEL_LABELS: Record<SpeedLevel, string> = {
  slow: 'Chậm',
  medium: 'Vừa',
  fast: 'Nhanh',
};

export const DRIVE_BLE_SERVICE_UUID = '4e514654-0001-4e51-4654-000000000001';
export const DRIVE_BLE_WRITE_UUID = '4e514654-0001-4e51-4654-000000000002';
export const DRIVE_BLE_NOTIFY_UUID = '4e514654-0001-4e51-4654-000000000003';
export const DRIVE_CONTROL_PERIOD_MS = 40;

export const DRIVE_PACKET_TYPES = {
  control: 0x02,
  stop: 0x04,
  motorTest: 0x05,
  saveConfig: 0x11,
  setLevel: 0x12,
  applyConfig: 0x10,
  ack: 0x80,
  telemetry: 0x81,
} as const;

const WHEEL_DIRECTIONS = {
  fwd: { fl: 1, fr: 1, rl: 1, rr: 1 },
  side: { fl: 1, fr: -1, rl: -1, rr: 1 },
  turn: { fl: 1, fr: -1, rl: 1, rr: -1 },
} as const satisfies WheelMatrix;

const STANDARD_MATRIX: WheelMatrix = {
  fwd: { ...WHEEL_DIRECTIONS.fwd },
  side: { fl: 0, fr: 0, rl: 0, rr: 0 },
  turn: { ...WHEEL_DIRECTIONS.turn },
};

const HOLONOMIC_MATRIX: WheelMatrix = {
  fwd: { ...WHEEL_DIRECTIONS.fwd },
  side: { ...WHEEL_DIRECTIONS.side },
  turn: { ...WHEEL_DIRECTIONS.turn },
};

const DEFAULT_LEVEL_SPEEDS: Record<SpeedLevel, AxisSpeeds> = {
  slow: { vFwd: 130, vSide: 130, vTurn: 130 },
  medium: { vFwd: 190, vSide: 190, vTurn: 190 },
  fast: { vFwd: 255, vSide: 255, vTurn: 255 },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeWheelMatrix(value: unknown, wheelType: DriveMode): WheelMatrix {
  const matrix = isRecord(value) ? value : {};
  const defaults = wheelType === 'standard' ? STANDARD_MATRIX : HOLONOMIC_MATRIX;
  const axis = (key: DriveAxis): Record<WheelId, DriveSign> => {
    const row = isRecord(matrix[key]) ? matrix[key] : {};
    return Object.fromEntries(
      WHEEL_IDS.map((wheel) => {
        const sign = row[wheel];
        return [wheel, sign === -1 || sign === 0 || sign === 1 ? sign : defaults[key][wheel]];
      }),
    ) as Record<WheelId, DriveSign>;
  };
  return { fwd: axis('fwd'), side: axis('side'), turn: axis('turn') };
}

function normalizeSpeedLevels(value: unknown): Record<SpeedLevel, AxisSpeeds> {
  const levels = isRecord(value) ? value : {};
  return Object.fromEntries(
    SPEED_LEVELS.map((level) => {
      const speed = isRecord(levels[level]) ? levels[level] : {};
      const fallback = DEFAULT_LEVEL_SPEEDS[level];
      return [
        level,
        {
          vFwd: clampInteger(speed.vFwd, fallback.vFwd, 0, 255),
          vSide: clampInteger(speed.vSide, fallback.vSide, 0, 255),
          vTurn: clampInteger(speed.vTurn, fallback.vTurn, 0, 255),
        },
      ];
    }),
  ) as Record<SpeedLevel, AxisSpeeds>;
}

function normalizeMotorSettings(value: unknown): Record<WheelId, WheelMotorSettings> {
  const motors = isRecord(value) ? value : {};
  return Object.fromEntries(
    WHEEL_IDS.map((wheel) => {
      const motor = isRecord(motors[wheel]) ? motors[wheel] : {};
      return [
        wheel,
        {
          inverted: motor.inverted === true,
          compensation: clampInteger(motor.compensation, 100, 80, 100),
        },
      ];
    }),
  ) as Record<WheelId, WheelMotorSettings>;
}

export function createDefaultDriveProfile(id: string, name: string): DriveProfile {
  return {
    id,
    name,
    wheelType: 'standard',
    matrix: {
      fwd: { ...STANDARD_MATRIX.fwd },
      side: { ...STANDARD_MATRIX.side },
      turn: { ...STANDARD_MATRIX.turn },
    },
    customMatrix: false,
    levels: normalizeSpeedLevels(DEFAULT_LEVEL_SPEEDS),
    motors: Object.fromEntries(
      WHEEL_IDS.map((wheel) => [wheel, { inverted: false, compensation: 100 }]),
    ) as Record<WheelId, WheelMotorSettings>,
    minPwm: 35,
    maxLimit: 255,
    softAccelMs: 200,
  };
}

export const DEFAULT_DRIVE_SETTINGS: DriveSettingsSnapshot = {
  profiles: [
    createDefaultDriveProfile('profile-a', 'Hồ sơ A'),
    createDefaultDriveProfile('profile-b', 'Hồ sơ B'),
  ],
  activeProfileId: 'profile-a',
  activeLevel: 'medium',
};

export function normalizeDriveProfile(value: unknown): DriveProfile {
  const profile = isRecord(value) ? value : {};
  const wheelType: DriveMode =
    profile.wheelType === 'omni' || profile.wheelType === 'mecanum'
      ? profile.wheelType
      : 'standard';
  const maxLimit = clampInteger(profile.maxLimit, 255, 1, 255);
  return {
    id: typeof profile.id === 'string' && profile.id ? profile.id : 'profile-imported',
    name: typeof profile.name === 'string' && profile.name.trim()
      ? profile.name.trim().slice(0, 40)
      : 'Hồ sơ mới',
    wheelType,
    matrix: normalizeWheelMatrix(profile.matrix, wheelType),
    customMatrix: profile.customMatrix === true,
    levels: normalizeSpeedLevels(profile.levels),
    motors: normalizeMotorSettings(profile.motors),
    minPwm: clampInteger(profile.minPwm, 35, 0, maxLimit),
    maxLimit,
    softAccelMs: clampInteger(profile.softAccelMs, 200, 0, 400),
  };
}

export function normalizeDriveSettings(value: unknown): DriveSettingsSnapshot {
  const settings = isRecord(value) ? value : {};
  const profiles = Array.isArray(settings.profiles)
    ? settings.profiles.map(normalizeDriveProfile)
    : DEFAULT_DRIVE_SETTINGS.profiles.map((profile) => ({ ...profile }));
  const uniqueProfiles = profiles.filter(
    (profile, index) => profiles.findIndex((other) => other.id === profile.id) === index,
  );
  const validProfiles = uniqueProfiles.length > 0
    ? uniqueProfiles
    : DEFAULT_DRIVE_SETTINGS.profiles.map((profile) => ({ ...profile }));
  const activeProfileId =
    typeof settings.activeProfileId === 'string' &&
    validProfiles.some((profile) => profile.id === settings.activeProfileId)
      ? settings.activeProfileId
      : validProfiles[0].id;
  const activeLevel: SpeedLevel =
    settings.activeLevel === 'slow' || settings.activeLevel === 'fast'
      ? settings.activeLevel
      : 'medium';
  return { profiles: validProfiles, activeProfileId, activeLevel };
}

export function updateLevelSpeed(
  profile: DriveProfile,
  level: SpeedLevel,
  axis: keyof AxisSpeeds,
  value: number,
): DriveProfile {
  const next = normalizeDriveProfile(profile);
  return {
    ...next,
    levels: {
      ...next.levels,
      [level]: {
        ...next.levels[level],
        [axis]: clampInteger(value, next.levels[level][axis], 0, 255),
      },
    },
  };
}

export function setDriveWheelType(profile: DriveProfile, wheelType: DriveMode): DriveProfile {
  const matrix = wheelType === 'standard' ? STANDARD_MATRIX : HOLONOMIC_MATRIX;
  return {
    ...normalizeDriveProfile(profile),
    wheelType,
    matrix: {
      fwd: { ...matrix.fwd },
      side: { ...matrix.side },
      turn: { ...matrix.turn },
    },
    customMatrix: false,
  };
}

export function setMatrixSign(
  profile: DriveProfile,
  axis: DriveAxis,
  wheel: WheelId,
  sign: DriveSign,
): DriveProfile {
  const next = normalizeDriveProfile(profile);
  return {
    ...next,
    matrix: {
      ...next.matrix,
      [axis]: { ...next.matrix[axis], [wheel]: sign },
    },
    customMatrix: true,
  };
}

export function cycleMatrixSign(
  profile: DriveProfile,
  axis: DriveAxis,
  wheel: WheelId,
): DriveProfile {
  const current = profile.matrix[axis][wheel];
  const next: DriveSign = current === 1 ? -1 : current === -1 ? 0 : 1;
  return setMatrixSign(profile, axis, wheel, next);
}

export function normalizeJoystick(x: number, y: number, deadzone = 0.06): JoystickVector {
  const safeX = Number.isFinite(x) ? x : 0;
  const safeY = Number.isFinite(y) ? y : 0;
  const magnitude = Math.hypot(safeX, safeY);
  if (magnitude <= deadzone) return { x: 0, y: 0 };
  const clipped = Math.min(1, magnitude);
  const adjusted = (clipped - deadzone) / (1 - deadzone);
  const scale = adjusted / magnitude;
  return { x: safeX * scale, y: safeY * scale };
}

export function applyMotorLimits(raw: WheelPwm, profile: DriveProfile): WheelPwm {
  const maxLimit = clampInteger(profile.maxLimit, 255, 1, 255);
  const minPwm = clampInteger(profile.minPwm, 0, 0, maxLimit);
  const peak = Math.max(...WHEEL_IDS.map((wheel) => Math.abs(raw[wheel])));
  const ceilingScale = peak > maxLimit ? maxLimit / peak : 1;
  return Object.fromEntries(
    WHEEL_IDS.map((wheel) => {
      const scaled = Number.isFinite(raw[wheel]) ? raw[wheel] * ceilingScale : 0;
      const magnitude = Math.abs(scaled);
      if (magnitude < 1) return [wheel, 0];
      const limitedMagnitude = magnitude < minPwm ? minPwm : magnitude;
      return [wheel, Math.sign(scaled) * Math.min(maxLimit, limitedMagnitude)];
    }),
  ) as WheelPwm;
}

export function mixDrive(
  profile: DriveProfile,
  level: SpeedLevel,
  joystick: JoystickVector,
  rotate: -1 | 0 | 1,
): WheelPwm {
  const safeProfile = normalizeDriveProfile(profile);
  const stick = normalizeJoystick(joystick.x, joystick.y);
  const speeds = safeProfile.levels[level];
  const vx = safeProfile.wheelType === 'standard' ? 0 : stick.x * speeds.vSide;
  const vy = stick.y * speeds.vFwd;
  const turn =
    safeProfile.wheelType === 'standard'
      ? stick.x * speeds.vTurn
      : rotate * speeds.vTurn;
  const raw = Object.fromEntries(
    WHEEL_IDS.map((wheel) => {
      const motor = safeProfile.motors[wheel];
      const movement =
        safeProfile.matrix.side[wheel] * vx +
        safeProfile.matrix.fwd[wheel] * vy +
        safeProfile.matrix.turn[wheel] * turn;
      const compensated = movement * (motor.compensation / 100);
      return [wheel, motor.inverted ? -compensated : compensated];
    }),
  ) as WheelPwm;
  return applyMotorLimits(raw, safeProfile);
}

export function pwmPercent(pwm: number): number {
  return Math.round((Math.abs(pwm) / 255) * 100);
}

function encodeProfilePayload(profile: DriveProfile): number[] {
  const safeProfile = normalizeDriveProfile(profile);
  const type = safeProfile.wheelType === 'standard'
    ? 0
    : safeProfile.wheelType === 'omni'
      ? 1
      : 2;
  const levels = SPEED_LEVELS.flatMap((level) => {
    const speed = safeProfile.levels[level];
    return [speed.vFwd, speed.vSide, speed.vTurn];
  });
  const matrix = DRIVE_AXES.flatMap((axis) =>
    WHEEL_IDS.map((wheel) => safeProfile.matrix[axis][wheel] & 0xff),
  );
  const compensation = WHEEL_IDS.map((wheel) => safeProfile.motors[wheel].compensation);
  const invertMask = WHEEL_IDS.reduce(
    (mask, wheel, index) => mask | (safeProfile.motors[wheel].inverted ? 1 << index : 0),
    0,
  );
  return [
    type,
    safeProfile.minPwm,
    safeProfile.maxLimit,
    safeProfile.softAccelMs & 0xff,
    (safeProfile.softAccelMs >> 8) & 0xff,
    safeProfile.customMatrix ? 1 : 0,
    ...levels,
    ...matrix,
    ...compensation,
    invertMask,
  ];
}

export function encodeProfilePacket(
  profile: DriveProfile,
  sequence: number,
  persistToNvs = false,
): number[] {
  return encodeDriveFrame(
    persistToNvs ? DRIVE_PACKET_TYPES.saveConfig : DRIVE_PACKET_TYPES.applyConfig,
    sequence,
    encodeProfilePayload(profile),
  );
}

export function encodeControlPacket(
  joystick: JoystickVector,
  rotate: -1 | 0 | 1,
  sequence: number,
): number[] {
  const normalized = normalizeJoystick(joystick.x, joystick.y);
  const x = Math.round(normalized.x * 1000);
  const y = Math.round(normalized.y * 1000);
  return encodeDriveFrame(DRIVE_PACKET_TYPES.control, sequence, [
    x & 0xff,
    (x >> 8) & 0xff,
    y & 0xff,
    (y >> 8) & 0xff,
    rotate & 0xff,
  ]);
}

export function encodeStopPacket(sequence: number): number[] {
  return encodeDriveFrame(DRIVE_PACKET_TYPES.stop, sequence, []);
}

export function encodeLevelPacket(level: SpeedLevel, sequence: number): number[] {
  return encodeDriveFrame(DRIVE_PACKET_TYPES.setLevel, sequence, [
    SPEED_LEVELS.indexOf(level),
  ]);
}

export function encodeMotorTestPacket(
  wheel: WheelId,
  pwm: number,
  sequence: number,
): number[] {
  return encodeDriveFrame(DRIVE_PACKET_TYPES.motorTest, sequence, [
    WHEEL_IDS.indexOf(wheel),
    clampInteger(pwm, 0, 0, 50),
  ]);
}

const FRAME_MAGIC = [0xa5, 0x5a] as const;
const FRAME_VERSION = 1;

export function crc16Ccitt(bytes: number[]): number {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= (byte & 0xff) << 8;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc;
}

export function encodeDriveFrame(type: number, sequence: number, payload: number[]): number[] {
  const frame = [
    ...FRAME_MAGIC,
    FRAME_VERSION,
    type & 0xff,
    sequence & 0xff,
    (sequence >> 8) & 0xff,
    payload.length & 0xff,
    (payload.length >> 8) & 0xff,
    ...payload.map((byte) => byte & 0xff),
  ];
  const crc = crc16Ccitt(frame.slice(2));
  return [...frame, crc & 0xff, (crc >> 8) & 0xff];
}

export function decodeDriveFrame(
  frame: number[],
): { type: number; sequence: number; payload: number[] } | null {
  if (
    frame.length < 10 ||
    frame[0] !== FRAME_MAGIC[0] ||
    frame[1] !== FRAME_MAGIC[1] ||
    frame[2] !== FRAME_VERSION
  ) {
    return null;
  }
  const payloadLength = frame[6] | (frame[7] << 8);
  if (frame.length !== payloadLength + 10) return null;
  const expectedCrc = frame[frame.length - 2] | (frame[frame.length - 1] << 8);
  if (crc16Ccitt(frame.slice(2, -2)) !== expectedCrc) return null;
  return {
    type: frame[3],
    sequence: frame[4] | (frame[5] << 8),
    payload: frame.slice(8, -2),
  };
}
