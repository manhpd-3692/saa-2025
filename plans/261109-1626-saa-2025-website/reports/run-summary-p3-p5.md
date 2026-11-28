# Tổng kết lượt chạy tự động P3 → P5

Ngày: 2026-11-28 · Nhánh: `feat/saa-screens` (đã push)

## Đã làm

| Phase | Commit feat | Commit docs |
|---|---|---|
| P3 — Login, i18n, 403/404, header/footer, FAB | `01b620e` | `2e4571a` |
| P4 — Countdown Prelaunch, cổng chờ ra mắt | `ed625fa` | `e47366e` |
| P5 — Homepage SAA, Hệ thống giải, Tiêu chuẩn cộng đồng | `0e5bd13` | `docs(plan): phase 5 complete` (commit chứa chính file này) |

Mỗi phase đều đi đủ vòng: implementer → tester (Playwright 1440×1024, so ảnh Figma, chạy hết mã AC, soi console/5xx/log) → sửa (nếu trượt) → reviewer (0 critical, sửa hết warning) → cổng bằng chứng hard SEALED → delivery-tracker + doc-writer.

## Kết quả từng màn

| # | Màn | Phase | Kết quả | Số vòng sửa | sha | Báo cáo |
|---|---|---|---|---|---|---|
| 1 | U1 Login | P3 | PASS | 0 | `01b620e` | `verify-login.md` |
| 2 | Dropdown ngôn ngữ | P3 | PASS | 0 | `01b620e` | `verify-dropdown-language.md` |
| 3 | U11 Error 403 | P3 | PASS | 2 | `01b620e` | `verify-error-403.md` |
| 4 | U12 Error 404 | P3 | PASS | 2 | `01b620e` | `verify-error-404.md` |
| 5 | Dropdown profile | P3 | PASS | 0 | `01b620e` | `verify-dropdown-profile.md` |
| 6 | Dropdown profile Admin | P3 | PASS | 1 | `01b620e` | `verify-dropdown-profile-admin.md` |
| 7 | FAB (đóng) | P3 | PASS | 1 | `01b620e` | `verify-fab-closed.md` |
| 8 | FAB (mở) | P3 | PASS | 2 | `01b620e` | `verify-fab-open.md` |
| 9 | U2 Countdown Prelaunch | P4 | PASS | 1 | `ed625fa` | `verify-countdown-prelaunch.md` |
| 10 | U3 Homepage SAA | P5 | PASS | 1 | `0e5bd13` | `verify-homepage-saa.md` |
| 11 | U4 Hệ thống giải | P5 | PASS | 1 | `0e5bd13` | `verify-awards-system.md` |
| 12 | U10 Tiêu chuẩn cộng đồng | P5 | PASS | 0 | `0e5bd13` | `verify-community-standards.md` |

Không màn nào BLOCKED. Ảnh bằng chứng ở `evidence/screens/<màn>/`.

Kiểm tra cuối (code P5): typecheck 0 · lint 0 · vitest 185/185 · build 0 · e2e 58/58.

## Sự cố môi trường trong lúc chạy

- Cầu nối Windows → WSL rớt nhiều lần (WSAETIMEDOUT). Khoảng 07:13–10:08 ngày 28/11 WSL treo hẳn, Supabase và Go API chết. Đã gỡ bằng `wsl --shutdown`, dựng lại Supabase + Go API, seed lại `live`, tạo lại session. Script: `logs/stack-up-after-wsl-restart.sh`.
- Docker trong WSL tự bật lại nhiều container của dự án khác (`up-*`), có thể làm WSL quá tải. Không động vào.
- `.wslconfig` có key `bootConfigurationKeepAlive` mà WSL báo không nhận ra. Không động vào.
- Một file `.git/index.lock` rỗng sót lại từ lúc WSL khởi động lại (không có tiến trình git nào chạy) — đã xoá để commit P5.
- Database hiện ở `live`, session đã tạo lại.

## Còn mở

**Cần người kiểm tay**
- Đăng nhập / đăng xuất Google OAuth thật (F002 SC-001, SC-007, FR-102, FR-604).

**Thiếu tài nguyên thật**
- Ảnh nền, key visual, artwork giải thưởng đều là ảnh cắt từ PNG tham chiếu (đã xoá chữ) — cần bản export Figma thật. MoMorph báo Unauthorized nên không lấy được dữ liệu thiết kế.
- `start_at` thật của production; thông tin địa điểm và livestream đang là dữ liệu seed.
- Phần lớn bản tiếng Anh của nội dung Homepage, Hệ thống giải, Tiêu chuẩn cộng đồng chưa có — đang hiện tiếng Việt (AD04).

**Nội dung cần chốt**
- Bản dịch tiếng Việt cho 403/404/lỗi Login; chữ 403 trùng 404 trong thiết kế.
- Nhãn menu "Signature 2025 - Creator" theo FR-302, khác ảnh Figma (hai dòng, không gạch nối).
- Lỗi chữ trong Figma: ba giải dùng chung một tóm tắt, một dấu phẩy thừa cuối câu, trang Tiêu chuẩn cộng đồng có Slack handle của một người cụ thể.
- Câu chữ D004 về ngôn ngữ mặc định cần khớp với F001.

**Phụ thuộc phase sau**
- Link `/kudos` trên Homepage và Hệ thống giải đang ra 404 cho tới khi bảng Kudos (F006) xong — đã ghi vào phase F006 để kiểm lại.
- F001 SC-007 khoá ngôn ngữ (P6); link cảnh báo spam tới Tiêu chuẩn cộng đồng (FR-103, P10); các trang admin phải tự xử lý Go 403/401 (ghi trong phase 11).
- Footer chưa đánh dấu trang hiện tại (thuộc P3).

**Kỹ thuật**
- `go test -race` không chạy được (WSL không có gcc).
- `performance.now()` có thể đứng khi máy ngủ; đồng hồ đếm ngược tự đồng bộ lại khi tab hiện lại (đúng spec A4).
- Matcher của proxy sẽ chặn file `public/` có đuôi ngoài danh sách ảnh/font/icon nếu sau này thêm (`.json`, `.txt`…).
- Gợi ý review chưa làm: P3 (đưa về P14), P4 S2/S5/S6, P5 các suggestion còn lại.
- Tab ra khỏi menu thì focus rơi về logo (nhỏ).
- Giảm chuyển động trên menu Hệ thống giải mới kiểm trong code và một lần thử tay, chưa có test cố định.
