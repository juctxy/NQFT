# NQFT Robot Controller

Ứng dụng điều khiển xe robot dùng Expo, React Native và Bluetooth Low Energy.

## Cài đặt và chạy

Yêu cầu Node.js và npm. Tại thư mục gốc:

```bash
npm ci
npx expo start
```

Expo Go chỉ dùng để xem giao diện. Bluetooth cần development build có native module `react-native-ble-manager`:

```bash
npx expo run:android
# hoặc
npx expo run:ios
```

## Bản web/PWA

Ứng dụng có thể chạy dưới dạng PWA trên HTTPS:

```bash
npm run start:web
npm run build:web
npm run serve:web
```

GitHub Actions build và deploy `dist/` lên GitHub Pages khi có push lên `main` hoặc `layout3_mobile2`. Trong GitHub, đặt **Settings → Pages → Build and deployment → Source** thành **GitHub Actions**. Sau khi deploy, mở URL HTTPS bằng Chrome trên Android hoặc Bluefy trên iPhone; Safari iOS không hỗ trợ Web Bluetooth.

Web Bluetooth chỉ hoạt động trong trình duyệt hỗ trợ, trên HTTPS (localhost được xem là môi trường bảo mật) và sau thao tác bấm kết nối của người dùng. Bản web sử dụng cùng giao thức NQFT đề xuất ở [`docs/drive-protocol.md`](./docs/drive-protocol.md), nhưng giao thức và đầu ra PWM trên xe vẫn cần firmware tương thích.

## Chức năng

- Joystick analog 360° với deadzone và giới hạn đường tròn; Standard dùng trái/phải để quay tại chỗ, Omni/Mecanum có nút giữ để xoay.
- Chọn mức Chậm / Vừa / Nhanh khi đang điều khiển.
- Cài đặt tiếng Việt gồm loại bánh, ma trận dấu, tốc độ riêng cho từng mức, PWM tối thiểu/tối đa, đảo chiều và bù từng bánh, tăng tốc mềm.
- Quản lý nhiều hồ sơ trên điện thoại; hỗ trợ tải, ghi đè, nhân bản, đổi tên, xóa, chuyển nhanh A/B và nhập/xuất tệp JSON.
- Kết nối BLE, gửi lệnh điều khiển ở 25 Hz, áp dụng cấu hình và lưu cấu hình vào bộ nhớ không mất dữ liệu của xe sau khi nhận ACK.
- Màn hình cài đặt có nút dừng, trạng thái kết nối/pin và trạng thái đồng bộ.

## Giao thức BLE và firmware

Ứng dụng hiện định nghĩa một giao thức BLE đề xuất trong [`docs/drive-protocol.md`](./docs/drive-protocol.md). Firmware ESP32 trong repository này chưa được cung cấp; do đó UUID, packet, ACK, watchdog, điều khiển motor, tăng tốc mềm và lưu NVS phải được triển khai hoặc xác nhận tương thích ở firmware trước khi chạy xe thật. Không thể xác minh điều khiển phần cứng chỉ bằng ứng dụng.

Lưu ý: firmware mẫu ở repository GitHub được tham khảo (`quanhuy38/NQFT`) dùng service UUID và packet điều khiển khác, đồng thời `applyOutputs()` chưa điều khiển phần cứng. Firmware đó không tương thích trực tiếp với giao thức NQFT ở repository này; cần đồng bộ firmware trước khi thử PWM thật.

## Kiểm tra

```bash
npm test
npx tsc --noEmit
npx expo lint
```

## Cấu trúc chính

```text
app/                         Expo Router routes
components/                  Màn hình điều khiển và cài đặt
context/                     Trạng thái cài đặt và kết nối BLE dùng chung
hooks/useBluetoothConnection.ts
drive.ts                     Cấu hình, phối trộn motor và mã hóa packet BLE
controller.test.mjs          Kiểm thử logic lái và packet
bluetooth.test.mjs           Kiểm thử trạng thái Bluetooth
```
