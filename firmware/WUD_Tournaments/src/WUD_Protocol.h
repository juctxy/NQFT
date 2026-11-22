#pragma once
// Giao thức BLE v4 — đồng bộ với web/src/protocol/constants.ts và docs/protocol.md.
// Đổi bất kỳ giá trị nào ở đây thì phải đổi cả bên web.

#include <stdint.h>

#define WUD_PROTOCOL_VERSION 4

#define WUD_SERVICE_UUID         "6e3a0001-8f5c-4b7a-9d2e-3c1f0a7b5e10"
#define WUD_CONTROL_CHAR_UUID    "6e3a0002-8f5c-4b7a-9d2e-3c1f0a7b5e10"
#define WUD_TELEMETRY_CHAR_UUID  "6e3a0003-8f5c-4b7a-9d2e-3c1f0a7b5e10"
#define WUD_CONFIG_CHAR_UUID     "6e3a0004-8f5c-4b7a-9d2e-3c1f0a7b5e10"

#define WUD_DEVICE_NAME_PREFIX   "RC-Car-"

constexpr uint8_t WUD_CONTROL_PACKET_LEN   = 4;  // [seq, y, x, flags]
constexpr uint8_t WUD_TELEMETRY_PACKET_LEN = 4;  // [mV lo, mV hi, status, lastSeq]
constexpr uint8_t WUD_CONFIG_PACKET_LEN    = 8;  // xem WUD_Config
constexpr uint8_t WUD_CONFIG_VERSION       = 1;

// Byte flags: mỗi bit = 1 nút đang giữ.
constexpr uint8_t WUD_BIT_FUNC1      = 1 << 0;  // nút giữa
constexpr uint8_t WUD_BIT_FUNC2      = 1 << 1;  // nút giữa
constexpr uint8_t WUD_BIT_SQUARE     = 1 << 2;  // □ cụm phải
constexpr uint8_t WUD_BIT_CIRCLE     = 1 << 3;  // ○ cụm phải
constexpr uint8_t WUD_BIT_TRIANGLE   = 1 << 4;  // △ cụm phải
constexpr uint8_t WUD_BIT_CROSS      = 1 << 5;  // ✕ cụm phải
constexpr uint8_t WUD_BIT_TURN_LEFT  = 1 << 6;  // quẹo trái (chỉ hiện khi MECANUM/OMNI)
constexpr uint8_t WUD_BIT_TURN_RIGHT = 1 << 7;  // quẹo phải (chỉ hiện khi MECANUM/OMNI)

constexpr uint8_t WUD_TELEMETRY_FAILSAFE = 1 << 0;
