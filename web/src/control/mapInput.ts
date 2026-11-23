import { joystickDirection, levelPwm, normalizeJoystick, type DriveProfile, type SpeedLevel, type Vec } from '../drive/driveModel';
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

const round = (v: number) => {
  const r = Math.round(v);
  return r === 0 ? 0 : r; // tránh -0
};

/** Xe đang kết nối hỗ trợ gì (đọc từ telemetry). */
export interface CarSpeedCaps {
  /** Xe hiểu byte speedPwm (firmware từ 0.3.0). */
  speedPwm: boolean;
  /** Trong code xe chưa khai báo chân PWM -> không có mức tốc độ, chạy 255. */
  noPwmPin: boolean;
}
/** Chưa biết (chưa có telemetry) -> coi như xe cũ. */
export const UNKNOWN_CAR: CarSpeedCaps = { speedPwm: false, noPwmPin: false };

/**
 * Chuyển joystick + mức tốc độ thành gói CONTROL (v6).
 * - Joystick chỉ chọn HƯỚNG: đẩy nhẹ hay hết cỡ đều chạy đúng PWM của mức (Chậm 140, Vừa 200, Nhanh 255).
 * - Oy (y) dương = tiến; Ox (x) dương = phải (standard: rẽ; omni/mecanum: đi ngang).
 * - Xe mới: x, y = hướng (±100) và speedPwm = PWM của mức (bị chặn bởi "Giới hạn tốc độ tối đa").
 *   Xe cũ (chưa hiểu speedPwm): quy PWM ra % rồi nhân vào x, y (sai số ≤ 1 PWM).
 * - Xe chưa khai báo chân PWM: bỏ mức tốc độ, chạy 255.
 * - flags = các nút đang giữ (bit 0..5) + nút quẹo trái/phải (bit 6/7, chỉ omni/mecanum).
 */
export function mapDrive(profile: DriveProfile, level: SpeedLevel, input: DriveInput, car: CarSpeedCaps = UNKNOWN_CAR): ControlInput {
  const d = joystickDirection(normalizeJoystick(input.joystick.x, input.joystick.y));
  const pwm = Math.min(levelPwm(level, car.noPwmPin), profile.maxLimit);
  const standard = profile.wheelType === 'standard';
  let flags = input.buttons & BUTTON_MASK;
  if (!standard && input.rotate < 0) flags |= ButtonBit.TurnLeft;
  if (!standard && input.rotate > 0) flags |= ButtonBit.TurnRight;
  if (car.speedPwm) return { y: round(d.y * 100), x: round(d.x * 100), flags, speedPwm: pwm };
  const k = (pwm / 255) * 100;
  return { y: round(d.y * k), x: round(d.x * k), flags };
}
