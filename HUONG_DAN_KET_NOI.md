# Hướng dẫn: Từ Arduino IDE đến kết nối điện thoại với ESP32

Tài liệu này hướng dẫn từng bước: cài Arduino IDE → nạp firmware cho ESP32 → kiểm tra Bluetooth → mở app trên điện thoại → kết nối và gửi lệnh.

> Ở giai đoạn này **chưa cần lắp xe**. Chỉ cần **1 board ESP32 + 1 cáp USB + 1 điện thoại**. Lệnh từ app sẽ được in ra Serial Monitor để kiểm tra.

---

## Mục lục
1. [Chuẩn bị](#1-chuẩn-bị)
2. [Cài Arduino IDE](#2-cài-arduino-ide)
3. [Cài gói board ESP32](#3-cài-gói-board-esp32)
4. [Cài thư viện NimBLE-Arduino](#4-cài-thư-viện-nimble-arduino)
5. [Tải mã nguồn dự án](#5-tải-mã-nguồn-dự-án)
6. [Cắm ESP32 và cài driver](#6-cắm-esp32-và-cài-driver)
7. [Chọn board, cổng và nạp firmware](#7-chọn-board-cổng-và-nạp-firmware)
8. [Kiểm tra bằng Serial Monitor](#8-kiểm-tra-bằng-serial-monitor)
9. [Kiểm tra Bluetooth bằng nRF Connect (khuyến nghị)](#9-kiểm-tra-bluetooth-bằng-nrf-connect-khuyến-nghị)
10. [Mở app trên điện thoại](#10-mở-app-trên-điện-thoại)
11. [Kết nối điện thoại với ESP32](#11-kết-nối-điện-thoại-với-esp32)
12. [Kiểm tra failsafe và kết nối lại](#12-kiểm-tra-failsafe-và-kết-nối-lại)
13. [Xử lý sự cố](#13-xử-lý-sự-cố)
14. [(Dành cho người phát triển) Chạy app trên máy tính](#14-dành-cho-người-phát-triển-chạy-app-trên-máy-tính)

---

## 1. Chuẩn bị

| Thứ cần có | Ghi chú |
|---|---|
| Board ESP32 **có Bluetooth LE** | ESP32 DevKit (WROOM-32), ESP32-C3, ESP32-S3, ESP32-C6… ⚠️ **ESP32-S2 không có Bluetooth — không dùng được** |
| Cáp USB **có truyền dữ liệu** | Nhiều cáp chỉ sạc, không truyền dữ liệu → máy tính sẽ không nhận board |
| Máy tính Windows / macOS / Linux | Có Internet để tải phần mềm |
| Điện thoại **Android** | Android 6 trở lên, có **Google Chrome** bản mới |
| hoặc **iPhone / iPad** | Cài trình duyệt **Bluefy** (xem mục 10.2) |

---

## 2. Cài Arduino IDE

1. Vào <https://www.arduino.cc/en/software>.
2. Tải **Arduino IDE 2.x** cho hệ điều hành của bạn (Windows: chọn bản *Win 10 and newer, 64 bits*).
3. Chạy file cài đặt, bấm **Next / I Agree / Install** với tùy chọn mặc định.
4. Nếu Windows hỏi cài driver (USB driver của Arduino) → chọn **Install**.
5. Mở Arduino IDE. Lần đầu mở IDE sẽ tự tải một số thành phần, chờ đến khi thanh trạng thái ở dưới cùng không còn chạy.

---

## 3. Cài gói board ESP32

Arduino IDE mặc định chưa biết ESP32, cần cài thêm.

1. Vào **File → Preferences** (macOS: **Arduino IDE → Settings**).
2. Tìm ô **Additional boards manager URLs**, dán vào:
   ```
   https://espressif.github.io/arduino-esp32/package_esp32_index.json
   ```
   (Nếu ô đã có link khác, bấm biểu tượng bên phải ô và thêm link này ở một dòng mới.)
3. Bấm **OK**.
4. Mở **Tools → Board → Boards Manager…** (hoặc biểu tượng bảng mạch ở thanh bên trái).
5. Gõ `esp32` vào ô tìm kiếm.
6. Tìm mục **esp32 by Espressif Systems** → chọn phiên bản **3.x** mới nhất → bấm **Install**.
   - Gói khá nặng (vài trăm MB), chờ vài phút.
   - ⚠️ Không nhầm với "Arduino ESP32 Boards" của Arduino.
7. Cài xong sẽ hiện chữ **INSTALLED**.

---

## 4. Cài thư viện NimBLE-Arduino

1. Mở **Tools → Manage Libraries…** (hoặc biểu tượng sách ở thanh bên trái).
2. Gõ `NimBLE-Arduino`.
3. Chọn thư viện **NimBLE-Arduino by h2zero** → phiên bản **2.x** mới nhất → **Install**.
4. Nếu IDE hỏi cài thêm thư viện phụ thuộc → chọn **Install All**.

> Firmware dùng API của NimBLE **2.x**. Bản 1.x sẽ báo lỗi biên dịch.

---

## 5. Tải mã nguồn dự án

**Cách 1 — Tải file ZIP (dễ nhất):**
1. Vào <https://github.com/quanhuy38/NQFT>.
2. Bấm nút xanh **Code → Download ZIP**.
3. Giải nén ra một thư mục, ví dụ `C:\Projects\NQFT`.

**Cách 2 — Dùng Git:**
```bash
git clone https://github.com/quanhuy38/NQFT.git
```

Firmware nằm ở `firmware/rc_car_ble/`, gồm 2 file:
- `rc_car_ble.ino` — chương trình chính
- `config.h` — cấu hình (UUID, thời gian failsafe, chân đo pin…)

> Arduino yêu cầu file `.ino` nằm trong thư mục **cùng tên** (`rc_car_ble/rc_car_ble.ino`). Không đổi tên thư mục.

---

## 6. Cắm ESP32 và cài driver

1. Cắm ESP32 vào máy tính bằng cáp USB.
2. Kiểm tra máy đã nhận board:
   - **Windows:** chuột phải nút Start → **Device Manager** → mục **Ports (COM & LPT)** → phải thấy một dòng như `Silicon Labs CP210x … (COM5)` hoặc `USB-SERIAL CH340 (COM3)` hoặc `USB Serial Device (COM7)`.
   - **macOS:** cổng sẽ có dạng `/dev/cu.usbserial-…` hoặc `/dev/cu.wchusbserial…`.
3. Nếu **không thấy cổng** hoặc thấy thiết bị có dấu chấm than vàng → cần cài driver. Nhìn con chip USB nhỏ trên board (gần cổng USB):

| Chip trên board | Driver |
|---|---|
| **CP2102 / CP2104** (Silicon Labs) | <https://www.silabs.com/developers/usb-to-uart-bridge-vcp-drivers> |
| **CH340 / CH9102** (WCH) | <https://www.wch-ic.com/downloads/CH341SER_EXE.html> |
| Không có chip riêng (ESP32-C3/S3 cắm USB trực tiếp) | Thường không cần driver |

4. Cài driver xong → rút cáp ra, cắm lại → kiểm tra lại Device Manager.
5. **Ghi nhớ số cổng COM** (vd `COM5`).

---

## 7. Chọn board, cổng và nạp firmware

1. Trong Arduino IDE: **File → Open…** → chọn `firmware/rc_car_ble/rc_car_ble.ino`.
   IDE sẽ mở 2 tab: `rc_car_ble.ino` và `config.h`.
2. **Chọn board:** **Tools → Board → esp32 →** chọn đúng loại:

| Board bạn có | Chọn |
|---|---|
| ESP32 DevKit V1 / WROOM-32 / NodeMCU-32S | **ESP32 Dev Module** |
| ESP32-C3 (SuperMini, DevKitM…) | **ESP32C3 Dev Module** |
| ESP32-S3 DevKitC | **ESP32S3 Dev Module** |
| ESP32-C6 | **ESP32C6 Dev Module** |

3. **Chọn cổng:** **Tools → Port →** chọn cổng COM ở bước 6.
4. **Riêng ESP32-C3 / S3 / C6 cắm USB trực tiếp:** **Tools → USB CDC On Boot → Enabled** (nếu không bật, Serial Monitor sẽ không hiện gì).
5. Các tùy chọn khác trong **Tools** để mặc định.
6. Bấm nút **✓ Verify** (biên dịch thử). Lần đầu mất 1–3 phút. Thấy `Done compiling` là được.
7. Bấm nút **→ Upload**.
   - Thanh dưới sẽ hiện `Connecting........`.
   - Nếu đứng ở `Connecting...` quá lâu: **giữ nút BOOT** trên board cho đến khi thấy `Writing at 0x…` thì thả ra.
8. Thấy `Hard resetting via RTS pin...` là **nạp thành công**.

---

## 8. Kiểm tra bằng Serial Monitor

1. Mở **Tools → Serial Monitor** (hoặc biểu tượng kính lúp góc trên phải).
2. Ở góc phải của Serial Monitor, chọn tốc độ **115200 baud**.
3. Bấm nút **EN / RST** trên board để khởi động lại.
4. Bạn phải thấy:
   ```
   === RC Car BLE ===
   [SAFE] Stop: boot
   [BLE] Advertising as RC-Car-1A2B (protocol v1)
   ```
5. **Ghi nhớ tên thiết bị** (vd `RC-Car-1A2B`) — bạn sẽ chọn tên này trên điện thoại.

> ⚠️ **Quan trọng:** **đóng Serial Monitor** trước mỗi lần bấm Upload, nếu không sẽ báo lỗi cổng đang bận. (Arduino IDE 2.x thường tự xử lý, nhưng nếu lỗi thì đóng lại.)

ESP32 lúc này đang **phát Bluetooth và chờ kết nối**. Bạn có thể rút cáp khỏi máy tính và cấp nguồn bằng sạc dự phòng nếu muốn — nhưng nên giữ cắm máy tính để xem log.

---

## 9. Kiểm tra Bluetooth bằng nRF Connect (khuyến nghị)

Bước này giúp xác nhận **ESP32 hoạt động đúng trước khi dùng app**. Nếu sau này app không kết nối được, bạn sẽ biết lỗi nằm ở app hay ở ESP32.

1. Cài **nRF Connect for Mobile** (Nordic Semiconductor) từ Google Play / App Store.
2. Mở app → tab **Scanner** → bấm **SCAN**.
3. Tìm `RC-Car-XXXX` → bấm **CONNECT**.
4. Serial Monitor hiện: `[BLE] Connected: xx:xx:xx:xx:xx:xx`.
5. Trong nRF Connect, mở service `6e3a0001-8f5c-…` (có thể hiện là *Unknown Service*). Bên trong có 2 characteristic:
   - `6e3a0002-…` (**CONTROL**, có nút mũi tên lên = ghi)
   - `6e3a0003-…` (**TELEMETRY**, có nút mũi tên xuống nhiều lần = notify)
6. **Thử nhận dữ liệu:** bấm nút notify (3 mũi tên xuống) ở `6e3a0003`. Giá trị sẽ cập nhật mỗi 0,5 giây, vd `0x00-00-00-00`.
7. **Thử gửi lệnh:** bấm mũi tên lên ở `6e3a0002` → chọn kiểu **BYTE ARRAY** → nhập `01320000` → **SEND**.
   Serial Monitor sẽ hiện:
   ```
   [SAFE] Commands resumed
   [CMD] seq=  1 thr=  50 steer=   0 flags=0x00
   [SAFE] Stop: command timeout
   ```
   Dòng `command timeout` xuất hiện sau 0,5 giây là **đúng** — vì bạn chỉ gửi 1 lệnh, ESP32 tự dừng để an toàn (failsafe). App thật sẽ gửi liên tục 30 lần/giây.
8. Bấm **DISCONNECT** trong nRF Connect. Serial Monitor hiện `[BLE] Disconnected …, advertising again`.

> ⚠️ ESP32 chỉ cho **1 kết nối cùng lúc**. **Ngắt kết nối nRF Connect trước** khi dùng app RC Car, nếu không app sẽ không thấy thiết bị.

---

## 10. Mở app trên điện thoại

App được host miễn phí tại:

### 👉 <https://quanhuy38.github.io/NQFT/>

*(Link chỉ hoạt động sau khi bật GitHub Pages cho repo — xem [mục 10.3](#103-bật-github-pages-chỉ-làm-1-lần-chủ-repo).)*

### 10.1. Android (Chrome)
1. Bật **Bluetooth** trên điện thoại.
2. Mở **Chrome** → vào link app.
3. **Cài app lên màn hình chính (khuyến nghị):** bấm nút **📲 Cài app** ở đầu trang (hoặc menu **⋮** → **Cài đặt ứng dụng / Thêm vào màn hình chính**) → **Cài đặt**. Từ lần sau mở app từ icon "RC Car" như app bình thường, chạy được cả khi không có mạng.
4. Không dùng Firefox, Opera Mini hay trình duyệt Facebook/Zalo (mở link trong Zalo/Messenger sẽ không có Bluetooth) — trang sẽ hiện nút **Mở bằng Chrome**.
5. **Hoặc cài bằng file APK:** tải tại <https://github.com/quanhuy38/NQFT/releases/latest> — cách tạo và cài APK: [`docs/HUONG_DAN_APK.md`](docs/HUONG_DAN_APK.md).

### 10.2. iPhone / iPad (Bluefy)
Safari và mọi trình duyệt khác trên iOS **không hỗ trợ Web Bluetooth**. Cần dùng Bluefy:
1. Mở App Store → tìm **Bluefy – Web BLE Browser** → cài (miễn phí).
2. Bật **Bluetooth**.
3. Mở **Bluefy** → nhập link app vào thanh địa chỉ.
4. Lần đầu Bluefy hỏi quyền Bluetooth → **Cho phép (Allow)**.
5. Có thể bấm biểu tượng bookmark trong Bluefy để lưu lại cho lần sau.

> Trên iOS, app chạy bên trong Bluefy (không cài lên màn hình chính như Android được) và cần có mạng khi mở.

### 10.3. Bật GitHub Pages (chỉ làm 1 lần, chủ repo)
1. Vào <https://github.com/quanhuy38/NQFT> → **Settings** → **Pages** (menu trái).
2. Mục **Build and deployment → Source**: chọn **GitHub Actions**.
3. Vào tab **Actions** → chọn workflow **Deploy PWA to GitHub Pages** → **Run workflow** (hoặc push một commit mới lên nhánh `main`).
4. Chờ ~1–2 phút đến khi có dấu ✅ xanh → link app hoạt động.

---

## 11. Kết nối điện thoại với ESP32

1. Đảm bảo: ESP32 đang chạy (Serial Monitor thấy `Advertising as RC-Car-XXXX`), **nRF Connect đã ngắt kết nối**, Bluetooth điện thoại đang bật.
2. Mở app → thấy trang **"RC Car — Kiểm tra kết nối"**, trạng thái **Chưa kết nối**.
3. Bấm **Kết nối**.
4. Điện thoại hiện hộp thoại danh sách thiết bị Bluetooth:
   - **Android:** lần đầu Chrome có thể hỏi quyền **"Thiết bị ở gần"** (Android 12+) hoặc **"Vị trí"** (Android 6–11) → chọn **Cho phép**. Trên Android 6–11, **phải bật Vị trí (GPS)** của điện thoại thì mới quét được Bluetooth.
5. Chọn **RC-Car-XXXX** → bấm **Ghép nối / Kết nối (Pair / Connect)**.
   > Không cần mã PIN. Nếu điện thoại hỏi "ghép nối" trong Cài đặt Bluetooth của hệ thống — **không cần** làm ở đó; chỉ chọn trong hộp thoại của app.
6. Trạng thái chuyển **Đang kết nối… → Đã kết nối** (màu xanh), hiện tên thiết bị.
   Serial Monitor hiện `[BLE] Connected: …` rồi `[SAFE] Commands resumed`.
7. **Thử gửi lệnh:** kéo thanh **Ga** sang phải → Serial Monitor hiện:
   ```
   [CMD] seq= 87 thr=  64 steer=   0 flags=0x00
   ```
   Thả tay → thanh tự về 0 → `thr=   0`.
   Kéo thanh **Lái** → `steer` thay đổi tương ứng (âm = trái, dương = phải).
8. **Kiểm tra dữ liệu từ xe:** mục **Telemetry** cập nhật mỗi 0,5 giây:
   - *Pin:* "chưa có cảm biến" (bình thường — chưa lắp mạch đo pin).
   - *Failsafe:* "bình thường".
   - *Gói cuối xe nhận:* số `seq` tăng liên tục.
9. Dòng `seq … · đã gửi … · bỏ qua …` dưới thanh trượt: **đã gửi** tăng ~30/giây là đúng. **Bỏ qua** tăng ít là bình thường (app bỏ gói khi gói trước chưa gửi xong).

🎉 **Đến đây điện thoại đã kết nối và điều khiển được ESP32.**

---

## 12. Kiểm tra failsafe và kết nối lại

| Thử | Kết quả đúng |
|---|---|
| Đang kết nối, **chuyển app xuống nền** (về màn hình chính) | Serial Monitor hiện `[SAFE] Stop: command timeout` trong ≤ 0,5 s. Mở lại app → `Commands resumed` |
| **Bấm nút EN/RST** trên ESP32 (hoặc rút nguồn rồi cắm lại) | App chuyển **Đang kết nối lại…** → tự **Đã kết nối** sau vài giây (thử tối đa 5 lần) |
| Rút nguồn ESP32 **lâu hơn ~8 giây** | App báo "Mất kết nối, không thể kết nối lại" → cắm lại → bấm **Kết nối** |
| Bấm **Ngắt kết nối** trong app | Serial Monitor: `Disconnected`, ESP32 phát lại Bluetooth. App **không** tự kết nối lại |
| Đi xa ra khỏi tầm Bluetooth (~10–30 m) | ESP32 dừng (failsafe), app báo kết nối lại |

---

## 13. Xử lý sự cố

### Arduino IDE / nạp code
| Lỗi | Cách sửa |
|---|---|
| Không thấy cổng COM trong **Tools → Port** | Đổi cáp USB khác (cáp có dữ liệu); cài driver CP210x/CH340 (mục 6); thử cổng USB khác trên máy |
| `Failed to connect to ESP32: Timed out waiting for packet header` | Giữ nút **BOOT** khi thấy `Connecting...`; đóng Serial Monitor; giảm **Tools → Upload Speed** xuống 115200 |
| `Port is busy` / `Access is denied` | Đóng Serial Monitor và các phần mềm khác đang dùng cổng COM (Cura, PuTTY…) |
| `NimBLEDevice.h: No such file or directory` | Chưa cài NimBLE-Arduino (mục 4) |
| Lỗi kiểu `'NimBLEConnInfo' has not been declared` hoặc sai tham số `onConnect/onWrite` | Đang dùng NimBLE **1.x** → nâng lên **2.x** trong Library Manager |
| `esp32 … not found` / không có board ESP32 trong danh sách | Chưa thêm link board hoặc chưa cài gói esp32 (mục 3) |
| Serial Monitor trống (ESP32-C3/S3) | Bật **Tools → USB CDC On Boot → Enabled**, nạp lại |
| Serial Monitor ra ký tự rác | Chọn đúng **115200 baud** |
| Log `Brownout detector was triggered` lặp lại | Nguồn yếu: đổi cáp/cổng USB, dùng cổng USB trực tiếp trên máy (không qua hub) |

### Điện thoại / app
| Lỗi | Cách sửa |
|---|---|
| App báo **"Trình duyệt này không hỗ trợ Web Bluetooth"** | Android: mở bằng **Chrome** (không mở trong Zalo/Facebook/Messenger). iPhone: dùng **Bluefy** |
| Hộp thoại chọn thiết bị **trống / không thấy RC-Car** | Kiểm tra ESP32 có in `Advertising`; **ngắt nRF Connect**; bật Bluetooth; Android 6–11: **bật Vị trí (GPS)**; tắt bật lại Bluetooth điện thoại |
| Bấm **Kết nối** không hiện gì | Kiểm tra quyền: **Cài đặt → Ứng dụng → Chrome → Quyền** → bật **Thiết bị ở gần** (hoặc **Vị trí**) |
| `NetworkError: Connection failed` / kết nối rồi rớt ngay | Bấm EN/RST trên ESP32 rồi thử lại; để điện thoại gần ESP32; tắt bật Bluetooth điện thoại |
| `SecurityError` / `requestDevice … not allowed` | Trang phải mở qua **https://** (link GitHub Pages đã là https) |
| Link GitHub Pages báo **404** | Chưa bật GitHub Pages hoặc workflow chưa chạy xong (mục 10.3) |
| Đã kết nối nhưng Serial Monitor không có `[CMD]` | Kéo thanh trượt (lệnh chỉ in khi giá trị thay đổi); kiểm tra firmware và app cùng **UUID** (`config.h` và `web/src/protocol/constants.ts`) |
| App cũ không cập nhật sau khi deploy bản mới | Đóng hẳn app và mở lại (app tự cập nhật ở lần mở kế tiếp) |

### Công cụ chẩn đoán nâng cao (Android)
- Mở `chrome://bluetooth-internals` trên Chrome điện thoại để xem thiết bị quét được và log Bluetooth.
- Debug app từ máy tính: bật **Gỡ lỗi USB** trên điện thoại → cắm cáp → trên máy tính mở Chrome `chrome://inspect` → chọn trang app → xem Console.

---

## 14. (Dành cho người phát triển) Chạy app trên máy tính

Cần **Node.js LTS** (<https://nodejs.org>).

```bash
cd web
npm ci
npm run dev
```

- Máy tính có Bluetooth: mở **Chrome/Edge** tại `https://localhost:5173` → chấp nhận cảnh báo chứng chỉ (**Advanced → Proceed**) → test kết nối ESP32 ngay trên máy tính.
- Điện thoại **cùng mạng Wi-Fi**: mở `https://<IP-máy-tính>:5173` (IP hiện trong terminal ở dòng `Network:`) → chấp nhận cảnh báo chứng chỉ.
  - Nếu không truy cập được: cho phép Node.js qua **Windows Firewall** (mạng Private).
- `npm test` — chạy unit test; `npm run build` — build bản production vào `web/dist`.

Đặc tả giao thức BLE giữa app và ESP32: [`docs/protocol.md`](docs/protocol.md).
