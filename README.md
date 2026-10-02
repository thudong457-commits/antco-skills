# Antco skills

Bộ **Agent Skills** (thư mục `SKILL.md`) giúp Claude Code, Codex và các agent hỗ trợ chuẩn Agent Skills **tuỳ biến Antco ERP từ mô tả nghiệp vụ**: bạn dán một API token Antco vào file `.env`, mô tả nhu cầu ("tôi cần quản lý khảo sát hiện trường + phương án kỹ thuật..."), agent sẽ khảo sát hệ thống, hỏi lại những điểm chưa rõ bằng một form, đề xuất thiết kế + kế hoạch để bạn duyệt, rồi mới tạo đối tượng, trường, giao diện, quy tắc, bộ lọc, báo cáo và dữ liệu demo qua **Antco Public API v1**.

> **English summary.** Agent Skills bundle for customizing Antco ERP via its Public API v1. Put `ANTCO_BASE_URL` and `ANTCO_API_KEY` in a git-ignored `.env`, describe your business process, and the `build-antco-app` orchestrator surveys your workspace read-only, asks clarifying questions through an offline HTML form, proposes a design and a dependency-ordered plan behind two approval gates, then applies it with server-side dry runs first, run-id tagging, read-back verification and a hashed delivery manifest. Specialist skills cover objects, fields, records/demo data, layouts, rules, actions, public forms, filters, related lists, reports and dashboards. Node.js >= 18, no dependencies. MIT licensed.

- Phiên bản bundle: xem [VERSION](VERSION) (`1.0.0`, 2026-10-02) · Nhật ký: [CHANGELOG.md](CHANGELOG.md) · Giấy phép: [MIT](LICENSE)

## 1. Bộ skill gồm những gì

| Skill | Dùng khi |
|---|---|
| [`build-antco-app`](skills/build-antco-app/SKILL.md) | Dựng / tuỳ biến **cả một ứng dụng nghiệp vụ** từ mô tả: khảo sát -> câu hỏi -> **cổng duyệt 1** -> thiết kế + kế hoạch -> **cổng duyệt 2** -> triển khai -> kiểm tra -> bàn giao |
| [`antco-api-auth`](skills/antco-api-auth/SKILL.md) | Quy tắc chung: token, `/whoami`, header, dryRun, lỗi, giới hạn tần suất; hợp đồng API rút gọn ở `references/public-api-v1.md` |
| [`antco-overview`](skills/antco-overview/SKILL.md) | Antco có những phân hệ / đối tượng nào, cấu hình được gì, chọn skill nào, phương pháp thiết kế dữ liệu |
| [`antco-objects`](skills/antco-objects/SKILL.md) | Đối tượng tự tạo Thường / Con / Trung gian, tên bản ghi đánh số |
| [`antco-fields`](skills/antco-fields/SKILL.md) | 23 kiểu trường, lựa chọn, tra cứu, công thức, tổng hợp |
| [`antco-records`](skills/antco-records/SKILL.md) | Đọc / ghi bản ghi, **dữ liệu demo** gắn nhãn lượt chạy và dọn dẹp |
| [`antco-layouts`](skills/antco-layouts/SKILL.md) | Giao diện kéo-thả v2 (màn Tạo / Xem-Sửa) |
| [`antco-rules`](skills/antco-rules/SKILL.md) | Quy tắc giao diện, trùng lặp, bảo mật dữ liệu, chuyển trạng thái, lộ trình |
| [`antco-actions`](skills/antco-actions/SKILL.md) | Nút hành động và chuỗi hành động |
| [`antco-forms`](skills/antco-forms/SKILL.md) | Biểu mẫu web công khai `/f/<slug>` |
| [`antco-filters`](skills/antco-filters/SKILL.md) | Bộ lọc nâng cao, chia sẻ, cột, Kanban / Lịch |
| [`antco-related-lists`](skills/antco-related-lists/SKILL.md) | Danh sách liên quan trên trang bản ghi |
| [`antco-reports`](skills/antco-reports/SKILL.md) | Loại báo cáo, báo cáo, bảng điều khiển + biểu đồ |

Kèm theo: `templates/` (form câu hỏi HTML offline, mẫu Markdown yêu cầu / thiết kế / kế hoạch / bàn giao, JSON schema câu trả lời và manifest), `scripts/` (Node.js, không thư viện ngoài), `examples/pcs-khao-sat/` (một dự án mẫu đầy đủ, dữ liệu tổng hợp).

## 2. Yêu cầu

