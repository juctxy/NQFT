# Hướng dẫn tạo file APK và đăng lên GitHub Releases

Dành cho **chủ repo**. Làm một lần (~10 phút). Sau đó người dùng Android có thể tải APK trực tiếp từ trang GitHub.

> **APK này là gì?** Một app Android "vỏ" (Trusted Web Activity) mở app web https://quanhuy38.github.io/NQFT/ bằng Chrome bên dưới.
> → Khi bạn sửa code web và push, **app trong APK tự cập nhật** — **không cần build lại APK**.
> Chỉ build lại APK khi đổi **tên app, icon, package ID** hoặc cần tăng phiên bản.

---

## Bước 0 — Kiểm tra app đã lên GitHub Pages đúng cách (BẮT BUỘC)

PWABuilder đọc **file manifest trên trang web thật**. Nếu GitHub Pages đang hiển thị README thay vì app, PWABuilder sẽ báo *không có manifest* và bắt bạn "Edit manifest".

1. Repo → **Settings → Pages → Build and deployment → Source** phải là **GitHub Actions** (không phải *Deploy from a branch*).
2. Tab **Actions** → workflow **Deploy PWA to GitHub Pages** mới nhất phải có dấu ✅ (nếu ❌ hoặc chưa có → **Run workflow**).
3. Mở 2 link sau, phải đúng như mô tả:

| Link | Phải thấy |
|---|---|
| <https://quanhuy38.github.io/NQFT/> | Trang **"RC Car — Kiểm tra kết nối"** (nền tối, nút Kết nối) — **không phải** trang README |
| <https://quanhuy38.github.io/NQFT/manifest.webmanifest> | Một đoạn JSON bắt đầu bằng `{"name":"RC Car Controller",…` — **không phải** trang 404 |

Chỉ khi cả 2 đúng mới sang Bước 1.

### Về mục "Edit manifest" trong PWABuilder
- Manifest của app **đã có đủ** các trường PWABuilder yêu cầu và khuyến nghị: `name`, `short_name`, `start_url`, `display`, icons 192/512 + maskable, `id`, `description`, `screenshots` (wide + narrow), `categories`, `theme_color`, `background_color`, `orientation`, `lang`, `dir`, `scope`, `display_override`, `launch_handler`, `prefer_related_applications`…
- **Không cần sửa manifest trong PWABuilder.** Trình sửa của PWABuilder **không thay đổi trang web thật** — nó chỉ cho tải về file manifest mới, bạn vẫn phải tự đưa vào code và deploy.
- Các mục **màu vàng** (optional) như *share_target, protocol_handlers, file_handlers, widgets, shortcuts, iarc_rating_id, related_applications, edge_side_panel…* **không chặn** việc đóng gói — bỏ qua được.
- Nếu PWABuilder báo **màu đỏ** (bắt buộc) ở trường nào: sửa trong `web/vite.config.ts` (phần `manifest:`), push lên `main`, đợi deploy xong, rồi bấm **Retest / phân tích lại** trên PWABuilder.

---

## Bước 1 — Tạo APK bằng PWABuilder

1. Mở <https://www.pwabuilder.com> trên máy tính.
2. Dán link app: `https://quanhuy38.github.io/NQFT/` → bấm **Start**.
3. Chờ PWABuilder phân tích xong → bấm **Package For Stores**.
4. Ở mục **Android** → bấm **Generate Package**.
5. Trong hộp tùy chọn, điền:

| Trường | Giá trị |
|---|---|
| Package ID | `io.github.quanhuy38.nqft` (chữ thường, **giữ cố định mãi mãi**) |
| App name | `RC Car Controller` |
| Launcher name | `RC Car` |
| App version | `1.0.0` |
| App version code | `1` (mỗi lần build lại phải **tăng lên**: 2, 3, …) |
| Display mode | `Fullscreen` |
| Signing key | **Create new** (lần đầu). Điền tên, tổ chức tùy ý |

6. Bấm **Download Package** → nhận file `.zip`. Giải nén, bên trong có:

| File | Dùng để |
|---|---|
| `*.apk` (vd `RC Car.apk` / `app-release-signed.apk`) | **File cài đặt — đăng lên Releases** |
| `*.aab` | Dùng cho Google Play (không cần) |
| `signing.keystore` | 🔑 **Khóa ký app** |
| `signing-key-info.txt` | 🔑 **Mật khẩu khóa** |
| `assetlinks.json` | Dùng ở Bước 4 (tùy chọn) |

