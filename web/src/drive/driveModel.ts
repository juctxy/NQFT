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
export interface MotorOptions { inverted: boolean; compensation: number }

export interface DriveProfile {
  id: string;
  name: string;
  wheelType: WheelType;
  matrix: DriveMatrix;
  customMatrix: boolean;
  motors: Record<WheelId, MotorOptions>;
  minPwm: number;
  maxLimit: number;
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
/** PWM cố định của từng mức tốc độ. Joystick chỉ chọn HƯỚNG, tốc độ do mức này quyết định. */
export const LEVEL_PWM: Record<SpeedLevel, number> = { slow: 140, medium: 200, fast: 255 };

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
    motors: Object.fromEntries(WHEEL_IDS.map((w) => [w, { inverted: false, compensation: 100 }])) as Record<WheelId, MotorOptions>,
    minPwm: 35,
    maxLimit: 255,
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
    motors: normalizeMotors(p.motors),
    minPwm: clampInt(p.minPwm, 35, 0, maxLimit),
    maxLimit,
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
/**
 * Chỉ giữ HƯỚNG của joystick: kéo dài để thành phần lớn nhất = 1 (đẩy nhẹ hay hết cỡ như nhau).
 * Ví dụ (0.3, 0) -> (1, 0); (0.5, 0.5) -> (1, 1). Ở giữa (đã qua vùng chết) -> (0, 0).
 */
export function joystickDirection(j: Vec): Vec {
  const m = Math.max(Math.abs(j.x), Math.abs(j.y));
  if (m === 0) return { x: 0, y: 0 };
  return { x: j.x / m, y: j.y / m };
}

const OCTANT_DIRECTIONS = [
  { x: 1, y: 0 },
  { x: 1, y: 1 },
  { x: 0, y: 1 },
  { x: -1, y: 1 },
  { x: -1, y: 0 },
  { x: -1, y: -1 },
  { x: 0, y: -1 },
  { x: 1, y: -1 },
] as const;

/** Snap a non-neutral direction to its nearest cardinal or diagonal octant. */
export function snapJoystickDirection(direction: Vec): Vec {
  if (direction.x === 0 && direction.y === 0) return { x: 0, y: 0 };
  const angle = Math.atan2(direction.y, direction.x);
  const octant = Math.floor((angle + Math.PI / 8) / (Math.PI / 4));
  const snapped = OCTANT_DIRECTIONS[(octant + OCTANT_DIRECTIONS.length) % OCTANT_DIRECTIONS.length];
  return { x: snapped.x, y: snapped.y };
}

/** PWM của mức tốc độ; xe chưa có chân PWM -> luôn 255. */
export function levelPwm(level: SpeedLevel, noPwmPin = false): number {
  return noPwmPin ? 255 : LEVEL_PWM[level];
}

/**
 * PWM dự kiến của 4 bánh (hiển thị trên web), tính giống xe:
 * hướng joystick -> trộn theo ma trận -> chia đều nếu vượt 100 % -> × PWM của mức -> bù, đảo chiều.
 */
export function mixDrive(profile: DriveProfile, level: SpeedLevel, joystick: Vec, rotate: number, noPwmPin = false): Record<WheelId, number> {
  const p = normalizeDriveProfile(profile);
  const d = snapJoystickDirection(joystickDirection(normalizeJoystick(joystick.x, joystick.y)));
  const side = p.wheelType === 'standard' ? 0 : d.x;
  const fwd = d.y;
  const turn = p.wheelType === 'standard' ? d.x + rotate : rotate;
  const raw = Object.fromEntries(
    WHEEL_IDS.map((w) => [w, p.matrix.side[w] * side + p.matrix.fwd[w] * fwd + p.matrix.turn[w] * turn]),
  ) as Record<WheelId, number>;
  const peak = Math.max(1, ...WHEEL_IDS.map((w) => Math.abs(raw[w])));
  const pwm = levelPwm(level, noPwmPin);
  return applyMotorLimits(
    Object.fromEntries(
      WHEEL_IDS.map((w) => {
        const m = p.motors[w];
        const v = (raw[w] / peak) * pwm * (m.compensation / 100);
        return [w, m.inverted ? -v : v];
      }),
    ) as Record<WheelId, number>,
    p,
  );
}
