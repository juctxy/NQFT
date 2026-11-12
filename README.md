# NQFT – Robot Controller App


---

## 1. Yêu cầu môi trường

Trước khi chạy dự án, hãy đảm bảo máy tính và điện thoại của bạn đã cài đặt:

- **Node.js** (bao gồm `npm`)
- **Git**
- **Expo Go** trên điện thoại (tải từ App Store hoặc Google Play)

Kiểm tra nhanh các cài đặt bằng Terminal:

```bash
node -v
npm -v
git --version
```

---

## 2. Clone Repository

Mở Terminal tại thư mục bạn muốn lưu dự án và chạy các lệnh:

```bash
# Clone đúng branch chứa giao diện mới nhất
git clone -b feature/tuan-app-mvp --single-branch https://github.com/juctxy/NQFT.git

# Di chuyển vào thư mục dự án
cd NQFT
```

> 💡 **Lưu ý:** Dự án hiện tại đang được phát triển trên branch `feature/tuan-app-mvp`. Vui lòng clone đúng branch này để lấy bản mới nhất.

---

## 3. Cài đặt thư viện

Sau khi di chuyển vào thư mục dự án, chạy lệnh:

```bash
npm install
```

*Lệnh này sẽ tự động tải các gói thư viện được khai báo trong `package.json`.*

---

## 4. Khởi chạy ứng dụng

Chạy lệnh sau để bắt đầu server Expo:

```bash
npx expo start --tunnel
```

**Các bước mở ứng dụng trên điện thoại:**

1. Chờ Terminal hiển thị mã QR.
2. Mở ứng dụng **Expo Go** trên điện thoại.
3. Quét mã QR hiển thị ở Terminal.
4. Chờ Expo tải và biên dịch ứng dụng.

> ⚠️ **Lưu ý:** Chế độ `--tunnel` cần kết nối Internet để chuyển tiếp dữ liệu qua mạng.

---

## 5. Các chức năng hiện tại

- **Điều khiển 4 hướng:** Tiến, lùi, trái, phải.
- **Di chuyển chéo:** Kết hợp các hướng tạo chuyển động đa dạng.
- **Trạng thái di chuyển:** Hiển thị trực quan hướng robot đang chạy.
- **Điều chỉnh tốc độ:** Tùy chỉnh độc lập cho **Motor 1** và **Motor 2** (phạm vi `0 – 255`).
- **Tính năng mở rộng:** 2 nút Function sẵn sàng cho các lệnh bổ sung.
- **Kết nối Bluetooth:** Giao diện sẵn sàng cho việc ghép nối thiết bị thực tế.
- **Tối ưu hiển thị:** Hỗ trợ xoay ngang (landscape) .

---

## 6. Cấu trúc dự án

```text
NQFT/
├── assets/             # Hình ảnh, icon và tài nguyên tĩnh
├── docs/               # Tài liệu dự án
├── App.tsx             # Giao diện chính và logic ứng dụng
├── app.json            # Cấu hình dự án Expo
├── index.ts            # Entry point của ứng dụng
├── package.json        # Danh sách thư viện và scripts
├── package-lock.json   # Khóa phiên bản các thư viện
└── tsconfig.json       # Cấu hình TypeScript
```
