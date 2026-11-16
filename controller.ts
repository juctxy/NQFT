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

const SPEED_PRESET_LABELS: Record<keyof SpeedPresets, string> = {
  slow: 'Chậm',
  medium: 'Vừa',
  fast: 'Nhanh',
};

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
