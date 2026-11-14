# NQFT – Robot Controller App

---

## 1. Yêu cầu môi trường

Trước khi chạy ứng dụng, hãy cài đặt:

- **Node.js** (bao gồm `npm`)
- **Git**
- **Expo Go** trên điện thoại (App Store hoặc Google Play), phiên bản tương thích với Expo SDK 58

Kiểm tra nhanh trong Terminal:

```bash
node -v
npm -v
git --version
```

---
git add mobile/
## 2. Clone Repository

Mở Terminal tại thư mục muốn lưu dự án và chạy:

```bash
# Clone branch có ứng dụng Expo
git clone -b layout3_mobile --single-branch https://github.com/juctxy/NQFT.git

# Di chuyển vào thư mục ứng dụng mobile
cd NQFT
cd mobile
```

> **Lưu ý:** Repository có cả ứng dụng web ở thư mục gốc và ứng dụng Expo trong `mobile/`. Để chạy Expo, chỉ cần cài thư viện và chạy lệnh trong `mobile/`; không cần cài dependencies của ứng dụng web.

---

## 3. Cài đặt thư viện

Đảm bảo Terminal đang ở thư mục `NQFT/mobile`, sau đó chạy:

```bash
npm ci
```

Lệnh này cài các phiên bản thư viện đã khóa trong `package-lock.json`.

---

## 4. Khởi chạy ứng dụng

Chạy Expo ở chế độ Expo Go qua tunnel:

```bash
npx expo start --go --tunnel
```

Mở ứng dụng trên điện thoại:

1. Chờ Terminal hiển thị mã QR.
2. Mở **Expo Go** trên điện thoại.
3. Dùng trình quét QR bên trong Expo Go để quét mã.
4. Chờ ứng dụng tải về điện thoại.

> Chế độ `--tunnel` cần kết nối Internet. Nếu điện thoại và máy tính cùng mạng Wi-Fi, có thể thử `npx expo start --go` thay thế.

---

## 5. Các chức năng hiện tại

- **Joystick 8 hướng:** Điều khiển joystick và di chuyển theo các hướng.
- **Điều chỉnh tốc độ:** Hai thanh chỉnh riêng cho **Motor 1** và **Motor 2**, phạm vi `0–255`.
- **Nút chức năng:** Có các nút `FUNC 1–4`, `CẢN` và `SÚT`.
- **Hướng dẫn và cài đặt:** Có màn hình hướng dẫn và các tùy chọn cài đặt PWM.
- **Giao diện Bluetooth:** Nút Bluetooth hiện chỉ mô phỏng trạng thái giao diện, chưa kết nối hoặc điều khiển robot thật.
- **Hiển thị ngang:** Ứng dụng được cấu hình cho chế độ landscape.
- **Nhận diện ứng dụng:** Hiển thị logo và tên “Watt'up Debuggers” trên giao diện điều khiển.

---

## 6. Kiểm tra ứng dụng

Chạy các kiểm tra logic của controller:

```bash
npm test
```

Kiểm tra TypeScript:

```bash
npx tsc --noEmit
```

---

## 7. Cấu trúc ứng dụng mobile

```text
NQFT/
└── mobile/
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
```
