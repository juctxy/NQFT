export type CommandType =
  | 'STOP'
  | 'FORWARD'
  | 'BACKWARD'
  | 'LEFT'
  | 'RIGHT'
  | 'FORWARD_LEFT'
  | 'FORWARD_RIGHT'
  | 'BACKWARD_LEFT'
  | 'BACKWARD_RIGHT';

export interface SpeedPresets {
  slow: number;
  medium: number;
  fast: number;
}

export type DriveMode = 'standard' | 'omni' | 'mecanum';

export interface DriveConfig {
  mode: DriveMode;
  vMain: number;
  vSide: number;
  vSub: number;
  trim: number;
  softStartMs: number;
}

export type DriveProfileId = 'preset1' | 'preset2' | 'preset3';
export type DriveProfiles = Record<DriveProfileId, DriveConfig>;

export const DEFAULT_DRIVE_CONFIG: DriveConfig = {
  mode: 'standard',
  vMain: 190,
  vSide: 190,
  vSub: 90,
  trim: 0,
  softStartMs: 0,
};

export const DEFAULT_DRIVE_PROFILES: DriveProfiles = {
  preset1: { ...DEFAULT_DRIVE_CONFIG, vMain: 130, vSide: 130 },
  preset2: { ...DEFAULT_DRIVE_CONFIG },
  preset3: { ...DEFAULT_DRIVE_CONFIG, vMain: 255, vSide: 255 },
};

export interface DriveSettingsState {
  config: DriveConfig;
  profiles: DriveProfiles;
  ready: boolean;
  error: string | null;
  revision: number;
}

export type DriveSettingsAction =
  | { type: 'hydrate'; config: unknown; profiles: unknown }
  | { type: 'changeConfig'; key: keyof DriveConfig; value: number | DriveMode }
  | { type: 'commit' }
  | { type: 'saveProfile'; id: DriveProfileId }
  | { type: 'loadProfile'; id: DriveProfileId }
  | { type: 'reset' }
  | { type: 'setError'; error: string | null };

export const DEFAULT_DRIVE_SETTINGS_STATE: DriveSettingsState = {
  config: { ...DEFAULT_DRIVE_CONFIG },
  profiles: cloneDriveProfiles(DEFAULT_DRIVE_PROFILES),
  ready: false,
  error: null,
  revision: 0,
};

