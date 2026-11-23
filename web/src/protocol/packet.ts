import {
  CONFIG_PACKET_LEN,
  CONFIG_V1_LEN,
  CONFIG_VERSION,
  CONTROL_PACKET_LEN,
  TELEMETRY_PACKET_LEN,
  TEST_PACKET_LEN,
  TEST_STOP,
  TelemetryStatus,
} from './constants';

/** Dấu của 4 bánh theo thứ tự FL, FR, BL, BR: -1, 0 hoặc 1. */
export type WheelSigns = [number, number, number, number];

/** Nội dung ô CONFIG (v2). Thứ tự bánh luôn là FL, FR, BL, BR. */
export interface CarConfig {
  /** Bù công suất 0..100 % */
  trim: [number, number, number, number];
  /** PWM tối thiểu khi bánh đang quay: 0..255 */
  minPwm: number;
  /** Đảo chiều: bit 0..3 = FL, FR, BL, BR */
  invertMask: number;
  /** Tốc độ xoay khi giữ nút QUẸO: 0..100 % */
  turnSpeed: number;
  /** true = xe dùng `matrix` thay công thức trộn bánh có sẵn */
  customMatrix: boolean;
  /** Ma trận hướng: dấu từng bánh cho Tiến, Ngang, Xoay */
  matrix: { fwd: WheelSigns; side: WheelSigns; turn: WheelSigns };
}

export interface ControlInput {
  /** Trục Oy -100..100: dương = hướng lên (tiến) */
  y: number;
  /** Trục Ox -100..100: dương = sang phải */
  x: number;
  /** bitmask ButtonBit: nút đang giữ (bit 0..7) */
  flags: number;
}

export interface Telemetry {
  batteryMv: number;
  failsafe: boolean;
  lastSeq: number;
  status: number;
}

export const NEUTRAL_INPUT: ControlInput = { y: 0, x: 0, flags: 0 };

function clampAxis(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(-100, Math.min(100, Math.round(v)));
}

export function encodeControl(seq: number, input: ControlInput): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(new ArrayBuffer(CONTROL_PACKET_LEN));
  const view = new DataView(buf.buffer);
  view.setUint8(0, seq & 0xff);
  view.setInt8(1, clampAxis(input.y));
  view.setInt8(2, clampAxis(input.x));
  view.setUint8(3, input.flags & 0xff);
  return buf;
}

const clampByte = (v: number, max: number) => Math.max(0, Math.min(max, Math.round(Number.isFinite(v) ? v : 0)));

/** 1 byte = dấu 4 bánh, mỗi bánh 2 bit (FL = bit 0..1 … BR = bit 6..7): 0 → 0, 1 → +1, 3 → −1. */
function packSigns(signs: WheelSigns): number {
  return signs.reduce<number>((b, v, i) => b | ((v > 0 ? 1 : v < 0 ? 3 : 0) << (2 * i)), 0);
}

function unpackSigns(b: number): WheelSigns {
  const code = (i: number) => (b >> (2 * i)) & 3;
  const sign = (c: number) => (c === 1 ? 1 : c === 3 ? -1 : 0);
  return [sign(code(0)), sign(code(1)), sign(code(2)), sign(code(3))];
}

export function encodeConfig(c: CarConfig): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(new ArrayBuffer(CONFIG_PACKET_LEN));
  buf[0] = CONFIG_VERSION;
  c.trim.forEach((t, i) => (buf[1 + i] = clampByte(t, 100)));
  buf[5] = clampByte(c.minPwm, 255);
  buf[6] = c.invertMask & 0x0f;
  buf[7] = clampByte(c.turnSpeed, 100);
  buf[8] = c.customMatrix ? 1 : 0;
  buf[9] = packSigns(c.matrix.fwd);
  buf[10] = packSigns(c.matrix.side);
  buf[11] = packSigns(c.matrix.turn);
  return buf;
}

/** Đọc ô CONFIG. Firmware cũ trả v1 (8 byte, không có ma trận). null = không đọc được. */
export function decodeConfig(view: DataView): CarConfig | null {
  if (view.byteLength < CONFIG_V1_LEN) return null;
  const version = view.getUint8(0);
  const v2 = version === 2 && view.byteLength >= CONFIG_PACKET_LEN;
  if (version !== 1 && !v2) return null;
  const zero: WheelSigns = [0, 0, 0, 0];
  return {
    trim: [1, 2, 3, 4].map((i) => view.getUint8(i)) as CarConfig['trim'],
    minPwm: view.getUint8(5),
    invertMask: view.getUint8(6) & 0x0f,
    turnSpeed: view.getUint8(7),
    customMatrix: v2 ? (view.getUint8(8) & 1) === 1 : false,
    matrix: v2
      ? { fwd: unpackSigns(view.getUint8(9)), side: unpackSigns(view.getUint8(10)), turn: unpackSigns(view.getUint8(11)) }
      : { fwd: zero, side: [...zero], turn: [...zero] },
  };
}

/**
 * Gói TEST: chạy thử 1 bánh. wheel 0..3 = FL, FR, BL, BR; null = dừng.
 * speed -100..100. Xe chỉ tính "reverse" trong code, không tính đảo chiều/bù của CONFIG.
 */
export function encodeTest(wheel: number | null, speed: number): Uint8Array<ArrayBuffer> {
  const buf = new Uint8Array(new ArrayBuffer(TEST_PACKET_LEN));
  const view = new DataView(buf.buffer);
  view.setUint8(0, wheel === null ? TEST_STOP : wheel & 0x03);
  view.setInt8(1, wheel === null ? 0 : clampAxis(speed));
  return buf;
}

export function decodeTelemetry(view: DataView): Telemetry | null {
  if (view.byteLength < TELEMETRY_PACKET_LEN) return null;
  const status = view.getUint8(2);
  return {
    batteryMv: view.getUint16(0, true),
    status,
    failsafe: (status & TelemetryStatus.Failsafe) !== 0,
    lastSeq: view.getUint8(3),
  };
}
