// Đồng bộ với firmware/rc_car_ble/config.h và docs/protocol.md
export const PROTOCOL_VERSION = 2;

export const SERVICE_UUID = '6e3a0001-8f5c-4b7a-9d2e-3c1f0a7b5e10';
export const CONTROL_CHAR_UUID = '6e3a0002-8f5c-4b7a-9d2e-3c1f0a7b5e10';
export const TELEMETRY_CHAR_UUID = '6e3a0003-8f5c-4b7a-9d2e-3c1f0a7b5e10';

export const DEVICE_NAME_PREFIX = 'RC-Car-';

export const CONTROL_PACKET_LEN = 4;
export const TELEMETRY_PACKET_LEN = 4;

/** Tần số gửi lệnh: 30 Hz */
export const CONTROL_INTERVAL_MS = 33;

export const ControlFlag = {
  Light: 1 << 0,
  Horn: 1 << 1,
  Brake: 1 << 2,
} as const;

/**
 * Nút hành động đang giữ: mã 0..6 ở bit 3..5 của flags (0 = không nhấn).
 * 1..4 = FUNC 1..4, 5 = CẢN, 6 = SÚT.
 */
export const ACTION_SHIFT = 3;
export const ACTION_MASK = 0b111 << ACTION_SHIFT;
export const ActionCode = {
  None: 0,
  Func1: 1,
  Func2: 2,
  Func3: 3,
  Func4: 4,
  Block: 5,
  Kick: 6,
} as const;
export type ActionCodeValue = (typeof ActionCode)[keyof typeof ActionCode];

export const TelemetryStatus = {
  Failsafe: 1 << 0,
} as const;
