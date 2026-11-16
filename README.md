# NQFT – Robot Controller App

---

## 1. Yêu cầu môi trường

Trước khi chạy ứng dụng, hãy cài đặt:

- **Node.js** (bao gồm `npm`)
- **Git**
- **Expo Go** trên điện thoại (chỉ dùng để thử giao diện); kết nối BLE cần development build

Kiểm tra nhanh trong Terminal:

```bash
node -v
npm -v
git --version
```

---

## 2. Clone Repository

Mở Terminal tại thư mục muốn lưu dự án và chạy:

```bash
# Clone branch có ứng dụng Expo
git clone -b layout3_mobile --single-branch https://github.com/juctxy/NQFT.git

# Di chuyển vào thư mục dự án
cd NQFT
```

> **Lưu ý:** Ứng dụng Expo nằm ở thư mục gốc của repository. Hãy chạy các lệnh cài đặt, khởi chạy và kiểm tra tại thư mục `NQFT`.

---

## 3. Cài đặt thư viện

Đảm bảo Terminal đang ở thư mục gốc `NQFT`, sau đó chạy:

```bash
npm ci
```

Lệnh này cài các phiên bản thư viện đã khóa trong `package-lock.json`.

---

## 4. Khởi chạy ứng dụng

Chạy Expo ở chế độ Expo Go qua tunnel:

```bash
npx expo start --go 
```

Mở ứng dụng trên điện thoại:

1. Chờ Terminal hiển thị mã QR.
2. Mở **Expo Go** trên điện thoại.
3. Dùng trình quét QR bên trong Expo Go để quét mã.
4. Chờ ứng dụng tải về điện thoại.

<<<<<<< HEAD
=======
> Chế độ `--tunnel` cần kết nối Internet. Nếu điện thoại và máy tính cùng mạng Wi-Fi, có thể thử `npx expo start --go` thay thế.

### Kết nối BLE thật với ESP32

Expo Go không tích hợp module BLE của ứng dụng. Để quét và kết nối robot, hãy cài một [development build](https://docs.expo.dev/develop/development-builds/introduction/) có chứa `react-native-ble-manager`, sau đó khởi chạy Metro bằng:

```bash
npx expo start --dev-client --tunnel
```

Trên macOS có Xcode, tạo và cài development build lên iPhone bằng:

```bash
npx expo run:ios --device
```

Lệnh này tạo thư mục native từ cấu hình Expo nếu cần. Không chỉnh sửa thư mục `ios/` được tạo; thay đổi native nên thực hiện trong `app.json` hoặc config plugin. Sau khi cài app, chạy lệnh `npx expo start --dev-client --tunnel` và mở app development build trên iPhone.

Mở ứng dụng development build trên **điện thoại thật**, bật Bluetooth và cấp quyền khi được hỏi. Cần một iPhone hoặc Android cùng ESP32 đang bật để kiểm tra kết nối; trình mô phỏng không thể xác nhận hoạt động radio BLE. Development build iOS có thể được tạo bằng EAS hoặc trên macOS; Android cần môi trường build Android.

Ứng dụng hiện quét, kết nối và ngắt kết nối BLE. Chưa có lệnh điều khiển robot nào được gửi vì chưa có UUID GATT và giao thức dữ liệu của ESP32.

>>>>>>> f32ebf4 (update)
---

## 5. Các chức năng hiện tại

- **Joystick 8 hướng:** Điều khiển joystick và di chuyển theo các hướng; có thể giữ joystick trong khi chạm một nút chức năng hoặc chọn tốc độ.
- **Điều chỉnh tốc độ:** Chọn nhanh preset Chậm/Vừa/Nhanh ngay trên bộ điều khiển; hai thanh chỉnh Motor 1 và Motor 2 vẫn hoạt động riêng, còn giá trị preset được chỉnh trong Settings.
- **Nút chức năng:** Có các nút `FUNC 1–4`, `CẢN` và `SÚT`.
- **Hướng dẫn và cài đặt:** Có màn hình hướng dẫn và các tùy chọn cài đặt PWM.
- **Bluetooth BLE:** Quét thiết bị gần đó, kết nối/ngắt kết nối ESP32; cần development build và thiết bị thật. Chưa gửi lệnh điều khiển robot.
- **Hiển thị ngang:** Ứng dụng được cấu hình cho chế độ landscape.
- **Nhận diện ứng dụng:** Hiển thị logo và tên “Watt'up Debuggers” trên giao diện điều khiển.

---

<<<<<<< HEAD
## 6. Cấu trúc ứng dụng mobile

```text
NQFT/
    ├── app/                  # Các route Expo Router
    ├── assets/               # Logo, icon và hình ảnh
    ├── components/           # Controller, hướng dẫn và cài đặt
    ├── context/              # Trạng thái controller
    ├── App.tsx               # Kết nối màn hình controller và điều hướng
    ├── app.json              # Cấu hình Expo
    ├── controller.ts         # Logic điều khiển và PWM
    ├── controller.test.mjs   # Kiểm tra logic controller
    ├── package.json          # Dependencies và scripts của ứng dụng mobile
    ├── package-lock.json     # Khóa phiên bản dependencies
    ├── tsconfig.json         # Cấu hình TypeScript
    └── README.md             # Hướng dẫn này
=======
## 6. Kiểm tra ứng dụng

Chạy các kiểm tra logic của controller:

```bash
npm test
```

`npm test` cũng chạy các kiểm tra logic BLE.

Kiểm tra TypeScript:

```bash
npx tsc --noEmit
```

---

## 7. Cấu trúc ứng dụng mobile

```text
NQFT/
├── app/                      # Các route Expo Router
├── assets/                   # Logo, icon và hình ảnh
├── components/               # Controller, Bluetooth, hướng dẫn và cài đặt
├── context/                  # Trạng thái controller
├── hooks/                    # Hook kết nối BLE
├── App.tsx                   # Màn hình controller
├── app.json                  # Cấu hình Expo
├── bluetooth.ts              # Helpers và state BLE
├── controller.ts             # Logic điều khiển và PWM
├── package.json              # Dependencies và scripts
├── package-lock.json         # Khóa phiên bản dependencies
├── tsconfig.json             # Cấu hình TypeScript
└── README.md                 # Hướng dẫn này
>>>>>>> f32ebf4 (update)
```
