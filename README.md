# RC Car BLE

Điều khiển xe RC dùng ESP32 qua Bluetooth Low Energy bằng một PWA (chạy trên Chrome Android/desktop và Bluefy trên iOS).

**App:** <https://quanhuy38.github.io/NQFT/> · **Hướng dẫn từng bước:** [`HUONG_DAN_KET_NOI.md`](HUONG_DAN_KET_NOI.md)

| Thư mục | Nội dung |
|---|---|
| `HUONG_DAN_KET_NOI.md` | Hướng dẫn từ Arduino IDE đến kết nối điện thoại |
| `firmware/rc_car_ble/` | Sketch Arduino cho ESP32 (NimBLE-Arduino 2.x) |
| `web/` | PWA: Vite + React + TypeScript + vite-plugin-pwa |
| `docs/protocol.md` | Đặc tả giao thức BLE dùng chung |
| `PROJECT_SETUP.md` | Quyết định & quy trình chuẩn bị |
| `RC_CAR_PWA_PLAN.md` | Kế hoạch tổng thể |

## Bắt đầu nhanh

**Firmware** — xem `PROJECT_SETUP.md` mục 4.1 & 4.3: cài core esp32 + thư viện NimBLE-Arduino trong Arduino IDE, mở `firmware/rc_car_ble/rc_car_ble.ino`, upload, Serial Monitor 115200.

**Web**
```bash
cd web
npm install
npm run dev    # https://localhost:5173 (và https://<IP-LAN>:5173 cho điện thoại)
npm test
npm run build
```

## Trình duyệt hỗ trợ
- ✅ Chrome / Edge trên Android, Windows, macOS, Linux
- ✅ iOS: trình duyệt **Bluefy** (miễn phí)
- ❌ Safari, Firefox

## Deploy
Push lên nhánh `main` → GitHub Actions build và deploy lên GitHub Pages.
Lần đầu: *Settings → Pages → Source: **GitHub Actions***.
