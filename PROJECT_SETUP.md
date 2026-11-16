# RC Car BLE — Quyết định & Quy trình chuẩn bị

> Tài liệu này chốt **các lựa chọn đã quyết định** và **quy trình chuẩn bị** cho giai đoạn hiện tại.
> Kế hoạch tổng thể (công nghệ, kiến trúc, các giai đoạn): xem [`RC_CAR_PWA_PLAN.md`](RC_CAR_PWA_PLAN.md).
> Cập nhật: 2026-11-16

---

## 1. Phạm vi giai đoạn hiện tại

**Làm:**
- Khung dự án (monorepo: `firmware/` + `web/`).
- Firmware ESP32: BLE server (NimBLE), nhận lệnh điều khiển, gửi telemetry, failsafe.
- PWA: khung app, kết nối / ngắt / tự kết nối lại BLE với ESP32, gửi lệnh 30 Hz, nhận telemetry.
- Một trang kiểm tra kết nối tối giản (không thiết kế UI).

**Chưa làm:**
- Thiết kế phần cứng xe (động cơ, driver, servo, pin) → firmware chỉ in lệnh ra Serial.
- Thiết kế giao diện lái (joystick, HUD…).
- Wi-Fi dự phòng, OTA, nhiều xe.

---

## 2. Bluefy trên iOS — câu trả lời

**Có, dùng được — có điều kiện.**

| Hạng mục | Trên Bluefy (iOS) |
|---|---|
| Mở PWA bằng link HTTPS | ✅ |
| Web Bluetooth: quét, kết nối, ghi, nhận notify | ✅ — Bluefy được làm ra chính để hỗ trợ việc này |
| Cài lên màn hình chính như PWA thật (standalone, icon riêng) | ❌ — vẫn chạy bên trong Bluefy (có thể lưu bookmark) |
| Chạy offline bằng Service Worker | ⚠️ Không đảm bảo (Bluefy dùng WebView của iOS) → trên iOS cần có mạng khi mở app |
| `getDevices()` / tự kết nối lại sau khi mở lại app | ⚠️ Có thể không hỗ trợ → người dùng bấm "Kết nối" lại |

**Cách xử lý trong code:**
- Chỉ dùng phần Web Bluetooth cơ bản (`requestDevice`, `gatt.connect`, `writeValue*`, `startNotifications`).
- Nếu `writeValueWithoutResponse` không có → tự chuyển sang `writeValue`.
- Kiểm tra tính năng trước khi dùng, không giả định.
- UUID viết **chữ thường** (Bluefy và Chrome đều chấp nhận).

> ⚠️ Chưa test trên iPhone thật — cần kiểm chứng ở bước test (mục 6).

→ **Tiếp tục dự án với PWA.** Người dùng iOS: cài Bluefy → mở link app.

---

## 3. Bảng quyết định

### 3.1. Nền tảng & phát hành
| # | Hạng mục | Quyết định |
|---|---|---|
| 1 | Nền tảng app | **PWA** (Web Bluetooth) |
| 2 | iOS | Dùng qua trình duyệt **Bluefy** (miễn phí) |
| 3 | Android | Chrome (PWA cài lên màn hình chính) + **APK trên GitHub Releases** (đóng gói bằng PWABuilder/Bubblewrap — làm ở giai đoạn sau) |
| 4 | Máy Mac | Không có → không ảnh hưởng (PWA không cần Mac) |
| 5 | Đối tượng | **Công khai** |
| — | Hosting | **GitHub Pages** + **GitHub Actions** tự deploy |

> Ghi chú APK (giai đoạn sau): để APK dạng TWA hiển thị toàn màn hình (không thanh URL), cần file `/.well-known/assetlinks.json` ở **gốc tên miền**. GitHub Pages dạng `username.github.io/repo` không đặt được file ở gốc → khi đó dùng repo `username.github.io` hoặc Cloudflare Pages / tên miền riêng. Chưa cần xử lý bây giờ.

### 3.2. Phần cứng
| # | Hạng mục | Quyết định |
|---|---|---|
| 6–11 | Kiểu lái, khung xe, động cơ, pin, phụ kiện | **Hoãn.** Firmware chỉ log lệnh ra Serial; phần điều khiển động cơ là hàm rỗng để điền sau |
| 9 | Chip | Bất kỳ ESP32 **có BLE** (ESP32 / C3 / S3 / C6). Không dùng ESP32-S2 |

