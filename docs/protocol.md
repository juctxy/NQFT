# Giao thức BLE — RC Car

Phiên bản giao thức: **1**

Nguồn sự thật cho các hằng số:
- Firmware: `firmware/rc_car_ble/config.h`
- Web: `web/src/protocol/constants.ts`

Khi đổi giao thức, sửa **cả hai** file và tăng `PROTOCOL_VERSION`.

## Quảng bá (Advertising)

| Trường | Giá trị |
|---|---|
| Tên thiết bị | `RC-Car-XXXX` (XXXX = 4 ký tự hex lấy từ MAC) — nằm trong **scan response** |
| Service UUID | nằm trong **advertising data** (để app lọc theo service) |
| Số kết nối đồng thời | 1 |

## GATT

Service: `6e3a0001-8f5c-4b7a-9d2e-3c1f0a7b5e10`

| Characteristic | UUID | Thuộc tính | Kích thước |
|---|---|---|---|
| CONTROL | `6e3a0002-8f5c-4b7a-9d2e-3c1f0a7b5e10` | Write Without Response, Write | 4 byte |
| TELEMETRY | `6e3a0003-8f5c-4b7a-9d2e-3c1f0a7b5e10` | Notify, Read | 4 byte |

Tất cả số nhiều byte dùng **little-endian**.

### CONTROL (app → xe), 30 Hz

| Byte | Tên | Kiểu | Phạm vi | Ý nghĩa |
|---|---|---|---|---|
| 0 | `seq` | uint8 | 0–255 (quay vòng) | Số thứ tự gói |
| 1 | `throttle` | int8 | -100..100 | Âm = lùi, dương = tiến |
| 2 | `steering` | int8 | -100..100 | Âm = trái, dương = phải |
| 3 | `flags` | uint8 | bitmask | Xem bảng dưới |

`flags`:
| Bit | Ý nghĩa |
|---|---|
| 0 | Đèn |
| 1 | Còi |
| 2 | Phanh |
| 3–7 | Dự trữ (gửi 0) |

Giá trị ngoài phạm vi bị firmware kẹp (clamp) về -100..100. Gói ngắn hơn 4 byte bị bỏ qua.

Ví dụ (hex): `01 32 00 00` = seq 1, tiến 50 %, thẳng, không cờ. `02 00 9C 00` = seq 2, đứng yên, lái trái hết (-100).

### TELEMETRY (xe → app), 2 Hz

| Byte | Tên | Kiểu | Ý nghĩa |
|---|---|---|---|
| 0–1 | `batteryMv` | uint16 | Điện áp pin (mV); 0 = chưa có cảm biến |
| 2 | `status` | uint8 | bitmask, xem dưới |
| 3 | `lastSeq` | uint8 | `seq` của gói CONTROL gần nhất xe nhận được |

`status`:
| Bit | Ý nghĩa |
|---|---|
| 0 | Failsafe đang kích hoạt (xe đang dừng do không nhận lệnh) |
| 1–7 | Dự trữ |

## Quy tắc an toàn

- **Failsafe:** quá **500 ms** không nhận gói CONTROL hợp lệ → throttle = 0, steering = 0, flags = 0.
- **Mất kết nối:** dừng ngay, quảng bá lại.
- **App:** gửi liên tục 30 Hz kể cả khi đứng yên (đóng vai trò heartbeat). Khi trang bị ẩn (`visibilitychange`) → gửi lệnh dừng và ngừng gửi.