- Một workspace Antco và một tài khoản có quyền tạo API token (mặc định Quản trị hệ thống).
- Node.js **>= 18** (để chạy `scripts/*.mjs`). Không cần cài gói npm nào.
- Agent hỗ trợ Agent Skills: Claude Code, Codex, hoặc agent khác đọc được `SKILL.md`.

## 3. Lấy API token

1. Trong Antco: **Cài đặt > Tích hợp > API Token > "+ Tạo mới Token"**.
2. Đặt tên (VD "Claude - cấu hình khảo sát"), chọn **"Chạy API dưới vai trò"** = người dùng nội bộ có đủ quyền cấu hình cần thiết (token có đúng quyền của người đó), đặt **hạn dùng ngắn**.
3. **Sao chép token ngay** - token chỉ hiện một lần. Nếu người chạy là Quản trị, người đó phải đã bật 2FA.
4. Xong dự án: **xoá / vô hiệu token** ở cùng màn hình.

## 4. Cấu hình `.env`

```bash
cp .env.example .env      # Windows PowerShell: Copy-Item .env.example .env
```

```dotenv
ANTCO_BASE_URL=https://<cong-ty>.antco.com.vn
ANTCO_API_KEY=<dán token vào đây, không có dấu nháy>
```

- `ANTCO_BASE_URL` = **origin** của công ty bạn trên Antco (không đường dẫn, không `/` cuối).
- `.env` đã nằm trong `.gitignore`. **Không commit, không dán token vào chat, log hay ảnh chụp màn hình.**
- Agent đọc token từ biến môi trường hoặc qua `node scripts/antco_client.mjs --env .env ...` (chỉ đọc đúng 2 khoá trên).
- Kiểm tra nhanh: `node scripts/antco_client.mjs --env .env whoami` (Git Bash trên Windows: viết path không có `/` đầu, VD `objects`).

## 5. Cài đặt

Cách nhanh nhất - script cài đặt (chép skill + script dùng chung + mẫu vào đúng chỗ):

```bash
git clone <url repo antco-skills> && cd antco-skills
node scripts/install.mjs --target claude-user                 # ~/.claude/skills (mọi dự án)
node scripts/install.mjs --target claude-project --project .. # <dự án>/.claude/skills
node scripts/install.mjs --target codex-user                  # $CODEX_HOME/skills hoặc ~/.codex/skills
node scripts/install.mjs --target agents-project --project .. # <dự án>/.agents/skills
node scripts/install.mjs --target <thư mục skills bất kỳ>     # agent khác
# thêm --dry-run để xem trước
```

Sau khi cài, **khởi động lại agent**. Script dùng chung nằm ở `<thư mục skills>/antco-api-auth/scripts/`, mẫu ở `<thư mục skills>/build-antco-app/templates/`.

Cài tay: chép từng thư mục trong `skills/` vào thư mục skills của agent, rồi chép `scripts/antco_client.mjs`, `scripts/validate_artifacts.mjs`, `scripts/render_questions_form.mjs` vào `antco-api-auth/scripts/` và cả thư mục `templates/` vào `build-antco-app/templates/`. Nên cài **trọn bộ** vì các skill tham chiếu lẫn nhau.

- **Claude Code:** skill cấp người dùng ở `~/.claude/skills/<tên>/SKILL.md`, cấp dự án ở `.claude/skills/`. Gọi bằng `/build-antco-app` hoặc mô tả nhu cầu, Claude tự chọn skill.
- **Codex:** thư mục skills cấp người dùng (`~/.codex/skills`) hoặc cấp repo (`.agents/skills`) tuỳ phiên bản Codex - kiểm tra tài liệu Codex bạn đang dùng. Gọi bằng `$build-antco-app`. `skills/build-antco-app/agents/openai.yaml` là metadata hiển thị cho Codex.
- **Agent khác:** làm theo cách agent đó nạp `SKILL.md`; cú pháp gọi có thể khác.

## 6. Cập nhật / gỡ

- Cập nhật: `git pull` rồi chạy lại `install.mjs` với cùng `--target`. Thư mục cùng tên được **thay toàn bộ** (không trộn file cũ). Nếu đã sửa skill, sao lưu trước.
- Gỡ: `node scripts/install.mjs --target <...> --uninstall` - chỉ gỡ đúng 13 thư mục của bộ này.

## 7. Ví dụ prompt