### 3.3. Firmware
| # | Hạng mục | Quyết định |
|---|---|---|
| 12 | IDE | **Arduino IDE 2.x** |
| — | Board core | **esp32 by Espressif Systems** (v3.x) |
| 13 | BLE stack | **NimBLE-Arduino** (h2zero) **v2.x** |
| 14 | Wi-Fi dự phòng | Chưa làm |
| 15 | OTA | Chưa làm |
| 16 | Số xe | **1 xe** / 1 lần kết nối |
| 17 | Bảo mật | Kết nối mở (không PIN) ở giai đoạn này; chỉ cho **1 kết nối cùng lúc** |

### 3.4. PWA
| # | Hạng mục | Quyết định |
|---|---|---|
| — | Ngôn ngữ | **TypeScript** |
| — | Build | **Vite** |
| — | UI framework | **React** (gần với React Native bạn đã định dùng) |
| — | PWA | **vite-plugin-pwa** (Workbox), cập nhật tự động |
| — | Dev HTTPS | **@vitejs/plugin-basic-ssl** (để test trên điện thoại qua LAN) |
| — | Icon | **@vite-pwa/assets-generator** từ 1 file SVG |
| 20–25 | Giao diện lái, cài đặt, ngôn ngữ, phong cách | **Hoãn**. Trang test hiện tại dùng tiếng Việt |
| 31 | Test | **Vitest** — unit test phần mã hóa/giải mã gói tin |

### 3.5. Thông số điều khiển (mặc định)
| # | Hạng mục | Giá trị |
|---|---|---|
| 26 | Tần số gửi lệnh | **30 Hz** (~33 ms) — chỉ gửi gói mới nhất, bỏ qua nếu lần ghi trước chưa xong |
| 27 | Failsafe | **500 ms** không nhận lệnh → dừng |
| — | Telemetry | **2 Hz** (500 ms) |
| — | Connection interval yêu cầu | 7.5–15 ms |
| — | Tự kết nối lại | Tối đa 5 lần, giãn cách tăng dần |
| 28 | Chế độ tốc độ | Hoãn (cờ `flags` đã dành chỗ) |

### 3.6. Quy trình
| # | Hạng mục | Quyết định |
|---|---|---|
| 29 | Repo | **Monorepo** (`firmware/` + `web/` + `docs/`) |
| 30 | Mã nguồn | **Công khai** trên GitHub |
| 31 | Kiểm thử | Unit test + test thủ công trên máy thật |
| 32 | Máy test | Cần ít nhất 1 Android (Chrome) + 1 iPhone (Bluefy) — **cần bạn xác nhận** |

---

## 4. Quy trình chuẩn bị môi trường

### 4.1. Máy tính (Windows)
| Bước | Việc cần làm | Trạng thái |
|---|---|---|
| 1 | Cài **Node.js LTS** | ✅ Đã có (v26) |
| 2 | Cài **Git** | ✅ Đã có |
| 3 | Cài **Arduino IDE 2.x** | ✅ Đã có |
| 4 | Arduino IDE → *File → Preferences → Additional boards manager URLs*, thêm: `https://espressif.github.io/arduino-esp32/package_esp32_index.json` | ⬜ |
| 5 | *Tools → Board → Boards Manager* → tìm **esp32** (Espressif Systems) → Install (bản 3.x) | ⬜ |
| 6 | *Tools → Manage Libraries* → tìm **NimBLE-Arduino** (h2zero) → Install (bản 2.x) | ⬜ |
| 7 | Cài driver USB-Serial nếu máy không nhận board: **CP210x** hoặc **CH340** (tùy board) | ⬜ |
| 8 | Tạo tài khoản / repo GitHub công khai | ⬜ |
| 9 | (Tùy chọn) VS Code để sửa code web | ⬜ |

### 4.2. Điện thoại
| Bước | Việc cần làm |
|---|---|
| 1 | **Android:** Chrome bản mới; bật Bluetooth; khi được hỏi, cho phép quyền **"Thiết bị ở gần"** (Android 12+) hoặc **Vị trí** (Android ≤ 11) |
| 2 | **iPhone:** cài **Bluefy – Web BLE Browser** (App Store, miễn phí) |
| 3 | Cài **nRF Connect for Mobile** (miễn phí) để kiểm tra ESP32 độc lập với app |
| 4 | (Android) Bật **Tùy chọn nhà phát triển → Gỡ lỗi USB** để debug bằng `chrome://inspect` |

