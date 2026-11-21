// Đồng bộ với firmware/rc_car_ble/config.h và docs/protocol.md
export const PROTOCOL_VERSION = 3;

export const SERVICE_UUID = '6e3a0001-8f5c-4b7a-9d2e-3c1f0a7b5e10';
export const CONTROL_CHAR_UUID = '6e3a0002-8f5c-4b7a-9d2e-3c1f0a7b5e10';
export const TELEMETRY_CHAR_UUID = '6e3a0003-8f5c-4b7a-9d2e-3c1f0a7b5e10';

export const DEVICE_NAME_PREFIX = 'RC-Car-';

export const CONTROL_PACKET_LEN = 4;
export const TELEMETRY_PACKET_LEN = 4;

/** Tần số gửi lệnh: 30 Hz */
export const CONTROL_INTERVAL_MS = 33;

/**
 * Byte flags (v3): mỗi bit = 1 nút đang giữ, nên gửi được nhiều nút cùng lúc.
 * Bit 6..7 dự trữ (luôn 0).
 */
export const ButtonBit = {
  Func1: 1 << 0,
  Func2: 1 << 1,
  Func3: 1 << 2,
  Func4: 1 << 3,
  Block: 1 << 4, // CẢN
  Kick: 1 << 5, // SÚT
} as const;
export type ButtonBitValue = (typeof ButtonBit)[keyof typeof ButtonBit];
export const BUTTON_MASK = 0x3f;

export const TelemetryStatus = {
  Failsafe: 1 << 0,
} as const;