const SPEED_PRESET_LABELS: Record<keyof SpeedPresets, string> = {
  slow: 'Chậm',
  medium: 'Vừa',
  fast: 'Nhanh',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampInteger(value: unknown, fallback: number, min: number, max: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function normalizeDriveConfigWithFallback(
  value: unknown,
  fallback: DriveConfig,
): DriveConfig {
  const config = isRecord(value) ? value : {};
  const mode =
    config.mode === 'standard' || config.mode === 'omni' || config.mode === 'mecanum'
      ? config.mode
      : fallback.mode;

  return {
    mode,
    vMain: clampInteger(config.vMain, fallback.vMain, 0, 255),
    vSide: clampInteger(config.vSide, fallback.vSide, 0, 255),
    vSub: clampInteger(config.vSub, fallback.vSub, 0, 255),
    trim: clampInteger(config.trim, fallback.trim, -30, 30),
    softStartMs: clampInteger(config.softStartMs, fallback.softStartMs, 0, 400),
  };
}

export function normalizeDriveConfig(value: unknown): DriveConfig {
  return normalizeDriveConfigWithFallback(value, DEFAULT_DRIVE_CONFIG);
}

function cloneDriveProfiles(profiles: DriveProfiles): DriveProfiles {
  return {
    preset1: { ...profiles.preset1 },
    preset2: { ...profiles.preset2 },
    preset3: { ...profiles.preset3 },
  };
}

export function normalizeDriveProfiles(value: unknown): DriveProfiles {
  const profiles = isRecord(value) ? value : {};

  return {
    preset1: normalizeDriveConfigWithFallback(
      profiles.preset1,
      DEFAULT_DRIVE_PROFILES.preset1,
    ),
    preset2: normalizeDriveConfigWithFallback(
      profiles.preset2,
      DEFAULT_DRIVE_PROFILES.preset2,
    ),
    preset3: normalizeDriveConfigWithFallback(
      profiles.preset3,
      DEFAULT_DRIVE_PROFILES.preset3,
    ),
  };
}

export function getMatchingDriveProfile(
  motor1Speed: number,
  motor2Speed: number,
  profiles: DriveProfiles,
): DriveProfileId | null {
  if (motor1Speed !== motor2Speed) return null;

  const profileIds: DriveProfileId[] = ['preset1', 'preset2', 'preset3'];
  const matches = profileIds.filter((id) => profiles[id].vMain === motor1Speed);
  return matches.length === 1 ? matches[0] ?? null : null;
}

export function getDriveProfileMotorSpeeds(
  profiles: DriveProfiles,
  id: DriveProfileId,
): { motor1Speed: number; motor2Speed: number } {
  const speed = profiles[id].vMain;
  return { motor1Speed: speed, motor2Speed: speed };
}

export function driveSettingsReducer(
  state: DriveSettingsState,
  action: DriveSettingsAction,
): DriveSettingsState {
  switch (action.type) {
    case 'hydrate':
      return {
        config: normalizeDriveConfig(action.config),
        profiles: normalizeDriveProfiles(action.profiles),
        ready: true,
        error: null,
        revision: 0,
      };
    case 'changeConfig':
      if (!state.ready) return state;
      return {
        ...state,
        config: normalizeDriveConfig({ ...state.config, [action.key]: action.value }),
      };
    case 'commit':
      if (!state.ready) return state;
      return { ...state, revision: state.revision + 1 };
    case 'saveProfile':
      if (!state.ready) return state;
      return {
        ...state,
        profiles: {
          ...state.profiles,
          [action.id]: { ...state.config },
        },
        revision: state.revision + 1,
      };
    case 'loadProfile':
      if (!state.ready) return state;
      return {
        ...state,
        config: { ...state.profiles[action.id] },
        revision: state.revision + 1,
      };
    case 'reset':
      if (!state.ready) return state;
      return {
        ...state,
        config: { ...DEFAULT_DRIVE_CONFIG },
        profiles: cloneDriveProfiles(DEFAULT_DRIVE_PROFILES),
        error: null,
        revision: state.revision + 1,
      };
    case 'setError':
      return { ...state, error: action.error };
  }
}

export interface JoystickPosition {
  x: number;
  y: number;
}

export function getSpeedPresetLabel(preset: keyof SpeedPresets | null): string {
  return preset === null ? 'Tùy chỉnh' : SPEED_PRESET_LABELS[preset];
}

export function getChangedCommand(
  previous: CommandType,
  next: CommandType,
): CommandType | null {
  return previous === next ? null : next;
}

export function getMatchingSpeedPreset(
  motor1Speed: number,
  motor2Speed: number,
  presets: SpeedPresets,
): keyof SpeedPresets | null {
  if (motor1Speed !== motor2Speed) return null;

  const presetKeys: Array<keyof SpeedPresets> = ['slow', 'medium', 'fast'];
  const matches = presetKeys.filter((key) => presets[key] === motor1Speed);
  return matches.length === 1 ? matches[0] ?? null : null;
}

export function clampJoystick(
  dx: number,
  dy: number,
  maxRadius: number,
): JoystickPosition {
  const distance = Math.hypot(dx, dy);
  if (distance <= maxRadius || distance === 0) return { x: dx, y: dy };
  return {
    x: (dx / distance) * maxRadius,
    y: (dy / distance) * maxRadius,
  };
}

export function determineDirection(dx: number, dy: number): CommandType {
  if (Math.hypot(dx, dy) < 15) return 'STOP';

  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle >= -22.5 && angle < 22.5) return 'RIGHT';
  if (angle >= 22.5 && angle < 67.5) return 'BACKWARD_RIGHT';
  if (angle >= 67.5 && angle < 112.5) return 'BACKWARD';
  if (angle >= 112.5 && angle < 157.5) return 'BACKWARD_LEFT';
  if (angle >= 157.5 || angle < -157.5) return 'LEFT';
  if (angle >= -157.5 && angle < -112.5) return 'FORWARD_LEFT';
  if (angle >= -112.5 && angle < -67.5) return 'FORWARD';
  return 'FORWARD_RIGHT';
}

export function clampSpeed(speed: number): number {
  if (!Number.isFinite(speed)) return 0;
  return Math.max(0, Math.min(255, Math.round(speed)));
}