### 4.3. Nạp firmware
1. Mở `firmware/rc_car_ble/rc_car_ble.ino` bằng Arduino IDE.
2. *Tools → Board*: chọn đúng board (vd **ESP32 Dev Module**, **ESP32C3 Dev Module**…). Với ESP32-C3/S3 dùng USB tích hợp: bật **USB CDC On Boot: Enabled** để thấy Serial.
3. *Tools → Port*: chọn cổng COM.
4. Upload → mở **Serial Monitor** ở **115200 baud** → thấy dòng `[BLE] Advertising as RC-Car-XXXX`.

### 4.4. Chạy PWA
```bash
cd web
npm install
npm run dev          # https://localhost:5173 và https://<IP-LAN>:5173
npm test             # chạy unit test
npm run build        # build production vào web/dist
```
- Máy tính có Bluetooth: mở `https://localhost:5173` bằng Chrome/Edge là test được luôn.
- Điện thoại cùng Wi-Fi: mở `https://<IP-máy-tính>:5173` → chấp nhận cảnh báo chứng chỉ tự ký.
  - Lưu ý: chứng chỉ tự ký có thể khiến Service Worker không đăng ký trên điện thoại — bình thường khi dev; bản deploy GitHub Pages có HTTPS thật.

---

## 5. Quy trình thực hiện giai đoạn này

| Bước | Nội dung | Kết quả mong đợi | Trạng thái |
|---|---|---|---|
| 1 | Viết đặc tả giao thức `docs/protocol.md` | UUID + định dạng gói thống nhất giữa firmware và app | ✅ |
| 2 | Firmware: BLE server + CONTROL + TELEMETRY + failsafe | Serial log lệnh nhận được | ✅ Đã viết — **chưa biên dịch/nạp thử** |
| 3 | Test firmware bằng **nRF Connect** | Ghi `01 32 00 00` → log `thr=50`; ngắt kết nối → log failsafe | ⬜ Cần phần cứng |
| 4 | Khởi tạo `web/` (Vite + React + TS + PWA) | `npm run dev` chạy | ✅ |
| 5 | `protocol/` + unit test | `npm test` pass | ✅ 5/5 test pass |
| 6 | `BleTransport` + control loop 30 Hz | Kết nối, gửi lệnh, nhận telemetry | ✅ Đã viết — chưa test với ESP32 thật |
| 7 | Trang test tối giản | Nút kết nối, trạng thái, 2 thanh trượt thử ga/lái, hiển thị telemetry | ✅ |
| 8 | GitHub Actions deploy GitHub Pages | Có link HTTPS công khai | ✅ Workflow đã viết — cần tạo repo & push |
| 9 | Test máy thật (mục 6) | Đạt checklist | ⬜ |

---

## 6. Checklist kiểm thử kết nối

**Android (Chrome)**
- [ ] Bấm "Kết nối" → hiện hộp thoại chọn thiết bị → thấy `RC-Car-XXXX`
- [ ] Kết nối thành công, trạng thái "Đã kết nối"
- [ ] Kéo thanh ga → Serial Monitor hiện giá trị tương ứng
- [ ] Telemetry cập nhật ~2 lần/giây
- [ ] Rút điện ESP32 → app báo mất kết nối → cắm lại → app tự kết nối lại
- [ ] Chuyển app xuống nền → ESP32 failsafe trong ≤ 500 ms
- [ ] Cài PWA lên màn hình chính, mở lại không có mạng vẫn chạy

**iOS (Bluefy)**
- [ ] Mở link app trong Bluefy → "Kết nối" → chọn thiết bị → thành công
- [ ] Gửi lệnh & nhận telemetry như Android
- [ ] Mất kết nối → app báo đúng trạng thái

**Firmware (nRF Connect)**
- [ ] Thấy service UUID `6e3a0001-…`
- [ ] Ghi CONTROL thủ công → log đúng
- [ ] Bật notify TELEMETRY → nhận dữ liệu
- [ ] Không gửi lệnh 500 ms → log `FAILSAFE`
