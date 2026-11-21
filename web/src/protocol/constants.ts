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

/** Nút Function F1..F4: số 0..4 (0 = không chọn) nằm ở bit 3..5 của flags. */
export const FUNCTION_SHIFT = 3;
export const FUNCTION_MASK = 0b111 << FUNCTION_SHIFT;
export const FUNCTION_COUNT = 4;

/** Giá trị tối đa của thanh tốc độ Motor 1 / Motor 2 trên UI. */
export const MOTOR_SPEED_MAX = 255;

export const TelemetryStatus = {
  Failsafe: 1 << 0,
} as const;
