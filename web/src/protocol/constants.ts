// Đồng bộ với firmware/WUD_Tournaments/src/WUD_Protocol.h và docs/protocol.md
export const PROTOCOL_VERSION = 6;

export const SERVICE_UUID = '6e3a0001-8f5c-4b7a-9d2e-3c1f0a7b5e10';
export const CONTROL_CHAR_UUID = '6e3a0002-8f5c-4b7a-9d2e-3c1f0a7b5e10';
export const TELEMETRY_CHAR_UUID = '6e3a0003-8f5c-4b7a-9d2e-3c1f0a7b5e10';
/** Thông số từng bánh + ma trận hướng (12 byte), ghi khi bấm "Lưu vào xe". */
export const CONFIG_CHAR_UUID = '6e3a0004-8f5c-4b7a-9d2e-3c1f0a7b5e10';
/** Chạy thử 1 bánh (2 byte), gửi lặp lại khi giữ nút KIỂM TRA. */
export const TEST_CHAR_UUID = '6e3a0005-8f5c-4b7a-9d2e-3c1f0a7b5e10';

export const DEVICE_NAME_PREFIX = 'RC-Car-';

export const CONTROL_PACKET_LEN = 4;
/** v6: thêm byte 4 = PWM của mức tốc độ (Chậm 140 / Vừa 200 / Nhanh 255). */
export const CONTROL_SPEED_PACKET_LEN = 5;
export const TELEMETRY_PACKET_LEN = 4;
export const CONFIG_PACKET_LEN = 12;
/** CONFIG v1 (firmware 0.1.x): 8 byte, không có ma trận. */
export const CONFIG_V1_LEN = 8;
export const CONFIG_VERSION = 2;
export const TEST_PACKET_LEN = 2;
/** Byte bánh = 0xFF: dừng chạy thử. */
export const TEST_STOP = 0xff;
/** Gửi lại gói TEST mỗi 100 ms khi đang giữ nút (xe tự dừng nếu 300 ms không nhận). */
export const TEST_INTERVAL_MS = 100;

/** Tần số gửi lệnh: 30 Hz */
export const CONTROL_INTERVAL_MS = 33;

/**
 * Byte flags (v4): mỗi bit = 1 nút đang giữ, nên gửi được nhiều nút cùng lúc.
 * Bit 6..7 = nút quẹo trái/phải, chỉ hiện khi bánh omni/mecanum.
 */
export const ButtonBit = {
  Func1: 1 << 0,
  Func2: 1 << 1,
  Square: 1 << 2, // □
  Circle: 1 << 3, // ○
  Triangle: 1 << 4, // △ (cản banh)
  Cross: 1 << 5, // ✕ (sút banh)
  TurnLeft: 1 << 6,
  TurnRight: 1 << 7,
} as const;
export type ButtonBitValue = (typeof ButtonBit)[keyof typeof ButtonBit];
/** 6 nút người dùng bấm trực tiếp (bit 0..5); bit 6..7 do nút quẹo tạo ra. */
export const BUTTON_MASK = 0x3f;

export const TelemetryStatus = {
  Failsafe: 1 << 0,
  /** Trong code chưa khai báo chân PWM (EN) -> không có mức Chậm/Vừa/Nhanh. */
  NoPwmPin: 1 << 1,
  /** Xe hiểu byte speedPwm của gói CONTROL (firmware từ 0.3.0). */
  SpeedPwm: 1 << 2,
} as const;
