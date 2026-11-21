// Mô hình hồ sơ lái — chuyển từ app NQFT bản web (juctxy.github.io/NQFT).
// Chỉ giữ phần dữ liệu/tính toán; phần đóng gói giao thức BLE riêng của bản gốc không dùng
// vì app này gửi gói CONTROL 4 byte (docs/protocol.md).

export const WHEEL_IDS = ['fl', 'fr', 'rl', 'rr'] as const;
export type WheelId = (typeof WHEEL_IDS)[number];

export const DRIVE_AXES = ['fwd', 'side', 'turn'] as const;
export type DriveAxis = (typeof DRIVE_AXES)[number];

export const SPEED_LEVELS = ['slow', 'medium', 'fast'] as const;
export type SpeedLevel = (typeof SPEED_LEVELS)[number];
export const SPEED_LEVEL_LABELS: Record<SpeedLevel, string> = { slow: 'Chậm', medium: 'Vừa', fast: 'Nhanh' };

export type WheelType = 'standard' | 'omni' | 'mecanum';
export type MatrixSign = -1 | 0 | 1;
export type DriveMatrix = Record<DriveAxis, Record<WheelId, MatrixSign>>;
export interface LevelSpeeds { vFwd: number; vSide: number; vTurn: number }
export interface MotorOptions { inverted: boolean; compensation: number }

export interface DriveProfile {
  id: string;
  name: string;
  wheelType: WheelType;
  matrix: DriveMatrix;
  customMatrix: boolean;
  levels: Record<SpeedLevel, LevelSpeeds>;
  motors: Record<WheelId, MotorOptions>;
  minPwm: number;
  maxLimit: number;
  softAccelMs: number;
}

export interface DriveSettings {
  profiles: DriveProfile[];
  activeProfileId: string;
  activeLevel: SpeedLevel;
}

export interface Vec { x: number; y: number }

const ONES: Record<WheelId, MatrixSign> = { fl: 1, fr: 1, rl: 1, rr: 1 };
const SIDE: Record<WheelId, MatrixSign> = { fl: 1, fr: -1, rl: -1, rr: 1 };
const TURN: Record<WheelId, MatrixSign> = { fl: 1, fr: -1, rl: 1, rr: -1 };
const STANDARD_MATRIX: DriveMatrix = { fwd: { ...ONES }, side: { fl: 0, fr: 0, rl: 0, rr: 0 }, turn: { ...TURN } };
const HOLONOMIC_MATRIX: DriveMatrix = { fwd: { ...ONES }, side: { ...SIDE }, turn: { ...TURN } };
const DEFAULT_LEVELS: Record<SpeedLevel, LevelSpeeds> = {
  slow: { vFwd: 130, vSide: 130, vTurn: 130 },
  medium: { vFwd: 190, vSide: 190, vTurn: 190 },
  fast: { vFwd: 255, vSide: 255, vTurn: 255 },
};

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => typeof v === 'object' && v !== null && !Array.isArray(v);

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.max(min, Math.min(max, Math.round(v))) : fallback;
}

const copyMatrix = (m: DriveMatrix): DriveMatrix => ({ fwd: { ...m.fwd }, side: { ...m.side }, turn: { ...m.turn } });

function normalizeMatrix(raw: unknown, wheelType: WheelType): DriveMatrix {
  const src = isObj(raw) ? raw : {};
  const base = wheelType === 'standard' ? STANDARD_MATRIX : HOLONOMIC_MATRIX;
  const axis = (a: DriveAxis) => {
    const row = isObj(src[a]) ? (src[a] as Obj) : {};
    return Object.fromEntries(
      WHEEL_IDS.map((w) => {
        const v = row[w];
        return [w, v === -1 || v === 0 || v === 1 ? v : base[a][w]];
      }),
    ) as Record<WheelId, MatrixSign>;
  };
  return { fwd: axis('fwd'), side: axis('side'), turn: axis('turn') };
}

function normalizeLevels(raw: unknown): Record<SpeedLevel, LevelSpeeds> {
  const src = isObj(raw) ? raw : {};
  return Object.fromEntries(
    SPEED_LEVELS.map((l) => {
      const s = isObj(src[l]) ? (src[l] as Obj) : {};
      const d = DEFAULT_LEVELS[l];
      return [l, { vFwd: clampInt(s.vFwd, d.vFwd, 0, 255), vSide: clampInt(s.vSide, d.vSide, 0, 255), vTurn: clampInt(s.vTurn, d.vTurn, 0, 255) }];
    }),
  ) as Record<SpeedLevel, LevelSpeeds>;
}

function normalizeMotors(raw: unknown): Record<WheelId, MotorOptions> {
  const src = isObj(raw) ? raw : {};
  return Object.fromEntries(
    WHEEL_IDS.map((w) => {
      const m = isObj(src[w]) ? (src[w] as Obj) : {};
      return [w, { inverted: m.inverted === true, compensation: clampInt(m.compensation, 100, 80, 100) }];
    }),
  ) as Record<WheelId, MotorOptions>;
}

export function createDefaultDriveProfile(id: string, name: string): DriveProfile {
  return {
    id,
    name,
    wheelType: 'standard',
    matrix: copyMatrix(STANDARD_MATRIX),
    customMatrix: false,
    levels: normalizeLevels(DEFAULT_LEVELS),
    motors: Object.fromEntries(WHEEL_IDS.map((w) => [w, { inverted: false, compensation: 100 }])) as Record<WheelId, MotorOptions>,
    minPwm: 35,
    maxLimit: 255,
    softAccelMs: 200,
  };
}

