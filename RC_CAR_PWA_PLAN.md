# Kế hoạch dự án: App điều khiển RC Car (ESP32) qua Bluetooth — PWA

> Mục tiêu: một app điều khiển xe RC dùng ESP32 qua Bluetooth, chạy trên **Android và iOS**, phân phối **không tốn phí**.
> Hướng tiếp cận ban đầu: **PWA (Progressive Web App) + Web Bluetooth (BLE)**.
>
> 🔄 **CẬP NHẬT:** Đang cân nhắc chuyển sang **React Native** — xem [Mục 7](#7-cập-nhật-phương-án-react-native). Phần firmware ESP32, phần cứng và giao thức BLE (mục 1, 2.1, 2.2) **giữ nguyên** cho cả hai hướng.

---

## 0. Những điểm cần biết TRƯỚC khi bắt đầu (rất quan trọng)

### 0.1. iOS không hỗ trợ Web Bluetooth
- PWA nói chuyện với ESP32 qua **Web Bluetooth API**.
- **Android (Chrome, Edge, Samsung Internet, Opera): hỗ trợ tốt.**
- **iOS: Safari KHÔNG hỗ trợ Web Bluetooth**, và mọi trình duyệt trên iOS (Chrome, Edge, Firefox…) đều bắt buộc dùng engine WebKit của Safari → **PWA cài từ Safari trên iPhone sẽ không kết nối Bluetooth được.**
- Cách xử lý cho iOS (chọn 1 hoặc kết hợp):

| Phương án | Chi phí | Ưu điểm | Nhược điểm |
|---|---|---|---|
| **A. Mở PWA bằng trình duyệt Bluefy** (App Store, miễn phí) | 0đ | Không phải sửa code, dùng chung Web Bluetooth | Người dùng phải cài Bluefy; không "Add to Home Screen" như PWA thật |
| **B. Chế độ Wi-Fi dự phòng**: ESP32 phát Wi-Fi (AP) + WebSocket, PWA kết nối qua Wi-Fi | 0đ | Chạy trên mọi trình duyệt, kể cả Safari | Không phải Bluetooth; điện thoại mất Internet khi nối vào Wi-Fi của xe |
| C. Bọc app native (Capacitor/Flutter) | **99 USD/năm** (Apple Developer) | Trải nghiệm native đầy đủ | Không thỏa yêu cầu "không tốn tiền" |

**Đề xuất:** Thiết kế lớp giao tiếp (transport) trừu tượng ngay từ đầu: `BleTransport` (chính) + `WebSocketTransport` (dự phòng cho iOS). Hướng dẫn người dùng iOS dùng Bluefy hoặc chế độ Wi-Fi.

### 0.2. "Publish" miễn phí nghĩa là gì?
- **App Store (iOS)**: bắt buộc Apple Developer Program **99 USD/năm** → không miễn phí.
- **Google Play (Android)**: phí **25 USD một lần** → không miễn phí.
- **PWA**: host trên GitHub Pages / Cloudflare Pages / Netlify (miễn phí, có HTTPS). Người dùng mở link → "Thêm vào màn hình chính" (Add to Home Screen) → dùng như app. **Đây là cách phát hành miễn phí duy nhất cho cả 2 nền tảng.**
- (Tùy chọn sau này) Android: có thể đóng gói PWA thành APK bằng **PWABuilder / Bubblewrap (TWA)** để cài trực tiếp (sideload) miễn phí.

### 0.3. ESP32 phải dùng BLE, không dùng Bluetooth Classic
- Web Bluetooth **chỉ hỗ trợ BLE (GATT)**, không hỗ trợ Bluetooth Classic SPP (`BluetoothSerial`).
- Chọn chip có BLE: **ESP32 (WROOM-32), ESP32-C3, ESP32-S3, ESP32-C6**. ⚠️ **ESP32-S2 không có Bluetooth** — không dùng được.

### 0.4. Yêu cầu bắt buộc của Web Bluetooth
- Trang phải chạy qua **HTTPS** (hoặc `localhost` khi phát triển).
- `navigator.bluetooth.requestDevice()` phải được gọi **từ thao tác người dùng** (bấm nút) — không tự kết nối khi mở app lần đầu.
- Android 12+: Chrome cần quyền **"Thiết bị ở gần" (Nearby devices)**; Android cũ hơn cần bật **Vị trí (Location)**.

---

## 1. Những gì cần dùng cho dự án (tổng quan)

### 1.1. Phần cứng
| Thành phần | Gợi ý cụ thể | Ghi chú |
|---|---|---|
| Vi điều khiển | ESP32 DevKit V1 (WROOM-32) hoặc ESP32-C3 SuperMini / ESP32-S3 | Phải có BLE |
| Khung xe | Khung RC có sẵn, hoặc khung 2WD/4WD robot kit | |
| Động cơ kéo | DC motor N20 / TT gear motor / motor 130/370 | Hoặc brushless + ESC nếu dùng xe RC thật |
| Lái | Servo SG90 / MG90S (hoặc MG996R cho xe lớn) | Hoặc lái vi sai (differential) với 2 motor |
| Driver động cơ | **TB6612FNG** (khuyên dùng, hiệu suất cao) hoặc DRV8833; L298N (rẻ nhưng sụt áp ~2V, nóng) | Xe RC thật: dùng ESC có sẵn (điều khiển bằng PWM 50Hz như servo) |
| Nguồn | Pin Li-ion 18650 x2 (2S, 7.4V) hoặc LiPo 2S | Kèm mạch bảo vệ BMS |
| Hạ áp | Buck converter **MP1584 / LM2596** → 5V cho ESP32 và servo | Servo nên có nguồn 5V riêng, không lấy từ chân 3.3V |
| Đo pin | Cầu phân áp (vd 100k/33k) vào chân ADC | Để gửi telemetry % pin về app |
| Phụ kiện | Công tắc nguồn, tụ 470–1000µF chống sụt áp, LED, dây, header, (tùy chọn) đèn pha, còi | Nối chung GND giữa tất cả module |
| Dụng cụ | Mỏ hàn, đồng hồ VOM, cáp USB data | |

### 1.2. Phần mềm / công cụ
- Firmware ESP32 (C++), IDE để nạp code.
- Web app (PWA) bằng HTML/CSS/TypeScript.
- Hosting miễn phí có HTTPS.
- Công cụ debug BLE và debug trên điện thoại.
- Git/GitHub để quản lý mã nguồn và tự động deploy.

---

## 2. Chi tiết công nghệ sử dụng

### 2.1. Firmware ESP32
| Hạng mục | Công nghệ | Lý do chọn |
|---|---|---|
| Framework | **Arduino core for ESP32** (v3.x) | Dễ học, nhiều thư viện. (Nâng cao: ESP-IDF) |
| IDE / Build | **PlatformIO** (trên VS Code) — hoặc Arduino IDE 2.x | PlatformIO quản lý thư viện, phiên bản tốt hơn |
| BLE stack | **NimBLE-Arduino** (h2zero) | Nhẹ hơn Bluedroid mặc định (tiết kiệm ~50% RAM/flash), ổn định |
| Điều khiển motor | **LEDC PWM** (`ledcAttach`, `ledcWrite`) | PWM phần cứng, tần số ~20kHz cho motor (không kêu rè) |
| Servo / ESC | **ESP32Servo** hoặc LEDC 50Hz | |
| Đo pin | `analogReadMilliVolts()` (ADC đã hiệu chỉnh) | |
| Lưu cấu hình | **Preferences** (NVS) | Lưu trim servo, giới hạn tốc độ, tên thiết bị |
| Đa nhiệm (tùy chọn) | FreeRTOS tasks | Tách task BLE và task điều khiển motor |
| Wi-Fi dự phòng (tùy chọn) | **ESPAsyncWebServer + AsyncWebSocket** (hoặc `WebSocketsServer`) | Phương án B cho iOS |
| Cập nhật firmware (tùy chọn) | ArduinoOTA / OTA qua BLE | |

### 2.2. Giao thức BLE (GATT) — thiết kế giữa app và ESP32
- **Service UUID tùy chỉnh** (tạo bằng uuidgenerator), ví dụ `RC_SERVICE`.
- Các characteristic:

| Characteristic | Thuộc tính | Nội dung |
|---|---|---|
| `CONTROL` | **Write Without Response** | Lệnh điều khiển, gửi liên tục 20–50 lần/giây |
| `TELEMETRY` | **Notify** | ESP32 gửi về: điện áp pin, trạng thái, RSSI… (1–5 lần/giây) |
| `CONFIG` | Read / Write | Trim servo, đảo chiều motor, giới hạn tốc độ, tên xe |
| (tùy chọn) `INFO` | Read | Phiên bản firmware |

- **Định dạng gói tin nhị phân** (gọn, nhanh, dưới 20 byte để vừa MTU mặc định):
  ```
  CONTROL (4 byte):
  [0] seq       uint8   — số thứ tự gói (phát hiện mất gói)
  [1] throttle  int8    — -100..100 (lùi..tiến)
  [2] steering  int8    — -100..100 (trái..phải)
  [3] flags     uint8   — bit0: đèn, bit1: còi, bit2: phanh, bit3: chế độ turbo...

  TELEMETRY (4 byte):
  [0..1] battery_mV  uint16 (little-endian)
  [2]    status      uint8
  [3]    reserved
  ```
- **Failsafe (bắt buộc):** nếu ESP32 không nhận gói `CONTROL` trong **300–500 ms** → dừng motor, servo về giữa. Khi mất kết nối BLE → dừng ngay và quảng bá (advertise) lại.
- Connection interval: yêu cầu 7.5–15 ms để giảm độ trễ.

### 2.3. PWA (Frontend)
| Hạng mục | Công nghệ | Lý do chọn |
|---|---|---|
| Ngôn ngữ | **TypeScript** | Bắt lỗi sớm, có kiểu cho Web Bluetooth (`@types/web-bluetooth`) |
| Build tool | **Vite** | Nhanh, cấu hình đơn giản, dev server có HTTPS |
| UI framework | **Preact** hoặc **Svelte** (nhẹ) — hoặc Vanilla TS; React nếu đã quen | App nhỏ, cần nhẹ và mượt |
| PWA | **vite-plugin-pwa** (dùng **Workbox** bên dưới) | Tự sinh Service Worker + Web App Manifest, chạy offline |
| Kết nối Bluetooth | **Web Bluetooth API** (`navigator.bluetooth`) | Chuẩn web, không cần cài app |
| Kết nối Wi-Fi dự phòng | **WebSocket API** | Phương án B cho iOS |
| Joystick cảm ứng | **nipplejs** hoặc tự viết bằng **Pointer Events** + Canvas/SVG | Hỗ trợ đa điểm chạm (ga tay trái, lái tay phải) |
| Tay cầm (tùy chọn) | **Gamepad API** | Điều khiển bằng tay cầm Bluetooth/USB |
| Nghiêng máy để lái (tùy chọn) | **DeviceOrientation API** | Lái bằng cảm biến nghiêng |
| Trải nghiệm | **Fullscreen API**, **Screen Orientation API** (khóa ngang), **Screen Wake Lock API** (không tắt màn hình), **Vibration API** (rung phản hồi) | |
| CSS | CSS thuần / **Tailwind CSS** | Giao diện landscape, nút lớn, `touch-action: none` |
| Lưu cài đặt | **localStorage** / IndexedDB | Lưu thiết bị đã kết nối, độ nhạy, chế độ điều khiển |
| Kết nối lại nhanh | `navigator.bluetooth.getDevices()` + `watchAdvertisements()` (Chrome) | Tự kết nối lại thiết bị đã cấp quyền |
| Icon / splash | **pwa-asset-generator** hoặc `@vite-pwa/assets-generator` | Sinh icon đủ kích thước (192, 512, maskable, apple-touch-icon) |
| Kiểm tra chất lượng | ESLint + Prettier, **Vitest** (unit test phần mã hóa gói tin) | |

### 2.4. Hosting & phát hành (miễn phí)
| Hạng mục | Công nghệ |
|---|---|
| Mã nguồn | **Git + GitHub** |
| Hosting HTTPS miễn phí | **GitHub Pages** / **Cloudflare Pages** / **Netlify** / **Vercel** (chọn 1) |
| CI/CD | **GitHub Actions**: push lên `main` → build → deploy tự động |
| Tên miền | Dùng tên miền miễn phí của nhà host (vd `username.github.io/rc-car`) |
| Android APK (tùy chọn) | **PWABuilder** / **Bubblewrap** (Trusted Web Activity) — sideload miễn phí |

### 2.5. Công cụ debug & test
| Công cụ | Dùng để |
|---|---|
| **nRF Connect** (Android/iOS, miễn phí) | Test BLE của ESP32 trước khi có app: xem service, ghi characteristic, nhận notify |
| **chrome://bluetooth-internals** | Xem log Bluetooth trên Chrome |
| **Chrome Remote Debugging** (`chrome://inspect` + cáp USB) | Debug PWA đang chạy trên điện thoại Android |
| **Lighthouse** (Chrome DevTools) | Kiểm tra điểm PWA, hiệu năng |
| **Serial Monitor** (PlatformIO/Arduino) | Log firmware |
| **ngrok / Cloudflare Tunnel** hoặc `vite --host` + `@vitejs/plugin-basic-ssl` | Mở dev server HTTPS để test trên điện thoại thật |

---

## 3. Kiến trúc tổng thể

```
┌──────────────────────── Điện thoại ────────────────────────┐
│  PWA (Vite + TS + Preact/Svelte)                           │
│   ├─ UI: Joystick / nút / màn hình cài đặt / pin           │
│   ├─ Control loop: đọc input → đóng gói → gửi 30 Hz        │
│   ├─ Transport (interface chung)                           │
│   │    ├─ BleTransport  (Web Bluetooth)  ← Android, Bluefy │
│   │    └─ WsTransport   (WebSocket)      ← iOS Safari      │
│   └─ Service Worker (offline) + Manifest (cài như app)     │
└──────────────┬───────────────────────────┬─────────────────┘
               │ BLE GATT                  │ Wi-Fi AP + WebSocket
┌──────────────▼───────────────────────────▼─────────────────┐
│  ESP32 Firmware (Arduino + NimBLE)                         │
│   ├─ BLE server: CONTROL / TELEMETRY / CONFIG              │
│   ├─ (Tùy chọn) WebSocket server                           │
│   ├─ Bộ giải mã lệnh → Motor (LEDC PWM) + Servo            │
│   ├─ Failsafe watchdog (500 ms)                            │
│   └─ Đọc pin (ADC) → telemetry                             │
└──────────────┬─────────────────────────────────────────────┘
               ▼
     TB6612FNG → Motor DC      Servo lái      Pin 2S + Buck 5V
```

### Cấu trúc thư mục đề xuất
```
rc-car/
├─ firmware/                 # PlatformIO project
│  ├─ platformio.ini
│  ├─ include/config.h       # chân GPIO, UUID, hằng số
│  └─ src/
│     ├─ main.cpp
│     ├─ ble_server.cpp/.h
│     ├─ ws_server.cpp/.h    # (tùy chọn) Wi-Fi fallback
│     ├─ motor.cpp/.h
│     ├─ steering.cpp/.h
│     ├─ battery.cpp/.h
│     └─ failsafe.cpp/.h
├─ web/                      # PWA
│  ├─ index.html
│  ├─ vite.config.ts
│  ├─ public/icons/
│  └─ src/
│     ├─ main.ts
│     ├─ transport/ (Transport.ts, BleTransport.ts, WsTransport.ts)
│     ├─ protocol/  (packet.ts — encode/decode, dùng chung UUID)
│     ├─ input/     (joystick.ts, gamepad.ts, tilt.ts)
│     ├─ ui/        (components, styles)
│     └─ store/     (settings.ts)
├─ docs/
│  ├─ protocol.md            # đặc tả gói tin BLE
│  └─ wiring.md              # sơ đồ nối dây
└─ .github/workflows/deploy.yml
```

---

## 4. Các bước thực hiện

### Giai đoạn 0 — Chuẩn bị & chốt thiết kế (1–2 ngày)
1. Chốt loại xe: **servo lái + 1 motor kéo** (kiểu ô tô) hay **2 motor lái vi sai** (kiểu xe tăng).
2. Chọn chip ESP32 (có BLE), driver motor, pin, buck converter. Mua linh kiện.
3. Cài **VS Code + PlatformIO**, **Node.js LTS**, **Git**; tạo repo GitHub.
4. Cài **nRF Connect** trên điện thoại.
5. Viết `docs/protocol.md`: UUID, cấu trúc gói tin, tần số gửi, quy tắc failsafe.

### Giai đoạn 1 — Phần cứng & test cơ bản (2–4 ngày)
1. Vẽ sơ đồ nối dây (`docs/wiring.md`): ESP32 ↔ TB6612FNG ↔ motor, servo, buck 5V, cầu phân áp đo pin. **Nối chung GND.**
2. Lắp mạch trên breadboard trước, đo điện áp bằng VOM trước khi cắm ESP32.
3. Nạp firmware test: chạy motor tiến/lùi bằng PWM, quét servo trái/phải, in điện áp pin ra Serial.
4. Xác định giá trị servo giữa/trái/phải, chiều quay motor, tốc độ tối thiểu motor bắt đầu quay (deadband).

### Giai đoạn 2 — Firmware BLE (3–5 ngày)
1. Thêm **NimBLE-Arduino**, tạo BLE server với tên dễ nhận (vd `RC-Car-XXXX` theo MAC).
2. Tạo service + 3 characteristic `CONTROL`, `TELEMETRY`, `CONFIG`.
3. Callback ghi `CONTROL` → giải mã gói → cập nhật motor/servo (áp dụng deadband, giới hạn tốc độ, đường cong ga).
4. Gửi `TELEMETRY` (notify) mỗi 500 ms.
5. Cài **failsafe watchdog**: quá 500 ms không có lệnh → dừng. Mất kết nối → dừng + advertise lại.
6. Lưu `CONFIG` vào NVS (Preferences).
7. **Test bằng nRF Connect**: ghi thủ công gói hex (vd `01 32 00 00` = tiến 50%), kiểm tra xe phản hồi, kiểm tra notify pin, kiểm tra failsafe khi ngắt kết nối.

### Giai đoạn 3 — Khởi tạo PWA (1–2 ngày)
1. `npm create vite@latest web -- --template preact-ts` (hoặc svelte-ts / vanilla-ts).
2. Cài `vite-plugin-pwa`, `@types/web-bluetooth`, (tùy chọn) `nipplejs`, Tailwind.
3. Cấu hình manifest: `name`, `short_name`, `display: "fullscreen"` hoặc `"standalone"`, `orientation: "landscape"`, `theme_color`, icon 192/512/maskable.
4. Sinh icon bằng `@vite-pwa/assets-generator`.
5. Bật HTTPS cho dev server (`@vitejs/plugin-basic-ssl` + `vite --host`) để mở được trên điện thoại cùng mạng LAN.
6. Kiểm tra cài đặt "Add to Home Screen" trên Android.

### Giai đoạn 4 — Lớp giao tiếp BLE trong PWA (2–3 ngày)
1. Viết `protocol/packet.ts`: hàm `encodeControl()`, `decodeTelemetry()` dùng `DataView` — **viết unit test bằng Vitest**.
2. Định nghĩa interface `Transport { connect(), disconnect(), send(bytes), onTelemetry(cb), onStatusChange(cb) }`.
3. Viết `BleTransport`:
   - `requestDevice({ filters: [{ services: [RC_SERVICE_UUID] }] })` khi bấm nút "Kết nối".
   - `gatt.connect()` → lấy service → characteristic.
   - Gửi bằng `writeValueWithoutResponse()`; **không gửi chồng** (đợi lệnh trước xong, chỉ gửi gói mới nhất).
   - `startNotifications()` cho telemetry.
   - Lắng nghe `gattserverdisconnected` → tự kết nối lại có giới hạn số lần.
4. Kiểm tra trình duyệt: nếu `!navigator.bluetooth` → hiển thị hướng dẫn (dùng Chrome trên Android / Bluefy hoặc chế độ Wi-Fi trên iOS).

### Giai đoạn 5 — Giao diện điều khiển (3–5 ngày)
1. Màn hình kết nối: nút Kết nối, trạng thái, tên thiết bị, cường độ tín hiệu.
2. Màn hình lái (ngang, toàn màn hình):
   - Joystick trái: ga (trục dọc). Joystick phải: lái (trục ngang). Hỗ trợ **đa chạm**.
   - Nút: đèn, còi, phanh, chuyển tốc độ (chậm/thường/turbo).
   - Hiển thị % pin, trạng thái kết nối, độ trễ.
3. **Control loop** chạy 30 Hz (`setInterval` hoặc `requestAnimationFrame` có throttle): đọc input → encode → `send()`. Thả tay → tự về 0.
4. Dùng `touch-action: none`, chặn zoom/kéo trang, **Wake Lock** giữ màn hình sáng, **Fullscreen + khóa ngang** khi bắt đầu lái, rung nhẹ khi bấm nút.
5. Màn hình cài đặt: trim servo, đảo chiều, giới hạn tốc độ, độ nhạy, chế độ điều khiển (joystick / nghiêng / tay cầm) → ghi vào `CONFIG` + localStorage.
6. (Tùy chọn) Hỗ trợ **Gamepad API** và **DeviceOrientation** (nghiêng để lái).

### Giai đoạn 6 — An toàn & độ ổn định (1–2 ngày)
1. App: khi tab ẩn (`visibilitychange`) hoặc mất focus → gửi lệnh dừng.
2. App: khi mất kết nối → UI báo rõ, joystick bị khóa.
3. Firmware: failsafe 500 ms, giới hạn gia tốc (ramp) tránh giật và sụt áp làm ESP32 reset (brownout).
4. Test các tình huống: tắt Bluetooth đột ngột, đi ra ngoài tầm, pin yếu, khóa màn hình, nhận cuộc gọi.

### Giai đoạn 7 — Hỗ trợ iOS (2–4 ngày)
1. **Phương án A (nhanh):** test PWA trong trình duyệt **Bluefy** trên iPhone; viết hướng dẫn cho người dùng.
2. **Phương án B (khuyến nghị thêm):**
   - Firmware: bật Wi-Fi AP (`RC-Car-XXXX`, có mật khẩu) + WebSocket server (cổng 81) dùng **cùng định dạng gói tin**.
   - PWA: viết `WsTransport` theo cùng interface `Transport`; thêm lựa chọn "Kết nối qua Wi-Fi".
   - ⚠️ Lưu ý **Mixed content**: PWA chạy HTTPS không mở được `ws://` (không mã hóa) tới ESP32. Cách giải quyết: **ESP32 tự phục vụ luôn bản PWA (HTTP) từ LittleFS** cho chế độ Wi-Fi (truy cập `http://192.168.4.1`), hoặc dùng `wss://` với chứng chỉ tự ký (phức tạp hơn). Khuyến nghị cách đầu.
   - Có thể cho ESP32 chạy cả BLE + Wi-Fi nhưng nên chọn 1 chế độ khi khởi động (nút gạt / cấu hình) để tiết kiệm tài nguyên và tránh nhiễu radio.

### Giai đoạn 8 — Offline, deploy & phát hành (1 ngày)
1. Kiểm tra Service Worker: tắt mạng vẫn mở được app (cần thiết khi chơi ngoài trời).
2. Chạy **Lighthouse** → đạt yêu cầu "Installable".
3. Viết **GitHub Actions** workflow: build `web/` → deploy lên GitHub Pages (nhớ cấu hình `base` trong `vite.config.ts` nếu dùng đường dẫn con).
4. Tạo trang hướng dẫn/README: link app, cách cài lên màn hình chính (Android/iOS), cách nạp firmware, sơ đồ đấu dây.
5. (Tùy chọn) Tạo APK Android bằng **PWABuilder** để chia sẻ file cài đặt trực tiếp.

### Giai đoạn 9 — Kiểm thử thực tế & hoàn thiện (liên tục)
1. Test trên nhiều máy Android (các hãng, Android 10 → mới nhất) và iPhone (Bluefy / Wi-Fi).
2. Đo độ trễ (gửi seq → telemetry phản hồi), tầm xa, thời lượng pin.
3. Tinh chỉnh: tần số gửi, đường cong ga (expo), deadzone joystick.
4. (Tùy chọn mở rộng) Cập nhật firmware OTA, nhiều xe cùng lúc, camera ESP32-CAM (qua Wi-Fi), ghi/phát lại hành trình.

---

## 5. Checklist tổng hợp

- [ ] Chip ESP32 có BLE (không phải S2)
- [ ] Phần cứng chạy được motor + servo + đo pin
- [ ] Firmware BLE (NimBLE) + failsafe, test OK bằng nRF Connect
- [ ] Đặc tả giao thức `docs/protocol.md`
- [ ] PWA: Vite + TS + vite-plugin-pwa, cài được lên màn hình chính
- [ ] BleTransport kết nối / gửi / nhận telemetry / tự kết nối lại
- [ ] UI lái: 2 joystick đa chạm, fullscreen, khóa ngang, wake lock
- [ ] Cài đặt (trim, đảo chiều, giới hạn tốc độ) đồng bộ với ESP32
- [ ] Giải pháp iOS: Bluefy và/hoặc chế độ Wi-Fi + WebSocket
- [ ] Offline hoạt động, Lighthouse "Installable"
- [ ] Deploy tự động lên GitHub Pages bằng GitHub Actions
- [ ] README hướng dẫn người dùng

## 6. Tổng chi phí phần mềm
| Hạng mục | Chi phí |
|---|---|
| PlatformIO, Arduino core, NimBLE, Vite, thư viện npm | 0đ (mã nguồn mở) |
| GitHub + GitHub Pages / Cloudflare Pages | 0đ |
| nRF Connect, Bluefy | 0đ |
| Phát hành PWA qua link | 0đ |
| *(Không dùng)* App Store / Google Play | 99 USD/năm / 25 USD một lần |

---

## 7. Cập nhật: Phương án React Native

### 7.1. So sánh nhanh với PWA
| Tiêu chí | PWA | React Native |
|---|---|---|
| Bluetooth trên Android | ✅ Web Bluetooth | ✅ Native BLE |
| Bluetooth trên iOS | ❌ (chỉ qua Bluefy / Wi-Fi) | ✅ **Native BLE, hoạt động đầy đủ** |
| Độ trễ, độ ổn định BLE | Khá | Tốt hơn (kiểm soát MTU, connection priority, chạy nền) |
| Phát hành Android miễn phí | ✅ Link web | ✅ File APK cài trực tiếp (sideload) |
| Phát hành iOS miễn phí | ✅ Link web (nhưng không có BLE) | ⚠️ **Gần như không thể** — xem 7.2 |
| Cập nhật app | Tức thì khi deploy | Phải build lại (hoặc OTA JS bằng EAS Update) |
| Cần máy Mac | Không | Chỉ khi build iOS tại máy (EAS Build trên cloud thì không cần) |

→ React Native **giải quyết được vấn đề Bluetooth trên iOS**, nhưng **đổi lại vấn đề phát hành miễn phí trên iOS**.

### 7.2. ⚠️ Mâu thuẫn: "miễn phí" và iOS
App native trên iPhone bắt buộc phải được Apple ký. Các cách phân phối:

| Cách | Chi phí | Giới hạn |
|---|---|---|
| App Store | 99 USD/năm | Phải qua duyệt của Apple |
| TestFlight (beta, tối đa 10.000 người) | 99 USD/năm | App hết hạn sau 90 ngày mỗi bản build |
| Ad-hoc (cài theo UDID máy) | 99 USD/năm | Tối đa 100 thiết bị/năm |
| **Apple ID miễn phí + Xcode (cần Mac)** | 0đ | App **hết hạn sau 7 ngày**, tối đa 3 app; chỉ cài được lên máy của chính mình qua cáp |
| AltStore / SideStore (dùng Apple ID miễn phí) | 0đ | Vẫn giới hạn 7 ngày, phải tự làm mới định kỳ |
| (Chỉ EU) Cửa hàng thay thế theo DMA | Vẫn cần tài khoản Apple Developer | |

**Kết luận:** Với React Native, iOS chỉ miễn phí cho **mục đích cá nhân/thử nghiệm** (tự cài lên máy mình, làm mới 7 ngày/lần). Muốn người khác cài được trên iPhone → cần 99 USD/năm.

Android: **miễn phí hoàn toàn** bằng cách phát hành file APK (GitHub Releases), hoặc 25 USD một lần nếu lên Google Play.

**Hướng kết hợp có thể cân nhắc:** React Native cho app chính + giữ firmware hỗ trợ chế độ Wi-Fi + trang web điều khiển do ESP32 tự phục vụ, làm phương án miễn phí cho người dùng iPhone không cài được app.

### 7.3. Công nghệ cho React Native
| Hạng mục | Công nghệ | Ghi chú |
|---|---|---|
| Framework | **Expo** (SDK mới nhất) + TypeScript | Không dùng được **Expo Go** vì BLE là module native → dùng **Development Build** (`expo-dev-client`) |
| BLE | **react-native-ble-plx** (+ config plugin `@config-plugins/react-native-ble-plx`) | Thư viện BLE phổ biến nhất; thay thế: `react-native-ble-manager` |
| Mã hóa gói tin | `buffer` / `base64-js` | ble-plx truyền dữ liệu dạng base64 |
| Joystick / cử chỉ | **react-native-gesture-handler** + **react-native-reanimated** | Đa chạm mượt, chạy trên UI thread |
| Đồ họa (tùy chọn) | `react-native-svg` hoặc `@shopify/react-native-skia` | Vẽ joystick, đồng hồ tốc độ |
| Khóa màn hình ngang | `expo-screen-orientation` | |
| Giữ màn hình sáng | `expo-keep-awake` | |
| Rung phản hồi | `expo-haptics` | |
| Nghiêng để lái (tùy chọn) | `expo-sensors` (Accelerometer/DeviceMotion) | |
| Tay cầm (tùy chọn) | Thư viện bắt sự kiện gamepad native (cần đánh giá thêm) | Hỗ trợ kém hơn Gamepad API trên web |
| State | **Zustand** | Nhẹ, đơn giản |
| Lưu cài đặt | `react-native-mmkv` hoặc `@react-native-async-storage/async-storage` | |
| Điều hướng | **Expo Router** | |
| Build | **EAS Build** (gói miễn phí có giới hạn số build/tháng) hoặc build local (`npx expo run:android` / `run:ios`) | Build iOS local cần Mac + Xcode |
| Cập nhật nhanh (tùy chọn) | **EAS Update** | Cập nhật phần JS không cần build lại |
| Test | Jest + `@testing-library/react-native` | Unit test phần encode/decode gói tin |

**Quyền (permissions) cần khai báo:**
- Android 12+: `BLUETOOTH_SCAN`, `BLUETOOTH_CONNECT` (có thể đặt `neverForLocation`); Android ≤ 11: `ACCESS_FINE_LOCATION`.
- iOS: `NSBluetoothAlwaysUsageDescription` trong `Info.plist` (qua `app.json`).

### 7.4. Các giai đoạn thay đổi so với kế hoạch PWA
- **Giai đoạn 0–2, 6, 9:** giữ nguyên (phần cứng, firmware, an toàn, kiểm thử).
- **Giai đoạn 3 (thay thế):** `npx create-expo-app` (TypeScript) → thêm `expo-dev-client`, `react-native-ble-plx` + config plugin → khai báo quyền → build development build cho Android (cài APK vào máy thật). **BLE không chạy trên emulator/simulator, phải test bằng máy thật.**
- **Giai đoạn 4 (thay thế):** `BleTransport` dùng `BleManager`: xin quyền → `startDeviceScan` lọc theo Service UUID → `connectToDevice` → `requestMTU` (Android) → `discoverAllServicesAndCharacteristics` → `writeCharacteristicWithoutResponseForService` / `monitorCharacteristicForService`; xử lý `onDisconnected` để kết nối lại; theo dõi trạng thái Bluetooth bật/tắt (`onStateChange`).
- **Giai đoạn 5:** giao diện lái bằng gesture-handler + reanimated; vòng lặp gửi 30 Hz đặt ngoài React render (dùng ref/Zustand, tránh re-render).
- **Giai đoạn 7 (iOS):** không cần Bluefy. Build iOS bằng EAS Build hoặc Xcode; cài bằng Apple ID miễn phí (7 ngày) hoặc tài khoản trả phí.
- **Giai đoạn 8 (thay thế):** Android: build APK bản release (`eas build -p android --profile preview`) → đăng lên **GitHub Releases**; iOS: tùy lựa chọn phân phối ở 7.2. Thêm `AppState` listener: app chuyển nền → gửi lệnh dừng.

### 7.5. Cấu trúc thư mục (React Native)
```
rc-car/
├─ firmware/                 # giữ nguyên
├─ app/                      # Expo project
│  ├─ app.json               # quyền BLE, orientation, plugins
│  ├─ eas.json
│  └─ src/
│     ├─ app/                # Expo Router screens (connect, drive, settings)
│     ├─ transport/          # Transport.ts, BleTransport.ts, (WsTransport.ts)
│     ├─ protocol/           # packet.ts — encode/decode, UUID
│     ├─ input/              # joystick, tilt
│     ├─ components/
│     └─ store/              # Zustand
└─ docs/
```
