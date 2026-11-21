import { FUNCTION_COUNT, FUNCTION_MASK, FUNCTION_SHIFT, MOTOR_SPEED_MAX } from '../protocol/constants';
import type { ControlInput } from '../protocol/packet';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type ControlMode = 'MODE_1' | 'MODE_2';

/** Trạng thái giao diện điều khiển (giống app NQFT). */
export interface UiControlState {
  mode: ControlMode;
  /** Nút hướng đang giữ (MODE 1) — giữ 2 nút cùng lúc để đi chéo. */
  pressed: readonly Direction[];
  /** Joystick (MODE 2): -100..100, y dương = tiến. */
  joystick: { x: number; y: number };
  /** 0..255 — giới hạn ga (tiến/lùi). */
  motor1Speed: number;
  /** 0..255 — giới hạn lái (trái/phải). */
  motor2Speed: number;
  /** 0 = không chọn, 1..4 = F1..F4. */
  func: number;
}

function scale(axis: number, speed: number): number {
  const s = Math.max(0, Math.min(MOTOR_SPEED_MAX, speed)) / MOTOR_SPEED_MAX;
  const v = Math.round(Math.max(-100, Math.min(100, axis)) * s);
  return v === 0 ? 0 : v; // tránh -0
}

/** Ghi số Function (0..4) vào bit 3..5 của flags, giữ nguyên các bit khác. */
export function withFunction(flags: number, func: number): number {
  const f = Number.isInteger(func) && func >= 0 && func <= FUNCTION_COUNT ? func : 0;
  return (flags & ~FUNCTION_MASK & 0xff) | (f << FUNCTION_SHIFT);
}

/** Chuyển trạng thái UI thành lệnh CONTROL gửi qua BLE. */
export function mapInput(s: UiControlState): ControlInput {
  let x: number;
  let y: number;
  if (s.mode === 'MODE_1') {
    const has = (d: Direction) => s.pressed.includes(d);
    y = (has('UP') ? 100 : 0) - (has('DOWN') ? 100 : 0);
    x = (has('RIGHT') ? 100 : 0) - (has('LEFT') ? 100 : 0);
  } else {
    x = s.joystick.x;
    y = s.joystick.y;
  }
  return {
    throttle: scale(y, s.motor1Speed),
    steering: scale(x, s.motor2Speed),
    flags: withFunction(0, s.func),
  };
}
