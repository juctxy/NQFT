#pragma once

// ===== Giao thức BLE (đồng bộ với web/src/protocol/constants.ts và docs/protocol.md) =====
#define PROTOCOL_VERSION      1

#define SERVICE_UUID          "6e3a0001-8f5c-4b7a-9d2e-3c1f0a7b5e10"
#define CONTROL_CHAR_UUID     "6e3a0002-8f5c-4b7a-9d2e-3c1f0a7b5e10"
#define TELEMETRY_CHAR_UUID   "6e3a0003-8f5c-4b7a-9d2e-3c1f0a7b5e10"

#define DEVICE_NAME_PREFIX    "RC-Car-"

#define CONTROL_PACKET_LEN    4
#define TELEMETRY_PACKET_LEN  4

// ===== Thời gian (ms) =====
#define FAILSAFE_TIMEOUT_MS   500
#define TELEMETRY_INTERVAL_MS 500
#define LOG_INTERVAL_MS       200   // giới hạn tần suất in log lệnh ra Serial

// ===== Thông số kết nối (đơn vị 1.25 ms; timeout đơn vị 10 ms) =====
#define CONN_MIN_INTERVAL     6     // 7.5 ms
#define CONN_MAX_INTERVAL     12    // 15 ms
#define CONN_LATENCY          0
#define CONN_TIMEOUT          200   // 2 s

// ===== Phần cứng (chưa thiết kế) =====
// Chân ADC đo pin qua cầu phân áp. -1 = chưa có cảm biến (telemetry gửi 0 mV).
#define BATTERY_ADC_PIN       -1
// Hệ số cầu phân áp: Vpin = Vadc * (R1 + R2) / R2. Ví dụ R1=100k, R2=33k -> 4.03
#define BATTERY_DIVIDER_RATIO 4.03f