export const DEFAULT_DRIVE_SETTINGS: DriveSettings = {
  profiles: [createDefaultDriveProfile('profile-a', 'Hồ sơ A'), createDefaultDriveProfile('profile-b', 'Hồ sơ B')],
  activeProfileId: 'profile-a',
  activeLevel: 'medium',
};

export function normalizeDriveProfile(raw: unknown): DriveProfile {
  const p = isObj(raw) ? raw : {};
  const wheelType: WheelType = p.wheelType === 'omni' || p.wheelType === 'mecanum' ? p.wheelType : 'standard';
  const maxLimit = clampInt(p.maxLimit, 255, 1, 255);
  return {
    id: typeof p.id === 'string' && p.id ? p.id : 'profile-imported',
    name: typeof p.name === 'string' && p.name.trim() ? p.name.trim().slice(0, 40) : 'Hồ sơ mới',
    wheelType,
    matrix: normalizeMatrix(p.matrix, wheelType),
    customMatrix: p.customMatrix === true,
    levels: normalizeLevels(p.levels),
    motors: normalizeMotors(p.motors),
    minPwm: clampInt(p.minPwm, 35, 0, maxLimit),
    maxLimit,
    softAccelMs: clampInt(p.softAccelMs, 200, 0, 400),
  };
}

export function normalizeDriveSettings(raw: unknown): DriveSettings {
  const s = isObj(raw) ? raw : {};
  const all = Array.isArray(s.profiles) ? s.profiles.map(normalizeDriveProfile) : DEFAULT_DRIVE_SETTINGS.profiles.map((p) => ({ ...p }));
  const unique = all.filter((p, i) => all.findIndex((q) => q.id === p.id) === i);
  const profiles = unique.length > 0 ? unique : DEFAULT_DRIVE_SETTINGS.profiles.map((p) => ({ ...p }));
  const activeProfileId =
    typeof s.activeProfileId === 'string' && profiles.some((p) => p.id === s.activeProfileId) ? s.activeProfileId : profiles[0].id;
  const activeLevel: SpeedLevel = s.activeLevel === 'slow' || s.activeLevel === 'fast' ? s.activeLevel : 'medium';
  return { profiles, activeProfileId, activeLevel };
}

export function setDriveWheelType(profile: DriveProfile, wheelType: WheelType): DriveProfile {
  const base = wheelType === 'standard' ? STANDARD_MATRIX : HOLONOMIC_MATRIX;
  return { ...normalizeDriveProfile(profile), wheelType, matrix: copyMatrix(base), customMatrix: false };
}

export function setMatrixSign(profile: DriveProfile, axis: DriveAxis, wheel: WheelId, sign: MatrixSign): DriveProfile {
  const p = normalizeDriveProfile(profile);
  return { ...p, matrix: { ...p.matrix, [axis]: { ...p.matrix[axis], [wheel]: sign } }, customMatrix: true };
}

/** Vùng chết 6 % và kẹp về hình tròn bán kính 1. */
export function normalizeJoystick(x: number, y: number, deadzone = 0.06): Vec {
  const cx = Number.isFinite(x) ? x : 0;
  const cy = Number.isFinite(y) ? y : 0;
  const len = Math.hypot(cx, cy);
  if (len <= deadzone) return { x: 0, y: 0 };
  const k = (Math.min(1, len) - deadzone) / (1 - deadzone) / len;
  return { x: cx * k, y: cy * k };
}

/** Kẹp vị trí nút joystick (px) trong bán kính r. */
export function clampJoystick(x: number, y: number, r: number): Vec {
  const len = Math.hypot(x, y);
  return len <= r || len === 0 ? { x, y } : { x: (x / len) * r, y: (y / len) * r };
}

export function applyMotorLimits(values: Record<WheelId, number>, profile: DriveProfile): Record<WheelId, number> {
  const maxLimit = clampInt(profile.maxLimit, 255, 1, 255);
  const minPwm = clampInt(profile.minPwm, 0, 0, maxLimit);
  const peak = Math.max(...WHEEL_IDS.map((w) => Math.abs(values[w])));
  const scale = peak > maxLimit ? maxLimit / peak : 1;
  return Object.fromEntries(
    WHEEL_IDS.map((w) => {
      const v = Number.isFinite(values[w]) ? values[w] * scale : 0;
      const a = Math.abs(v);
      if (a < 1) return [w, 0];
      return [w, Math.sign(v) * Math.min(maxLimit, a < minPwm ? minPwm : a)];
    }),
  ) as Record<WheelId, number>;
}

/** PWM từng bánh (dùng cho phần "Chạy thử" trong Settings). */
export function mixDrive(profile: DriveProfile, level: SpeedLevel, joystick: Vec, rotate: number): Record<WheelId, number> {
  const p = normalizeDriveProfile(profile);
  const j = normalizeJoystick(joystick.x, joystick.y);
  const s = p.levels[level];
  const side = p.wheelType === 'standard' ? 0 : j.x * s.vSide;
  const fwd = j.y * s.vFwd;
  const turn = p.wheelType === 'standard' ? j.x * s.vTurn : rotate * s.vTurn;
  return applyMotorLimits(
    Object.fromEntries(
      WHEEL_IDS.map((w) => {
        const m = p.motors[w];
        const v = (p.matrix.side[w] * side + p.matrix.fwd[w] * fwd + p.matrix.turn[w] * turn) * (m.compensation / 100);
        return [w, m.inverted ? -v : v];
      }),
    ) as Record<WheelId, number>,
    p,
  );
}

export function pwmPercent(pwm: number): number {
  return Math.round((Math.abs(pwm) / 255) * 100);
}
