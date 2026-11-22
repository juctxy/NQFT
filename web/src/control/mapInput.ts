import { normalizeJoystick, type DriveProfile, type SpeedLevel, type Vec } from '../drive/driveModel';
import { BUTTON_MASK, ButtonBit } from '../protocol/constants';
import type { ControlInput } from '../protocol/packet';

/** Trạng thái điều khiển trên UI (joystick, nút xoay, các nút đang giữ). */
export interface DriveInput {
  /** Joystick đã chuẩn hóa: -1..1, y dương = tiến. */
  joystick: Vec;
  /** Nút QUẸO TRÁI/PHẢI (chỉ có khi bánh omni/mecanum): -1, 0, 1. */
  rotate: number;
  /** Bitmask ButtonBit: mỗi bit = 1 nút đang giữ (bit 0..5). */
  buttons: number;
}

const pct = (pwm: number) => {
  const v = Math.round((pwm / 255) * 100);
  return v === 0 ? 0 : v; // tránh -0
};
const cap = (v: number, limit: number) => Math.max(-limit, Math.min(limit, v));

/**
 * Chuyển joystick + mức tốc độ của hồ sơ thành gói CONTROL 4 byte (v4).
 * - Oy (y) = joystick y × V_fwd, dương = tiến.
 * - Ox (x) = joystick x × V_turn (standard: rẽ) hoặc × V_side (omni/mecanum: đi ngang), dương = phải.
 * - Mỗi trục bị giới hạn bởi "Giới hạn tốc độ tối đa" của hồ sơ.
 * - flags = các nút đang giữ (bit 0..5) + nút quẹo trái/phải (bit 6/7, chỉ omni/mecanum).
 *   Tốc độ xoay do xe quyết định (ô CONFIG), không gửi trong gói này.
 */
export function mapDrive(profile: DriveProfile, level: SpeedLevel, input: DriveInput): ControlInput {
  const j = normalizeJoystick(input.joystick.x, input.joystick.y);
  const s = profile.levels[level];
  const limit = profile.maxLimit;
  const standard = profile.wheelType === 'standard';
  const y = j.y * s.vFwd;
  const x = j.x * (standard ? s.vTurn : s.vSide);
  let flags = input.buttons & BUTTON_MASK;
  if (!standard && input.rotate < 0) flags |= ButtonBit.TurnLeft;
  if (!standard && input.rotate > 0) flags |= ButtonBit.TurnRight;
  return { y: pct(cap(y, limit)), x: pct(cap(x, limit)), flags };
}
