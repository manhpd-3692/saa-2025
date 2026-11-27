# Prompt chạy tự động theo từng màn

Dán nguyên khối dưới đây vào Claude Code. Ảnh tham chiếu Figma đã có sẵn trong `docs/figma-refs/` (80 ảnh + README ánh xạ frame ID).

```text
/tkm:takumi --auto plans/261109-1626-saa-2025-website/plan.md

Mục tiêu: làm hết các màn SAA 2025 theo plan, từng màn một, chạy tự động hoàn toàn — tôi không trực. Tôi cho phép commit và push lên các nhánh làm việc dưới đây suốt lần chạy này, không cần hỏi lại. Chỉ dừng khi một màn trượt kiểm tra sau khi đã leo hết thang sửa, hoặc khi môi trường hỏng không tự sửa được; khi dừng thì ghi rõ lý do vào reports/run-stopped.md.

## 0. Chuẩn bị (một lần)
1. Commit Phase 1 đang dở trên nhánh feat/phase-01-foundation-bootstrap, kèm docs/figma-refs/, docs/system-architecture.md, README.md và file prompt này.
   - Stage từng đường dẫn tường minh.
   - KHÔNG đưa vào commit: .mcp.json, plans/**/spec/.claude/, mọi file .env*, supabase/signing_keys.json.
   - Push với -u.
2. Tạo nhánh feat/saa-screens từ nhánh đó. Mọi màn commit và push trên nhánh này.
3. Dựng stack local. Go, Supabase CLI và sqlc chỉ có trong WSL Ubuntu; lệnh chạy theo README.md và backend/README.md:
   - supabase start, chờ http://127.0.0.1:54321/auth/v1/health trả 200;
   - chạy backend/scripts/dev-db-role.sql, rồi seed SEED_SCENARIO=live;
   - chạy nền go run ./cmd/api, ghi log ra logs/api.log;
   - chạy nền npm run dev, ghi log ra logs/web.log;
   - thêm logs/, playwright/.auth/ vào .gitignore;
   - kiểm tra http://localhost:8080/healthz và http://localhost:3000 đều trả 200;
   - WSL ngủ thì container Supabase dừng: trước mỗi vòng kiểm, chờ health lại; sau mỗi supabase db reset thì chạy lại dev-db-role.sql và seed.
4. Phiên đăng nhập test, chỉ chạy local (không dùng Google):
   - Viết script test, ví dụ e2e/support/create-local-test-session.ts. Script không được import từ code chạy thật.
   - Script từ chối chạy nếu SUPABASE_URL không phải 127.0.0.1/localhost.
   - Ký access token ES256 bằng supabase/signing_keys.json cho một user seed (iss ${SUPABASE_URL}/auth/v1, aud authenticated, sub = id auth.users, email @sun-asterisk.com, app_metadata.provider = "google", providers = ["google"], kid đúng).
   - Ghi cookie phiên Supabase (định dạng của @supabase/ssr) thành storage state playwright/.auth/user.json. Làm thêm playwright/.auth/admin.json cho một user có role admin.
   - Go vẫn kiểm JWT qua JWKS như thật. Không thêm route hay cờ "bỏ qua đăng nhập" nào vào app.
   - Màn Login chỉ kiểm giao diện, và kiểm rằng bấm nút thì chuyển tới /auth/v1/authorize?provider=google. Luồng OAuth thật để người kiểm tay sau.
5. Tạo plans/261109-1626-saa-2025-website/screen-tracker.md từ docs/figma-refs/README.md.
   - Mỗi ảnh một dòng: tên màn | hạng mục checklist | phase | frame ID | ảnh tham chiếu | mã AC (FR/SC/BR trong spec của feature) | trạng thái | số vòng sửa | commit sha.
   - Phải đủ mọi màn trong docs/SCREENFLOW.md. Thiếu dòng nào thì bổ sung trước khi code.

## 1. Thứ tự làm (theo phụ thuộc của plan, không đảo)
- P2: đường rủi ro backend. Không có màn; chỉ kiểm bằng go test, kể cả integration.
- P3: Login, Đa ngôn ngữ, 403/404, header/footer, nút nổi.
- P4: Countdown Prelaunch (seed prelaunch để xem, xong seed lại live).
- P5: Homepage SAA, Hệ thống giải, Tiêu chuẩn cộng đồng.
- P6: Viết Kudos, đủ các trạng thái trong Figma.
- P7: Sun* Kudos (live board, View Kudo).
- P8: Like Kudos, Secret Box, hover danh hiệu, Thể lệ.
- P9: Profile.
- P10: Thông báo.
- P11: Admin Overview + User.
- P12: Admin Review content + overlay spam.
- P13: Admin Setting/Campaign.
- P14: tích hợp + E2E toàn luồng.

## 2. Vòng lặp mỗi màn — 2 agent chạy nối tiếp

a) AGENT THỰC HIỆN (implementer)
- Tier chọn theo .claude/skills/_shared/dispatch-model-tiers.md.
- Đọc: phase file, spec của màn (functional-spec, technical-spec, screens/*/spec.md), ảnh docs/figma-refs/ của màn.
- Viết BE + FE + test.
- Phải xanh: gofmt, go vet, go test (kể cả -tags integration), npm run typecheck, lint, test, build.
- Không commit.

b) AGENT KIỂM (tester, dùng Playwright MCP, KHÔNG sửa code)
- Dùng storage state ở bước 0.4 (admin.json cho màn admin).
- Mở màn trên http://localhost:3000, khung 1440×1024.
- Giao diện: chụp màn và các trạng thái có ảnh tham chiếu (hover, modal, dropdown, lỗi, rỗng). So với docs/figma-refs về bố cục, chữ, màu, cỡ chữ, khoảng cách, icon. Dữ liệu động (tên, số) được phép khác.
- Nghiệp vụ: chạy từng mã AC của màn trong screen-tracker. Ghi PASS/FAIL cho từng mã.
- Lỗi: không có lỗi trên console trình duyệt; network không có 5xx, không có 4xx ngoài các ca AC yêu cầu; logs/api.log và logs/web.log không có ERROR, panic, hay stack trace mới từ lúc bắt đầu kiểm.
- Lưu ảnh chụp vào plans/261109-1626-saa-2025-website/evidence/screens/<màn>/.
- Ghi báo cáo reports/verify-<màn>.md. Kết luận PASS chỉ khi cả 3 tiêu chí trên đều đạt; FAIL thì kèm danh sách lỗi cụ thể (file, vị trí, ảnh so sánh).

c) FAIL
- Gửi đúng danh sách lỗi cho agent thực hiện sửa, rồi agent kiểm chạy lại.
- Tối đa 2 vòng ở tier hiện tại. Vòng 3 dùng agent mới, tier cao hơn một bậc.
- Ở tier strong vẫn FAIL: ghi màn đó là BLOCKED trong screen-tracker. Làm tiếp các màn không phụ thuộc nó; màn phụ thuộc thì để chờ.
- Cấm sửa hoặc xoá test, hạ tiêu chí, hay dùng dữ liệu giả để qua.

d) PASS
- reviewer xem diff của màn; phải 0 critical. Có warning thì sửa và kiểm lại.
- Cập nhật screen-tracker.md và phase file.
- Commit "feat(<scope>): <tên màn>" và push.

## 3. Hết mỗi phase
Chạy đủ bước Delivery của takumi: delivery-tracker, doc-writer, evidence gate hard (phải SEALED). Commit docs/plan riêng: "docs(plan): phase N complete".

## 4. Kết thúc
- Chạy toàn bộ test + build một lần cuối.
- Mở PR feat/saa-screens → main.
- Viết báo cáo tiếng Việt vào reports/run-summary.md: bảng từng màn (PASS/BLOCKED, số vòng sửa, commit sha), việc còn mở (kể cả luồng Google OAuth thật cần kiểm tay), link PR.

## Luôn giữ
- Không commit secret. Không dùng Workflow tool.
- Nguồn sự thật theo thứ tự trong plan.md: contract → gap-resolution-log → spec → SCREENFLOW.
- Desktop ≥ 1280 px.
- Next.js 16: đọc tài liệu trong node_modules/next/dist/docs trước khi viết code framework.
```
