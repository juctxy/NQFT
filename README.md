# RC Car BLE

Điều khiển xe RC dùng ESP32 qua Bluetooth bằng điện thoại.

## 📱 Cài app trên điện thoại

> **Không cần máy tính, không cần cài gì thêm** (trừ iPhone cần Bluefy). Mở link hoặc quét mã QR bằng camera điện thoại:

<p align="center">
  <a href="https://quanhuy38.github.io/NQFT/">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=https%3A%2F%2Fquanhuy38.github.io%2FNQFT%2F" alt="QR mở app RC Car" width="220" height="220">
  </a>
</p>

<p align="center">
  <a href="https://quanhuy38.github.io/NQFT/"><img src="https://img.shields.io/badge/M%E1%BB%9E%20APP-quanhuy38.github.io%2FNQFT-4fc3f7?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Mở app"></a>
  <a href="https://github.com/quanhuy38/NQFT/releases/latest"><img src="https://img.shields.io/badge/T%E1%BA%A2I%20APK-Android-3DDC84?style=for-the-badge&logo=android&logoColor=white" alt="Tải APK Android"></a>
  <a href="https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055"><img src="https://img.shields.io/badge/iPhone-c%E1%BA%A7n%20Bluefy-000000?style=for-the-badge&logo=apple&logoColor=white" alt="iPhone dùng Bluefy"></a>
</p>

| Điện thoại | Cách cài |
|---|---|
| **Android — cách 1 (khuyên dùng)** | Mở link app bằng **Chrome** → bấm **Cài đặt** khi Chrome mời cài app (hoặc menu **⋮ → Cài đặt ứng dụng**). App xuất hiện ở màn hình chính, tự cập nhật, chạy được khi không có mạng. |
| **Android — cách 2 (file APK)** | Bấm **Tải APK** ở trên → tải file `.apk` → mở file → cho phép *cài từ nguồn không xác định* → Cài đặt. |
| **iPhone / iPad** | Safari không hỗ trợ Bluetooth cho web. Cài **[Bluefy – Web BLE Browser](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055)** (miễn phí) → mở link app trong Bluefy. |

⚠️ Đừng mở link trong Zalo / Facebook / Messenger — các app này chặn Bluetooth. Bấm **BLUETOOTH** sẽ hiện hộp thoại hỏi **mở bằng Chrome**.

Sau khi mở app: bật Bluetooth → bấm **BLUETOOTH** → chọn `RC-Car-XXXX`. Chi tiết: [`HUONG_DAN_KET_NOI.md`](HUONG_DAN_KET_NOI.md) mục 10–11.

---

## 🔧 Dành cho người làm phần cứng / phát triển

> Phần dưới đây chỉ cần khi bạn **nạp firmware cho ESP32** hoặc **sửa code app**. Người dùng điện thoại không cần.

| Tài liệu | Nội dung |
|---|---|
| [`HUONG_DAN_KET_NOI.md`](HUONG_DAN_KET_NOI.md) | Từng bước: Arduino IDE → nạp firmware → kết nối điện thoại |
| [`docs/HUONG_DAN_APK.md`](docs/HUONG_DAN_APK.md) | Tạo file APK và đăng lên GitHub Releases |
| [`docs/protocol.md`](docs/protocol.md) | Đặc tả giao thức BLE giữa app và ESP32 |
| [`PROJECT_SETUP.md`](PROJECT_SETUP.md) | Các quyết định & quy trình chuẩn bị |
| [`RC_CAR_PWA_PLAN.md`](RC_CAR_PWA_PLAN.md) | Kế hoạch tổng thể |

| Thư mục | Nội dung |
|---|---|
| `firmware/rc_car_ble/` | Sketch Arduino cho ESP32 (NimBLE-Arduino 2.x) |
| `web/` | Mã nguồn app: Vite + React + TypeScript + vite-plugin-pwa |

**Nạp firmware:** xem [`HUONG_DAN_KET_NOI.md`](HUONG_DAN_KET_NOI.md) mục 2–8.

**Sửa code app** (cần Node.js LTS):
```bash
cd web
npm ci         # cài thư viện (chỉ lần đầu)
npm run dev    # chạy thử: https://localhost:5173
npm test
npm run build
```

**Deploy:** push lên nhánh `main` → GitHub Actions tự build và cập nhật app tại https://quanhuy38.github.io/NQFT/ (cả bản đã cài trên điện thoại và APK đều tự nhận bản mới).

### Trình duyệt hỗ trợ
- ✅ Chrome / Edge trên Android, Windows, macOS, Linux
- ✅ iOS: trình duyệt **Bluefy**
- ❌ Safari, Firefox, trình duyệt trong Zalo/Facebook