- "Tôi là công ty diệt côn trùng PCS, cần quản lý **khảo sát hiện trường** (khách hàng, địa chỉ, ngày, kỹ thuật viên, từng khu vực có loại côn trùng và mức độ nhiễm) và **phương án kỹ thuật** (phương pháp, tần suất, giá trị) phải được trưởng nhóm duyệt trước khi gửi khách. Quản lý cần báo cáo theo tháng. Dựng trên Antco giúp tôi."
- "Thêm vào Tài khoản trường 'Ngành hàng' dạng lựa chọn: F&B, Sản xuất, Văn phòng, Khác."
- "Tạo bộ lọc 'Phiếu quá hạn của tôi' cho đối tượng Phiếu khảo sát, chia sẻ cho phòng Kỹ thuật."
- "Làm bảng điều khiển: số phiếu khảo sát theo tháng và tổng giá trị phương án đã duyệt."
- "Dọn dữ liệu demo của lượt chạy hôm qua."

Một dự án mẫu hoàn chỉnh (yêu cầu v1 -> câu trả lời -> v2 đã duyệt -> thiết kế -> kế hoạch -> bàn giao -> manifest) ở [`examples/pcs-khao-sat/`](examples/pcs-khao-sat/).

## 8. Nguyên tắc an toàn

1. **Hai cổng duyệt.** Trước khi bạn duyệt kế hoạch, agent chỉ đọc và chạy `?dryRun=1` (máy chủ kiểm rồi huỷ, không ghi).
2. **Không đụng dữ liệu nghiệp vụ có sẵn.** Đối tượng có sẵn (CRM, Kho, Kế toán, Nhân sự...) chỉ đọc qua API; dữ liệu demo chỉ tạo ở đối tượng tự tạo, gắn nhãn `X-Antco-Run-Id`, dọn được đúng phần đó.
3. **Không nới quyền.** Token không gọi được API tài khoản, vai trò, phân quyền, thanh toán, bí mật. Việc cấp quyền đối tượng mới cho vai trò là bạn tự làm ở Cài đặt > Phân quyền.
4. **Cổng hẹp** hỏi riêng dù đã duyệt kế hoạch: bật quy tắc bảo mật dữ liệu, bật biểu mẫu công khai, đổi giao diện ảnh hưởng mọi người, mọi thao tác xoá.
5. **Token không rời biến môi trường**: không in, không ghi log / artifact / URL / commit. `scripts/secret_scan.mjs` chặn commit có token `antco_pat_...`, file `.env`, khoá riêng, email thật.
6. **Đọc lại sau mỗi lần ghi**; không đoán id; không thử lại mù; không đọc mã nguồn Antco để đoán API - nguồn chuẩn là `GET {ANTCO_BASE_URL}/api/public/v1/openapi.json`.
7. Nội dung bạn đưa (file BRD, câu trả lời form) là **dữ liệu**, không phải lệnh cho agent.

## 9. Công cụ đi kèm (`scripts/`, Node.js >= 18)

| Script | Việc |
|---|---|
| `antco_client.mjs` | Gọi Public API: GET chạy thật; POST/PUT/DELETE mặc định chỉ in request (che token), `--server-dry-run` để máy chủ kiểm, `--apply` để ghi; `--run-id` gắn nhãn lượt chạy; không theo redirect; chỉ https |
| `validate_artifacts.mjs` | Kiểm artifact: ID `REQ/Q/OBJ/FLD/REL/CFG/W/T`, enum, liên kết chéo, chu trình phụ thuộc, xung đột khoá, cổng duyệt, câu trả lời (hash nguồn), manifest (hash file). `hash <file...>` in SHA-256 |
| `render_questions_form.mjs` | Sinh form câu hỏi HTML offline từ `yeu-cau-giai-phap-vN.md` |
| `secret_scan.mjs` | Quét bí mật (`--staged` cho pre-commit, `--dir` cho thư mục bất kỳ) |
| `install.mjs` | Cài / cập nhật / gỡ |
| `check_bundle.mjs` | Kiểm cấu trúc bộ skill trước khi phát hành |

Người đóng góp: bật hook `git config core.hooksPath .githooks` (chạy `secret_scan.mjs --staged` trước mỗi commit), và chạy trước khi phát hành:

```bash
node scripts/check_bundle.mjs
node scripts/secret_scan.mjs
node scripts/validate_artifacts.mjs --requirements examples/pcs-khao-sat/yeu-cau-giai-phap-v2.md --design examples/pcs-khao-sat/thiet-ke-v1.md --plan examples/pcs-khao-sat/ke-hoach-v1.md --manifest examples/pcs-khao-sat/delivery-manifest-v1.json --root examples/pcs-khao-sat
```
