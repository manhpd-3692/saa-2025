# Screen tracker - SAA 2025

Bảng theo dõi từng màn/trạng thái cần xác nhận khớp thiết kế Figma (desktop 1440 px) trên localhost.
Mỗi dòng là một ảnh trong `docs/figma-refs/` (80 ảnh = 57 user + 23 admin). Nguồn: `docs/figma-refs/README.md`,
`docs/SCREENFLOW.md`; mã AC lấy từ `spec/<feature>/functional-spec.md`, `technical-spec.md` và `screens/*/spec.md`.

## Cách đọc các cột

| Cột | Ý nghĩa |
|---|---|
| Tên màn | Tên màn hoặc trạng thái (U#/A# theo SCREENFLOW) |
| Hạng mục checklist | Hạng mục trong 8 mục báo cáo hằng ngày của khoá học; `(ngoài checklist)` nếu không thuộc mục nào |
| Phase | P3..P13 theo thứ tự chạy trong `plan.md` |
| Frame ID | Node ID Figma. "hoặc" / "/" là các ID ứng viên khi README không nói rõ biến thể nào; `[S]`, `[H]` xem ghi chú dưới bảng |
| Ảnh tham chiếu | Ảnh chuẩn để so khớp |
| Mã AC | `F### mã`: FR (yêu cầu), BR (luật nghiệp vụ), SC (kịch bản kiểm thử trong technical-spec), DEC (quyết định) của feature đó. Chỉ liệt kê mã, nội dung xem spec |
| Trạng thái | `Pending` / `In progress` / `Done` |
| Số vòng sửa | Số lần sửa lại sau khi so với ảnh (bắt đầu 0) |
| Commit sha | SHA commit hoàn thành màn (`-` khi chưa có) |

Feature: F001 App Shell/i18n · F002 Google Auth · F003 Countdown · F004 Homepage/Awards/Community Standards ·
F005 Viết/Sửa Kudo · F006 Live board/Kudo detail · F007 Profile · F008 Heart/Hero badge/Secret Box ·
F009 Thông báo · F010 Admin Overview/User · F011 Admin Review content · F012 Admin Campaign.

Ghi chú:
- `[S]` standby: 1466:7614, 1466:7635, 2995:15777, 3066:15629, 3241:15069, 3241:15083, 3241:15097, 3241:15113
  (README không cho biết ảnh `secret-box-standby-N` ứng với ID nào; xác định khi làm P8).
- `[H]` hero badge: ID theo thứ tự SCREENFLOW (New, Rising, Super, Legend), chưa xác nhận từng ảnh.
- Phase chạy theo run order: P3 Login/i18n/403-404/header-footer/FAB · P4 Countdown · P5 Homepage/Awards/Community
  Standards · P6 Viết Kudos · P7 Live board/View Kudo/filter/hover/card · P8 Heart/Secret Box/badge/Thể lệ ·
  P9 Profile · P10 Thông báo · P11 Admin Overview + User · P12 Admin Review + KUDO spam · P13 Admin Setting/Campaign.
- Date picker, pick date và "Dropdown chọn thời gian" đặt ở P13 (form campaign); Overview ở P11 cũng dùng bộ chọn
  khoảng ngày (F010 FR-401), dùng lại thành phần đó.

## Độ phủ SCREENFLOW

Mọi màn/overlay trong `docs/SCREENFLOW.md` đều có ít nhất một ảnh nên không có dòng `(không có ảnh)`.
Chiều ngược lại: `user/kudo-card.png` là component, không có trong SCREENFLOW (dòng #29 của bảng).

## P2 (không có màn)

P2 (đường rủi ro đầu-cuối: provision, JWT, `/me`...) không có màn nào ở đây. Phase này được xác nhận bằng
`go test` (kèm `go test -tags integration` với Supabase local), không có dòng trong bảng.

## Bảng theo dõi (80 dòng)

| # | Tên màn | Hạng mục checklist | Phase | Frame ID | Ảnh tham chiếu | Mã AC | Trạng thái | Số vòng sửa | Commit sha |
|---|---|---|---|---|---|---|---|---|---|
| 1 | U1 Login | Login | P3 | 662:14387 | `docs/figma-refs/user/login.png` | F002 FR-101,102,103,201,202,203,604,605 · BR-002,003 · SC-001,003,005,007 | Done (PASS) | 0 | 01b620e |
| 2 | Dropdown-ngôn ngữ | Đa ngôn ngữ | P3 | 721:4942 | `docs/figma-refs/user/dropdown-language.png` | F001 FR-002,203,401 · BR-001,003 · SC-001,002,007 | Done (PASS) | 0 | 01b620e |
| 3 | U11 Error 403 | (ngoài checklist) | P3 | 2182:9291 | `docs/figma-refs/user/error-403.png` | F001 FR-403 · SC-005 · F002 FR-603 · DEC-003 · SC-004 | Done (PASS) | 2 | 01b620e |
| 4 | U12 Error 404 | (ngoài checklist) | P3 | 1378:5063 | `docs/figma-refs/user/error-404.png` | F001 FR-402 · SC-005 · F006 FR-405 | Done (PASS) | 2 | 01b620e |
| 5 | Dropdown-profile | Homepage SAA | P3 | 721:5223 | `docs/figma-refs/user/dropdown-profile.png` | F001 FR-201,602 · F002 FR-104,402 · SC-006 | Done (PASS) | 0 | 01b620e |
| 6 | Dropdown-profile Admin | (ngoài checklist) | P3 | 721:5277 | `docs/figma-refs/user/dropdown-profile-admin.png` | F001 FR-201,601 · DEC-001 · SC-003,008 · F002 FR-603 | Done (PASS) | 1 | 01b620e |
| 7 | Floating Action Button (đóng) | Homepage SAA | P3 | 313:9137 hoặc 313:9139 | `docs/figma-refs/user/fab-closed.png` | F001 FR-104 · F008 FR-101 · F005 FR-101 | Done (PASS) | 1 | 01b620e |
| 8 | Floating Action Button (mở) | Homepage SAA | P3 | 313:9137 hoặc 313:9139 | `docs/figma-refs/user/fab-open.png` | F001 FR-104 · F008 FR-101,103 · F005 FR-101 | Done (PASS) | 2 | 01b620e |
| 9 | U2 Countdown - Prelaunch | Countdown Prelaunch | P4 | 2268:35127 | `docs/figma-refs/user/countdown-prelaunch.png` | F003 FR-101,102,103,201,202,203,204,401,402,403 · BR-001,002,003 · SC-003,004,005,008,011 | Done (PASS) | 1 | ed625fa |
| 10 | U3 Homepage SAA | Homepage SAA | P5 | 2167:9026 | `docs/figma-refs/user/homepage-saa.png` | F004 FR-101,201,202,203,204,205,206,207,403,601 · SC-001,005,007,010 | Done (PASS) | 1 | 0e5bd13 |
| 11 | U4 Hệ thống giải | Hệ thống giải | P5 | 313:8436 | `docs/figma-refs/user/awards-system.png` | F004 FR-301,302,303,304,305,401,402 · BR-001,002,003 · SC-001,002,003,004 | Done (PASS) | 1 | 0e5bd13 |
| 12 | U10 Tiêu chuẩn cộng đồng | Homepage SAA (footer) | P5 | 1161:8944 | `docs/figma-refs/user/community-standards.png` | F004 FR-103,351,352,601 · SC-006 · F005 FR-210 | Done (PASS) | 0 | 0e5bd13 |
| 13 | U6 Viết Kudo | Viết Kudos | P6 | 520:11602 | `docs/figma-refs/user/write-kudo.png` | F005 FR-101,201,202,203,204,205,206,207,209,210,401,402,405 · BR-001..004 · SC-001,004 | Done (PASS) | 1 | 7a31bbd |
| 14 | Gửi lời chúc Kudos (biến thể 1) | Viết Kudos | P6 | 828:13433 hoặc 1612:5056 | `docs/figma-refs/user/write-kudo-form-variant-1.png` | F005 FR-201,202,203,205,207 · BR-002,004 · SC-004 | Done (PASS) | 1 | 7a31bbd |
| 15 | Gửi lời chúc Kudos (biến thể 2) | Viết Kudos | P6 | 828:13433 hoặc 1612:5056 | `docs/figma-refs/user/write-kudo-form-variant-2.png` | F005 FR-203,204,206,209 · BR-003 · SC-004,005 | Done (PASS) | 1 | 7a31bbd |
| 16 | Viết KUDO - lỗi chưa điền đủ | Viết Kudos | P6 | 662:13035 | `docs/figma-refs/user/write-kudo-validation-error.png` | F005 FR-208,402 · BR-001,002,003,004 · SC-002 | Done (PASS) | 0 | 7a31bbd |
| 17 | Dropdown list người nhận | Viết Kudos | P6 | 828:10943 | `docs/figma-refs/user/write-kudo-dropdown-receiver.png` | F005 FR-201,204 · BR-001 · SC-002 | Done (PASS) | 0 | 7a31bbd |
| 18 | Dropdown list hashtag | Viết Kudos | P6 | 1002:13013 | `docs/figma-refs/user/write-kudo-dropdown-hashtag.png` | F005 FR-002,205 · BR-002 | Done (PASS) | 0 | 7a31bbd |
| 19 | Addlink Box | Viết Kudos | P6 | 1002:12917 | `docs/figma-refs/user/write-kudo-addlink-box.png` | F005 FR-203,209 · SC-004 | Done (PASS) | 1 | 7a31bbd |
| 20 | Ẩn danh | Viết Kudos | P6 | 2099:9148 | `docs/figma-refs/user/write-kudo-anonymous.png` | F005 FR-207,404,604 · BR-005 · SC-006,007 | Done (PASS) | 0 | 7a31bbd |
| 21 | Màn sửa bài viết - edit mode | Viết Kudos | P6 | 1949:13746 | `docs/figma-refs/user/write-kudo-edit-mode.png` | F005 FR-102,403,404,406,602 · BR-006,008 · SC-003,008 | Done (PASS) | 1 | 7a31bbd |
| 22 | U5 Sun* Kudos - Live board | Sun* Kudos | P7 | 2940:13431 | `docs/figma-refs/user/kudos-live-board.png` | F006 FR-001,101,201..211,403,601 · BR-001,003,004,005 · SC-001,003,004,009 | Done (PASS) | 0 | 2f44032 |
| 23 | U7 View Kudo | Sun* Kudos | P7 | 520:18779 | `docs/figma-refs/user/view-kudo.png` | F006 FR-102,104,401,404,405 · BR-006,007 · SC-006 | Done (PASS) | 1 | 2f44032 |
| 24 | Dropdown Hashtag filter | Sun* Kudos | P7 | 721:5580 | `docs/figma-refs/user/kudos-dropdown-hashtag-filter.png` | F006 FR-203 · BR-003 · SC-004 | Done (PASS) | 0 | 2f44032 |
| 25 | Dropdown Phòng ban | Sun* Kudos | P7 | 721:5684 | `docs/figma-refs/user/kudos-dropdown-department.png` | F006 FR-204 · BR-003 · SC-004 | Done (PASS) | 0 | 2f44032 |
| 26 | Hover Avatar info user | Sun* Kudos | P7 | 721:5827 | `docs/figma-refs/user/hover-avatar-info.png` | F006 FR-103,402 · BR-002 · SC-002 | Done (PASS) | 0 | 2f44032 |
| 27 | Infor - HoverAvatar | Sun* Kudos | P7 | 2268:35101 | `docs/figma-refs/user/hover-avatar-info-2.png` | F006 FR-103,402 · BR-002 · SC-002,007 | Done (PASS) | 0 | 2f44032 |
| 28 | Hashtag group | Sun* Kudos | P7 | 1002:13094 | `docs/figma-refs/user/hashtag-group.png` | F006 FR-002 · F005 FR-002,205 · BR-002 | Done (PASS) | 1 | 2f44032 |
| 29 | KUDO card (component, không có trong SCREENFLOW) | Sun* Kudos | P7 | - | `docs/figma-refs/user/kudo-card.png` | F006 FR-002,003,211 · BR-001,002 · SC-002,008 · F008 FR-401,408 | Done (PASS) | 1 | 2f44032 |
| 30 | Hover campaign (x2 heart) | Like Kudos | P8 | 3241:15021 | `docs/figma-refs/user/hover-campaign.png` | F008 FR-204,401,402,408 · BR-001,002,003,004 · SC-001,002,003 | Done (PASS) | 1 | a9f3c68 |
| 31 | Thể lệ UPDATE (rules panel) | Sun* Kudos | P8 | 3204:6051 | `docs/figma-refs/user/rules-panel.png` | F008 FR-101,103,201,202 · BR-005,009 · SC-005,008 | Done (PASS) | 1 | a9f3c68 |
| 32 | Hover danh hiệu New Hero | (ngoài checklist) | P8 | 3241:14991 [H] | `docs/figma-refs/user/hover-badge-new-hero.png` | F008 FR-002,203 · BR-005 · SC-005 | Done (PASS) | 0 | a9f3c68 |
| 33 | Hover danh hiệu Rising Hero | (ngoài checklist) | P8 | 3241:14995 [H] | `docs/figma-refs/user/hover-badge-rising-hero.png` | F008 FR-002,203,405 · BR-005 · SC-005 | Done (PASS) | 0 | a9f3c68 |
| 34 | Hover danh hiệu Super Hero | (ngoài checklist) | P8 | 3241:14999 [H] | `docs/figma-refs/user/hover-badge-super-hero.png` | F008 FR-002,203,405 · BR-005 · SC-005 | Done (PASS) | 0 | a9f3c68 |
| 35 | Hover danh hiệu Legend Hero | (ngoài checklist) | P8 | 3241:15003 [H] | `docs/figma-refs/user/hover-badge-legend-hero.png` | F008 FR-002,203,405 · BR-005 · SC-005 | Done (PASS) | 0 | a9f3c68 |
| 36 | Open secret box - chưa mở (1) | (ngoài checklist) | P8 | 1466:7069 / 1466:7676 | `docs/figma-refs/user/secret-box-unopened-1.png` | F008 FR-102,205,207 · BR-006,007 · SC-007 | Done (PASS) | 0 | a9f3c68 |
| 37 | Open secret box - chưa mở (2) | (ngoài checklist) | P8 | 1466:7069 / 1466:7676 | `docs/figma-refs/user/secret-box-unopened-2.png` | F008 FR-102,205,207 · BR-007 · SC-006 | Done (PASS) | 0 | a9f3c68 |
| 38 | Open secret box - action bấm mở (1) | (ngoài checklist) | P8 | 1466:7024 / 1466:7593 | `docs/figma-refs/user/secret-box-opening-1.png` | F008 FR-404,602 · BR-007,008 · SC-006,013 | Done (PASS) | 0 | a9f3c68 |
| 39 | Open secret box - action bấm mở (2) | (ngoài checklist) | P8 | 1466:7024 / 1466:7593 | `docs/figma-refs/user/secret-box-opening-2.png` | F008 FR-404 · BR-007,008 · SC-006,013,014 | Done (PASS) | 0 | a9f3c68 |
| 40 | Open Giftbox - kết quả (1) | (ngoài checklist) | P8 | 2995:15708 / 15733 / 15754 | `docs/figma-refs/user/secret-box-giftbox-1.png` | F008 FR-206,404 · BR-008 · SC-006 | Done (PASS) | 1 | a9f3c68 |
| 41 | Open Giftbox - kết quả (2) | (ngoài checklist) | P8 | 2995:15708 / 15733 / 15754 | `docs/figma-refs/user/secret-box-giftbox-2.png` | F008 FR-206,404 · BR-008,010 · SC-012 | Done (PASS) | 1 | a9f3c68 |
| 42 | Open Giftbox - kết quả (3) | (ngoài checklist) | P8 | 2995:15708 / 15733 / 15754 | `docs/figma-refs/user/secret-box-giftbox-3.png` | F008 FR-206,409 · BR-010 · SC-012 | Done (PASS) | 0 | a9f3c68 |
| 43 | Open secret box - Standby (1/8) | (ngoài checklist) | P8 | 1 trong 8 [S] | `docs/figma-refs/user/secret-box-standby-1.png` | F008 FR-205,206,404 · BR-008 · SC-006 | Done (PASS) | 0 | a9f3c68 |
| 44 | Open secret box - Standby (2/8) | (ngoài checklist) | P8 | 1 trong 8 [S] | `docs/figma-refs/user/secret-box-standby-2.png` | F008 FR-205,206,404 · BR-008 · SC-006 | Done (PASS) | 0 | a9f3c68 |
| 45 | Open secret box - Standby (3/8) | (ngoài checklist) | P8 | 1 trong 8 [S] | `docs/figma-refs/user/secret-box-standby-3.png` | F008 FR-205,206,404 · BR-008 · SC-006 | Done (PASS) | 0 | a9f3c68 |
| 46 | Open secret box - Standby (4/8) | (ngoài checklist) | P8 | 1 trong 8 [S] | `docs/figma-refs/user/secret-box-standby-4.png` | F008 FR-205,206,404 · BR-008 · SC-006 | Done (PASS) | 0 | a9f3c68 |
| 47 | Open secret box - Standby (5/8) | (ngoài checklist) | P8 | 1 trong 8 [S] | `docs/figma-refs/user/secret-box-standby-5.png` | F008 FR-206,404,409 · BR-008,010 · SC-012 | Done (PASS) | 0 | a9f3c68 |
| 48 | Open secret box - Standby (6/8) | (ngoài checklist) | P8 | 1 trong 8 [S] | `docs/figma-refs/user/secret-box-standby-6.png` | F008 FR-206,404,409 · BR-008,010 · SC-012 | Done (PASS) | 0 | a9f3c68 |
| 49 | Open secret box - Standby (7/8) | (ngoài checklist) | P8 | 1 trong 8 [S] | `docs/figma-refs/user/secret-box-standby-7.png` | F008 FR-206,404,409 · BR-008,010 · SC-012 | Done (PASS) | 0 | a9f3c68 |
| 50 | Open secret box - Standby (8/8) | (ngoài checklist) | P8 | 1 trong 8 [S] | `docs/figma-refs/user/secret-box-standby-8.png` | F008 FR-206,404,409 · BR-008,010 · SC-012 | Done (PASS) | 0 | a9f3c68 |
| 51 | U8 Profile bản thân | (ngoài checklist) | P9 | 362:5037 | `docs/figma-refs/user/profile-own.png` | F007 FR-001,101,201,202,203,204,205,206,401,402,403,404 · BR-003,004,005 · SC-001,002,008,009 | Done (PASS) | 0 | 8073e25 |
| 52 | U9 Profile người khác | (ngoài checklist) | P9 | 362:5097 | `docs/figma-refs/user/profile-other.png` | F007 FR-102,103,104,301,302,601..605 · BR-001,002,003,004 · SC-003,005,006,007,011 | Done (PASS) | 1 | 8073e25 |
| 53 | Dropdown-filter đã nhận/gửi | (ngoài checklist) | P9 | 763:4728 | `docs/figma-refs/user/profile-dropdown-received-sent.png` | F007 FR-205,401,603 · BR-002 · SC-002,005 | Done (PASS) | 0 | 8073e25 |
| 54 | Tất cả thông báo (panel) | (ngoài checklist) | P10 | 589:9132 | `docs/figma-refs/user/notifications-panel.png` | F009 FR-101,201,202,203,204,205,402,403,404 · BR-004,005 · SC-003,006,007 | Pending | 0 | - |
| 55 | View thông báo (chi tiết) | (ngoài checklist) | P10 | 589:9152 | `docs/figma-refs/user/notification-detail.png` | F009 FR-102,103,206,401,405 · BR-002,007 · SC-002,009 | Pending | 0 | - |
| 56 | A1 Admin - Overview | (ngoài checklist) | P11 | 620:7712 | `docs/figma-refs/admin/admin-overview.png` | F010 FR-001,101,102,103,104,401,402,601 · BR-001,002,003,006,007 · SC-001,002,006 | Pending | 0 | - |
| 57 | A4 Admin - User | (ngoài checklist) | P11 | 773:26403 | `docs/figma-refs/admin/admin-user.png` | F010 FR-201,202,203,204,205,206,207,403,601 · BR-005,008 · SC-003,007 | Pending | 0 | - |
| 58 | Dropdown search user admin | (ngoài checklist) | P11 | 1002:15639 | `docs/figma-refs/admin/admin-dropdown-search-user.png` | F010 FR-203 · BR-005 · SC-003 | Pending | 0 | - |
| 59 | Dropdown list phòng ban | (ngoài checklist) | P11 | 1002:15708 | `docs/figma-refs/admin/admin-dropdown-department.png` | F010 FR-202 · BR-005 · SC-003 | Pending | 0 | - |
| 60 | Dropdown level | (ngoài checklist) | P11 | 1002:15711 | `docs/figma-refs/admin/admin-dropdown-level.png` | F010 FR-202 · BR-005 · SC-003 | Pending | 0 | - |
| 61 | Dropdown Role | (ngoài checklist) | P11 | 1002:15714 | `docs/figma-refs/admin/admin-dropdown-role.png` | F010 FR-202,206 · BR-005 · SC-003 | Pending | 0 | - |
| 62 | A2 Admin - Review content | (ngoài checklist) | P12 | 722:16251 | `docs/figma-refs/admin/admin-review-content.png` | F011 FR-101,102,103,206,601,602 · BR-004,007 · SC-001,002,007 | Pending | 0 | - |
| 63 | A3 Admin - Review content - Search | (ngoài checklist) | P12 | 832:13197 | `docs/figma-refs/admin/admin-review-content-search.png` | F011 FR-205,206 · BR-001 · SC-001 | Pending | 0 | - |
| 64 | Action - Spam | (ngoài checklist) | P12 | 773:26373 | `docs/figma-refs/admin/admin-action-spam.png` | F011 FR-301,303,304,305,603 · BR-002,003 · SC-003,004,005,009,011 | Pending | 0 | - |
| 65 | Action - Public | (ngoài checklist) | P12 | 773:26295 | `docs/figma-refs/admin/admin-action-public.png` | F011 FR-302,304,305,603 · BR-002,008 · SC-006,009,010 | Pending | 0 | - |
| 66 | C_Filter | (ngoài checklist) | P12 | 1002:15394 | `docs/figma-refs/admin/admin-filter.png` | F011 FR-203,204,206 · BR-001,005 · SC-001 | Pending | 0 | - |
| 67 | Dropdown list người đã gửi | (ngoài checklist) | P12 | 1002:15428 | `docs/figma-refs/admin/admin-dropdown-sender.png` | F011 FR-201 · BR-009 · SC-002 | Pending | 0 | - |
| 68 | Dropdown list người nhận | (ngoài checklist) | P12 | 1002:15464 | `docs/figma-refs/admin/admin-dropdown-receiver.png` | F011 FR-202 · BR-009 · SC-002 | Pending | 0 | - |
| 69 | Dropdown list status | (ngoài checklist) | P12 | 1002:15559 | `docs/figma-refs/admin/admin-dropdown-status.png` | F011 FR-203 · BR-001 · SC-001 | Pending | 0 | - |
| 70 | KUDO spam | (ngoài checklist) | P12 | 3127:24099 hoặc 3127:24672 | `docs/figma-refs/user/kudo-spam.png` | F011 FR-304,401 · BR-006,008 · SC-008 · F006 FR-001 | Pending | 0 | - |
| 71 | Alert Overlay (KUDO spam) | (ngoài checklist) | P12 | 3127:24099 hoặc 3127:24672 | `docs/figma-refs/user/kudo-spam-alert-overlay.png` | F011 FR-401,402 · BR-006 · SC-008 · F004 FR-103 | Pending | 0 | - |
| 72 | A5 Admin - Setting | (ngoài checklist) | P13 | 820:10492 | `docs/figma-refs/admin/admin-setting.png` | F012 FR-101,102,103,405,601 · BR-006 · SC-001,004,008 | Pending | 0 | - |
| 73 | A6 add new Campaign | (ngoài checklist) | P13 | 820:11445 | `docs/figma-refs/admin/admin-setting-add-new-campaign.png` | F012 FR-201,203,401,402,403 · BR-001,002,003 · SC-002,003 | Pending | 0 | - |
| 74 | A7 add Campaign (đã điền) | (ngoài checklist) | P13 | 832:12113 | `docs/figma-refs/admin/admin-setting-add-campaign-filled.png` | F012 FR-201,401,402,602 · BR-001,002,003,007 · SC-002,003,006 | Pending | 0 | - |
| 75 | A8 Edit Campaign | (ngoài checklist) | P13 | 832:12299 | `docs/figma-refs/admin/admin-setting-edit-campaign.png` | F012 FR-202,401,402,403 · BR-005 · SC-003,005,007 | Pending | 0 | - |
| 76 | Popup delete campaign | (ngoài checklist) | P13 | 1760:8926 | `docs/figma-refs/admin/admin-popup-delete-campaign.png` | F012 FR-404 · BR-005 · SC-005,007 | Pending | 0 | - |
| 77 | Action - Campaign | (ngoài checklist) | P13 | 820:11429 | `docs/figma-refs/admin/admin-action-campaign.png` | F012 FR-405 · BR-006 · SC-004 | Pending | 0 | - |
| 78 | date picker | (ngoài checklist) | P13 | 1413:9045 | `docs/figma-refs/admin/admin-date-picker.png` | F012 FR-203 · BR-002,007 · SC-003,006 | Pending | 0 | - |
| 79 | pick date | (ngoài checklist) | P13 | 2492:9140 | `docs/figma-refs/admin/admin-pick-date.png` | F012 FR-203 · BR-002,007 · SC-003,006 | Pending | 0 | - |
| 80 | Dropdown chọn thời gian | (ngoài checklist) | P13 | 860:14284 | `docs/figma-refs/admin/admin-dropdown-time-range.png` | F012 FR-203 · BR-007 · SC-006 | Pending | 0 | - |

## Tổng hợp theo phase

| Phase | Số dòng |
|---|---|
| P3 | 8 |
| P4 | 1 |
| P5 | 3 |
| P6 | 9 |
| P7 | 8 |
| P8 | 21 |
| P9 | 3 |
| P10 | 2 |
| P11 | 6 |
| P12 | 10 |
| P13 | 9 |
