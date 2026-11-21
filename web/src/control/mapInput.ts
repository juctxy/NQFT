import { normalizeJoystick, type DriveProfile, type SpeedLevel, type Vec } from '../drive/driveModel';
import { ACTION_MASK, ACTION_SHIFT } from '../protocol/constants';
import type { ControlInput } from '../protocol/packet';

/** Trạng thái điều khiển trên UI (joystick, nút xoay, nút hành động đang giữ). */
export interface DriveInput {
  /** Joystick đã chuẩn hóa: -1..1, y dương = tiến. */
  joystick: Vec;
  /** Nút XOAY TRÁI/PHẢI (chỉ có khi bánh omni/mecanum): -1, 0, 1. */
  rotate: number;
  /** Mã nút hành động đang giữ (ActionCode). */
  action: number;
}

const pct = (pwm: number) => {
  const v = Math.round((pwm / 255) * 100);
  return v === 0 ? 0 : v; // tránh -0
};
const cap = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

/** Ghi mã nút hành động (0..7) vào bit 3..5 của flags, giữ các bit khác. */
export function withAction(flags: number, action: number): number {
  const a = Number.isInteger(action) && action >= 0 && action <= 7 ? action : 0;
  return (flags & ~ACTION_MASK & 0xff) | (a << ACTION_SHIFT);
}

/**
 * Chuyển joystick + mức tốc độ của hồ sơ thành gói CONTROL 4 byte (ga/lái -100..100).
 * - Ga = y × V_fwd.
 * - Lái: bánh standard = x × V_turn; omni/mecanum = x × V_side + xoay × V_turn
 *   (giao thức 4 byte chỉ có một trục ngang nên đi ngang và xoay dùng chung trục lái).
 * - Mỗi trục bị giới hạn bởi "Giới hạn tốc độ tối đa" của hồ sơ.
 */
export function mapDrive(profile: DriveProfile, level: SpeedLevel, input: DriveInput): ControlInput {
  const j = normalizeJoystick(input.joystick.x, input.joystick.y);
  const s = profile.levels[level];
  const limit = profile.maxLimit;
  const fwd = j.y * s.vFwd;
  const turn = profile.wheelType === 'standard' ? j.x * s.vTurn : j.x * s.vSide + input.rotate * s.vTurn;
  return {
    throttle: pct(cap(fwd, limit)),
    steering: pct(cap(turn, limit)),
    flags: withAction(0, input.action),
  };
}