> ⚠️ **Cất giữ `signing.keystore` và `signing-key-info.txt` ở nơi an toàn (Google Drive riêng, USB…). KHÔNG đưa lên GitHub.**
> Lần sau build lại APK phải dùng **đúng khóa này** (chọn *Signing key → Use mine* và tải lên keystore). Nếu mất khóa, người dùng phải **gỡ app cũ** mới cài được bản mới.

---

## Bước 2 — Đăng APK lên GitHub Releases

1. Đổi tên file APK cho gọn, vd **`RC-Car.apk`**.
2. Vào <https://github.com/quanhuy38/NQFT/releases/new>.
3. **Choose a tag** → gõ `v1.0.0` → bấm **Create new tag: v1.0.0 on publish**.
4. **Release title:** `RC Car v1.0.0`.
5. **Mô tả** (ví dụ):
   ```
   Cài trên Android:
   1. Tải RC-Car.apk bên dưới
   2. Mở file → cho phép "Cài ứng dụng không rõ nguồn gốc" → Cài đặt
   Yêu cầu: Android 7+ và Google Chrome đã cài trên máy.
   ```
6. Kéo thả **`RC-Car.apk`** vào ô **Attach binaries**. Chờ upload xong.
7. Bấm **Publish release**.

Link tải luôn trỏ tới bản mới nhất:
- Trang release: <https://github.com/quanhuy38/NQFT/releases/latest>
- Tải thẳng file: <https://github.com/quanhuy38/NQFT/releases/latest/download/RC-Car.apk> *(chỉ đúng khi file tên chính xác `RC-Car.apk`)*

README và nút "Tải APK" trong app đã trỏ sẵn tới các link này.

---

## Bước 3 — Cài APK trên điện thoại (người dùng)

1. Trên điện thoại Android, mở link tải APK (hoặc quét mã QR trong README → bấm **Tải APK**).
2. Chrome có thể cảnh báo *"File có thể gây hại"* → **Vẫn tải xuống**.
3. Mở file vừa tải → Android hỏi quyền **Cài ứng dụng không rõ nguồn gốc** → **Cài đặt → bật "Cho phép từ nguồn này"** → quay lại.
4. Bấm **Cài đặt**. Nếu **Play Protect** cảnh báo → **Chi tiết khác → Vẫn cài đặt**.
   (Cảnh báo vì app không đến từ Google Play — bình thường với APK tự phát hành.)
5. Mở app **RC Car** → bấm **Kết nối** như hướng dẫn trong [`HUONG_DAN_KET_NOI.md`](../HUONG_DAN_KET_NOI.md) mục 11.

> APK cần **Google Chrome** có trên máy (gần như mọi máy Android đều có sẵn).

---

## Bước 4 (tùy chọn) — Ẩn thanh địa chỉ trong APK

Mặc định APK mở app **kèm một thanh địa chỉ nhỏ** ở trên cùng (vẫn dùng bình thường). Muốn app toàn màn hình như app thật, Android cần xác minh bạn sở hữu tên miền, bằng file `https://quanhuy38.github.io/.well-known/assetlinks.json` — nằm ở **gốc tên miền**, không phải trong `/NQFT/`.

GitHub Pages chỉ cho đặt file ở gốc tên miền qua repo đặc biệt **`quanhuy38.github.io`**:

1. Tạo repo **công khai** tên chính xác `quanhuy38.github.io` trên GitHub.
2. Thêm 2 file vào repo đó:
   - `.nojekyll` — file rỗng (bắt buộc, nếu không GitHub bỏ qua thư mục bắt đầu bằng dấu chấm).
   - `.well-known/assetlinks.json` — copy nội dung file `assetlinks.json` trong zip ở Bước 1.
3. Repo đó → **Settings → Pages → Source: Deploy from a branch → main / (root)** → Save.
4. Chờ 1–2 phút, mở thử <https://quanhuy38.github.io/.well-known/assetlinks.json> → phải thấy nội dung JSON.
5. Gỡ app RC Car trên điện thoại rồi cài lại → thanh địa chỉ biến mất.

> Lưu ý: `quanhuy38.github.io` sẽ trở thành trang chủ của tài khoản; các project khác (`/NQFT/`…) không bị ảnh hưởng.

---

## Khi nào cần build lại APK?

| Thay đổi | Cần build lại APK? |
|---|---|
| Sửa code web, giao diện, tính năng, push lên `main` | ❌ Không — APK tự lấy bản mới |
| Đổi tên app / icon / màu splash | ✅ Có (tăng *version code*, dùng **lại** khóa cũ) |
| Đổi link app (repo khác, tên miền khác) | ✅ Có |
